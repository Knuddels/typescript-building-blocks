import { Command, command, param } from 'clime';
import { API, Diagnostic } from '../model/API';
import { groupBy } from '../utils/other';

@command({ description: 'Checks all formats' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const diags = new API().getDiagnostics(projectRootPath);
		const diagsByScope = groupBy(diags, d =>
			'package' in d ? d.package.scope : null
		);
		for (const [scope, diags] of diagsByScope) {
			if (!scope) {
				console.log(`Unscoped: `);
				console.log(diags);
			} else {
				console.log(`Scope "${scope.name}": `);
				const diagsByPkg = groupBy(diags, d =>
					'package' in d ? d.package : null
				);
				for (const [pkg, diags] of diagsByPkg) {
					if (!pkg) {
						console.log(diags);
					} else {
						console.log(`- Package for language "${pkg.lang}": `);
						for (const d of diags) {
							console.error(
								'  * ' +
									diagToString(d).replace(/\n/g, '\n    ')
							);
						}
					}
				}
			}
		}
	}
}

function diagToString(diag: Diagnostic): string {
	switch (diag.kind) {
		case 'diffingDefaultFormats':
			return `Default format of id "${
				diag.format.id
			}" differs from format in default language "${
				diag.package.lang
			}".\nDefault format: "${
				diag.declaration.defaultFormat
			}" (declared in "${
				diag.declaration.fileName
			}").\nFormat in default language: ${diag.format.format}.`;
		case 'emptyFormat':
			return `Format for id "${diag.format.id}" is empty.`;
		case 'unknownFormat':
			return `Format id "${diag.format.id}" is not declared in code.`;
		case 'missingFormat':
			return `A format for "${
				diag.declaration.id
			}" is missing, but declared in "${diag.declaration.fileName}".`;
	}

	return diag.kind;
}
