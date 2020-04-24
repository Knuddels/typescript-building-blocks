import { readFileSync, writeFileSync } from 'fs';
import * as micromatch from 'micromatch';
import * as fg from 'fast-glob';
import { join, dirname, resolve } from 'path';
import * as chokidar from 'chokidar';
import { computed, observable, autorun, action, ObservableMap } from 'mobx';
import { Disposable } from '@hediet/std/disposable';

export class Scopes {
	public readonly dir: string;
	public readonly watch: boolean;

	private readonly _scopes = new ObservableMap<string, Scope>();

	constructor(options: { dir: string; watch?: boolean }) {
		this.dir = options.dir;
		this.watch = !!options.watch;

		if (this.watch) {
			const w = chokidar.watch('./**/formats-scope.json', {
				cwd: this.dir,
				ignored: ['**/node_modules/**'],
			});

			w.on('add', path => {
				this._scopes.set(
					path,
					new Scope(join(this.dir, path), this.watch)
				);
			});
			w.on('change', path => {
				const scope = this._scopes.get(path);
				if (!scope) {
					return;
				}
				scope.reload();
			});
			w.on('unlink', path => {
				this._scopes.delete(path);
			});
		} else {
			const matches = fg.sync('./**/formats-scope.json', {
				cwd: this.dir,
				ignore: ['**/node_modules/**'],
			});
			for (const m of matches) {
				this._scopes.set(m, new Scope(join(this.dir, m), this.watch));
			}
		}
	}

	/**
	 * Prefers scope with heigher priority if the file matches multiple scopes.
	 */
	findScopeForSourceFile(fileName: string): Scope | undefined {
		for (const s of this.scopes) {
			if (s.containsSourceFile(fileName)) {
				return s;
			}
		}
		return undefined;
	}

	/**
	 * The scopes sorted by their scope priority.
	 */
	@computed
	get scopes(): Scope[] {
		return [...this._scopes.values()].sort(
			(a, b) => b.scopePriority - a.scopePriority
		);
	}

	getScope(name: string): Scope | undefined {
		return this.scopes.find(s => s.name === name);
	}
}

interface ScopeDoc {
	scopeName: string;
	files: string[];
	defaultLang: string;
	scopePriority: number | undefined;
}

export class Scope {
	@observable
	private docContent!: string;

	@computed
	private get doc(): ScopeDoc {
		return JSON.parse(this.docContent) as ScopeDoc;
	}

	public get defaultLang(): string {
		return this.doc.defaultLang;
	}
	public get name(): string {
		return this.doc.scopeName;
	}

	public get scopePriority(): number {
		return this.doc.scopePriority || 0;
	}

	constructor(
		public readonly filePath: string,
		private readonly watch: boolean
	) {
		this.reload();

		autorun(() => {
			this.localizedFormatPackages;
		});
	}

	public reload(): void {
		this.docContent = readFileSync(this.filePath, { encoding: 'utf8' });
	}

	@computed
	public get localizedFormatPackages(): LocalizedFormatPackage[] {
		const dir = dirname(this.filePath);
		const matches = fg.sync('formats.*.json', {
			cwd: dir,
		});

		return matches.map(m => {
			// TODO dispose
			return new LocalizedFormatPackage(join(dir, m), this, this.watch);
		});
	}

	public getLocalizedFormatPackage(
		lang: string
	): LocalizedFormatPackage | undefined {
		return this.localizedFormatPackages.find(p => p.lang === lang);
	}

	public containsSourceFile(fileName: string): boolean {
		const absolutePatterns = this.doc.files.map(f =>
			resolve(dirname(this.filePath), f).replace(/\\/g, '/')
		);
		return micromatch.any(fileName.replace(/\\/g, '/'), absolutePatterns);
	}
}

export interface Format {
	id: string;
	format: string | null;
}

export interface PackageFormat extends Format {
	package: LocalizedFormatPackage;
}

interface LocalizedFormatPackageDoc {
	lang: string;
	formats: Record<string, string | null>;
}

export class LocalizedFormatPackage {
	@observable
	private docContent!: string;

	@computed
	private get doc(): LocalizedFormatPackageDoc {
		return JSON.parse(this.docContent) as LocalizedFormatPackageDoc;
	}

	public readonly dispose = Disposable.fn();

	constructor(
		public readonly filePath: string,
		public readonly scope: Scope,
		watch: boolean
	) {
		if (watch) {
			const watcher = chokidar.watch(filePath);
			this.dispose.track({ dispose: () => watcher.close() });
			watcher.on('change', () => {
				this.refreshDoc();
			});
		}
		this.refreshDoc();
		autorun(() => {
			this.doc;
		});
	}

	@action
	private refreshDoc(): void {
		const content = readFileSync(this.filePath, { encoding: 'utf8' });
		if (content !== this.docContent) {
			this.docContent = content;
		}
	}

	@action
	private write(doc: LocalizedFormatPackageDoc): void {
		const newDocContent = JSON.stringify(doc, undefined, 4);
		this.docContent = newDocContent;
		writeFileSync(this.filePath, newDocContent, { encoding: 'utf8' });
	}

	get lang(): string {
		return this.doc.lang;
	}

	get formats(): ReadonlyArray<PackageFormat> {
		return Object.entries(this.doc.formats).map(([id, format]) => ({
			id,
			format,
			package: this,
		}));
	}

	@action
	setFormats(formats: ReadonlyArray<Format>): void {
		const sorted = formats.slice().sort((a, b) => a.id.localeCompare(b.id));
		const formatsObj: Record<string, string | null> = {};
		for (const s of sorted) {
			formatsObj[s.id] = s.format;
		}

		const doc = this.doc;
		doc.formats = formatsObj;
		this.write(doc);
	}
}
