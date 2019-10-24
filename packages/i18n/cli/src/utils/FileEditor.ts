import { readFileSync, writeFileSync } from 'fs';

export class FileEditor {
	private managedFiles = new Map<string, File>();

	public openFile(filename: string): File {
		let f = this.managedFiles.get(filename);
		if (!f) {
			const content = readFileSync(filename, { encoding: 'utf8' });
			f = new File(content, filename);
			this.managedFiles.set(filename, f);
		}
		return f;
	}

	public applyEdits(): void {
		for (const f of this.managedFiles.values()) {
			f.applyEdits();
		}
	}

	public writeChanges(): void {
		for (const f of this.managedFiles.values()) {
			f.writeChanges();
		}
	}
}

interface Edit {
	start: number;
	end: number;
	newText: string;
}

export class File {
	constructor(private content: string, public readonly filename: string) {}

	getContent(): string {
		return this.content;
	}

	private readonly edits = new Array<Edit>();

	replace(start: number, end: number, newText: string): void {
		this.edits.push({ start, end, newText });
	}

	public applyEdits() {
		this.edits.sort((a, b) => b.start - a.start);
		let content = this.content;
		for (const e of this.edits) {
			const start = content.substring(0, e.start);
			const end = content.substring(e.end);
			content = start + e.newText + end;
		}
		this.content = content;
	}

	public writeChanges(): void {
		writeFileSync(this.filename, this.content);
	}
}
