import { Command, command, param } from 'clime';
import { API, Diagnostic, UpdateAction } from '../model/API';
import { groupBy } from '../utils/other';

@command({ description: 'Updates all formats' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const api = new API();
		const diags = api.getDiagnostics(projectRootPath);
		api.fixDiagnostics(diags, action => {
			console.log(actionToString(action));
		});
	}
}

function actionToString(action: UpdateAction): string {
	const prefix = `${action.package.scope.name}.${action.package.lang}: `;
	switch (action.kind) {
		case 'AddDeclaredFormat':
			return `${prefix}Add declared format id "${
				action.declaration.id
			}": "${action.format.format}".`;
		case 'RemoveUnknownFormat':
			return `${prefix}Remove unused format "${action.format.id}": "${
				action.format.format
			}".`;
		case 'UpdateFormatWithDeclaredDefaultFormat':
			return `${prefix}Update format "${action.declaration.id}": "${
				action.oldFormat.format
			}" with declared default format "${action.newFormat.format}".`;
	}
}
