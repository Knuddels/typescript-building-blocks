import { readFileSync, writeFileSync } from 'fs';
import * as micromatch from 'micromatch';
import * as fg from 'fast-glob';
import { join, dirname, resolve } from 'path';

export class Scopes {
	constructor(public readonly dir: string) {}

	getScopes(): Scope[] {
		const matches = fg.sync('./**/formats-scope.json', {
			cwd: this.dir,
			ignore: ['**/node_modules/**'],
		});

		return matches.map(m => {
			return new Scope(join(this.dir, m));
		});
	}

	getScope(name: string): Scope | undefined {
		return this.getScopes().find(s => s.name === name);
	}
}

interface ScopeDoc {
	scopeName: string;
	files: string[];
	defaultLang: string;
}

export class Scope {
	private readonly doc: ScopeDoc;
	public readonly defaultLang: string;
	public readonly name: string;

	constructor(public readonly filePath: string) {
		const content = readFileSync(this.filePath, { encoding: 'utf8' });
		this.doc = JSON.parse(content) as ScopeDoc;
		this.defaultLang = this.doc.defaultLang;
		this.name = this.doc.scopeName;
	}

	public getLocalizedFormatPackages(): LocalizedFormatPackage[] {
		const dir = dirname(this.filePath);
		const matches = fg.sync('formats.*.json', {
			cwd: dir,
		});

		return matches.map(m => {
			return new LocalizedFormatPackage(join(dir, m), this);
		});
	}

	public getLocalizedFormatPackage(
		lang: string
	): LocalizedFormatPackage | undefined {
		return this.getLocalizedFormatPackages().find(p => p.lang === lang);
	}

	public containsSourceFile(fileName: string): boolean {
		const absolutePatterns = this.doc.files.map(f =>
			resolve(dirname(this.filePath), f).replace(/\\/g, '/')
		);
		return micromatch.every(fileName.replace(/\\/g, '/'), absolutePatterns);
	}
}

export interface Format {
	id: string;
	format: string | null;
}

interface LocalizedFormatPackageDoc {
	lang: string;
	formats: Record<string, string | null>;
}

export class LocalizedFormatPackage {
	private doc: LocalizedFormatPackageDoc | undefined;

	constructor(
		public readonly filePath: string,
		public readonly scope: Scope
	) {}

	private getDoc(): LocalizedFormatPackageDoc {
		if (!this.doc) {
			const content = readFileSync(this.filePath, { encoding: 'utf8' });
			this.doc = JSON.parse(content) as LocalizedFormatPackageDoc;
		}
		return this.doc;
	}

	private writeDoc(): void {
		const str = JSON.stringify(this.doc, undefined, 4);
		writeFileSync(this.filePath, str, { encoding: 'utf8' });
	}

	get lang(): string {
		return this.getDoc().lang;
	}

	getFormats(): Format[] {
		return Object.entries(this.getDoc().formats).map(([id, format]) => ({
			id,
			format,
		}));
	}

	setFormats(formats: Format[]): void {
		const sorted = formats.slice().sort((a, b) => a.id.localeCompare(b.id));
		const formatsObj: Record<string, string | null> = {};
		for (const s of sorted) {
			formatsObj[s.id] = s.format;
		}

		this.doc = undefined;
		const d = this.getDoc();
		d.formats = formatsObj;
		this.writeDoc();
	}
}
