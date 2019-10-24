import { Command, command, param } from 'clime';
import { API, DiagnosticFixProvider } from '../model';

@command({ description: 'Updates all formats' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const api = new API({ projectRootPath });
		const diags = api.diagnosticProvider.diagnostics;
		const fixer = new DiagnosticFixProvider();

		const fixes = diags
			.map(d => ({ diag: d, fix: fixer.getFixes(d)[0] }))
			.filter(f => f.fix);

		fixer.applyActions(fixes.map(f => f.fix));
	}
}
/*
function actionToString(action: DiagnosticFix): string {
	const pkg = action.format.package;
	const prefix = `${pkg.scope.name}.${pkg.lang}: `;
	switch (action.kind) {
		case 'AddDeclaredFormat':
			return `${prefix}Add declared format id "${action.declaration.id}": "${action.format.format}".`;
		case 'RemoveUnknownFormat':
			return `${prefix}Remove unused format "${action.format.id}": "${action.format.format}".`;
		case 'UpdateFormatWithDeclaredDefaultFormat':
			return `${prefix}Update format "${action.declaration.id}": "${action.format.format}" with declared default format "${action.newFormat.format}".`;
	}
}*/
