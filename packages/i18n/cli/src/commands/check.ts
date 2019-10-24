import { Command, command, param } from 'clime';
import { Diagnostic, API } from '../model';
import { groupBy } from '../utils/other';
import { LocalizedFormatPackage } from '../model/Scopes';

@command({ description: 'Checks all formats' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const api = new API({ projectRootPath });

		const diags = api.diagnosticProvider.diagnostics;

		function getPackage(d: Diagnostic): LocalizedFormatPackage | null {
			return 'package' in d
				? d.package
				: 'format' in d
				? d.format.package
				: null;
		}

		const diagsByScope = groupBy(diags, d => {
			const p = getPackage(d);
			if (!p) {
				return null;
			}
			return p.scope;
		});
		for (const [scope, diags] of diagsByScope) {
			if (!scope) {
				console.log(`Unscoped: `);
				console.log(diags);
			} else {
				console.log(`Scope "${scope.name}": `);
				const diagsByPkg = groupBy(diags, d => getPackage(d));
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
			return `Default format of id "${diag.format.id}" differs from format in default language "${diag.format.package.lang}".\nDefault format: "${diag.declaration.defaultFormat}" (declared in "${diag.declaration.fileName}").\nFormat in default language: ${diag.format.format}.`;
		case 'emptyFormat':
			return `Format for id "${diag.format.id}" is empty.`;
		case 'unknownFormat':
			return `Format id "${diag.format.id}" is not declared in code.`;
		case 'missingFormat':
			return `A format for "${diag.declaration.id}" is missing, but declared in "${diag.declaration.fileName}".`;
	}

	return diag.kind;
}
