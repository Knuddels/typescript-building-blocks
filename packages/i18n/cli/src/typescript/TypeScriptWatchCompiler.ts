import * as ts from 'typescript';

const formatHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: path => path,
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

export class TypeScriptWatchCompiler {
	constructor(tsConfigSearchPath: string) {
		const configPath = ts.findConfigFile(
			tsConfigSearchPath,
			ts.sys.fileExists,
			'tsconfig.json'
		);
		if (!configPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}

		const createProgram = ts.createSemanticDiagnosticsBuilderProgram;

		const host = ts.createWatchCompilerHost(
			configPath,
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

		ts.createWatchProgram(host);
	}

	private handleAfterProgramCreate(
		program: ts.SemanticDiagnosticsBuilderProgram
	) {}

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
