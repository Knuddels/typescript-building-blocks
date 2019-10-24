import * as ts from 'typescript';
import { observable } from 'mobx';

const formatHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: path => path,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

export class TypeScriptWatchCompiler {
	constructor(tsConfigPath: string) {
		const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

		const host = ts.createWatchCompilerHost(
			tsConfigPath,
			{ noEmit: true },
			ts.sys,
			createProgram,
			(...args) => this.reportDiagnostic(...args),
			(...args) => this.reportWatchStatusChanged(args[0])
		);

		const origCreateProgram = host.createProgram;
		host.createProgram = (
			rootNames: ReadonlyArray<string> | undefined,
			options,
			host,
			oldProgram
		) => {
			return origCreateProgram(rootNames, options, host, oldProgram);
		};
		const origPostProgramCreate = host.afterProgramCreate;

		host.afterProgramCreate = program => {
			this.handleAfterProgramCreate(program);
			origPostProgramCreate!(program);
		};

		const w = ts.createWatchProgram(host);
		this._program = w.getProgram().getProgram();
	}

	@observable
	private _program: ts.Program;
	public get program(): ts.Program {
		return this._program;
	}

	private handleAfterProgramCreate(
		program: ts.SemanticDiagnosticsBuilderProgram
	) {
		this._program = program.getProgram();
	}

	private reportDiagnostic(diagnostic: ts.Diagnostic) {
		console.error(
			'Error',
			diagnostic.code,
			':',
			ts.flattenDiagnosticMessageText(
				diagnostic.messageText,
				formatHost.getNewLine()
			)
		);
	}

	/**
	 * Prints a diagnostic every time the watch status changes.
	 * This is mainly for messages like "Starting compilation" or "Compilation completed".
	 */
	private reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
		if (diagnostic.file) {
			console.info(diagnostic.file);
		}
		console.info(ts.formatDiagnostic(diagnostic, formatHost));
	}
}
