/// <reference path="./types.d.ts" />

import * as fh from 'folder-hash';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const r = (file: string) => resolve(__dirname, '../', file);

export async function build(): Promise<{ distDir: string }> {
	const srcHash = await fh.hashElement(r('./src'));
	const pkgHash = await fh.hashElement(r('./package.json'));
	const hash = {
		srcHash,
		pkgHash,
	};

	const hashStr = JSON.stringify(hash);
	let existingHash: string = '';
	const fileName = r('./dist/file-cache.json');
	if (existsSync(fileName)) {
		const content = readFileSync(fileName, { encoding: 'utf8' });
		existingHash = content;
	}

	if (existingHash !== hashStr) {
		// rebuild
		execSync('yarn rebuild', { cwd: r('.'), stdio: 'inherit' });
		writeFileSync(fileName, hashStr);
	}

	return { distDir: r('./dist') };
}
