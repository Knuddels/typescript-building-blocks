import { Scopes } from './Scopes';

import { findTsConfigFile } from '../typescript/findTsConfigFile';

import { TypeScriptWatchCompiler } from '../typescript/TypeScriptWatchCompiler';

import { FormatDeclarationProvider, DiagnosticProvider } from '.';
import { createProgram } from '../typescript/createProgram';

export class API {
	public get projectRootPath(): string {
		return this.options.projectRootPath;
	}
	private get watch(): boolean {
		return !!this.options.watch;
	}

	constructor(
		private readonly options: { projectRootPath: string; watch?: boolean }
	) {}

	public readonly scopes = new Scopes({
		dir: this.projectRootPath,
		watch: this.watch,
	});
	public readonly tsConfigFile = findTsConfigFile(this.projectRootPath);
	public readonly programProvider = this.watch
		? new TypeScriptWatchCompiler(this.tsConfigFile)
		: { program: createProgram(this.tsConfigFile) };
	public readonly formatDeclarationProvider = new FormatDeclarationProvider({
		get: () => this.programProvider.program,
	});
	public readonly diagnosticProvider = new DiagnosticProvider(
		{ get: () => this.formatDeclarationProvider.formatDeclarations },
		this.scopes
	);
}
