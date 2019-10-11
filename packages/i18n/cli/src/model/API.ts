import { resolve } from 'path';
import { Scopes, LocalizedFormatPackage, Format } from '../model/Scopes';
import { createProgram } from '../typescript/createProgram';
import {
	getAllDeclaredFormats,
	FormatDeclaration,
} from '../model/FormatDeclarationProvider';
import { diffObjectsKeys } from '../utils/diffObjectsKeys';
import { hotClass, registerUpdateReconciler } from '@hediet/node-reload';
import { groupBy, toObject } from '../utils/other';
import { FileEditor } from './FileEditor';
import * as ts from 'typescript';

registerUpdateReconciler(module);

export type Diagnostic =
	| {
			kind: 'missingFormat';
			package: LocalizedFormatPackage;
			declaration: FormatDeclaration;
	  }
	| {
			kind: 'emptyFormat';
			package: LocalizedFormatPackage;
			format: Format;
	  }
	| {
			kind: 'unknownFormat';
			package: LocalizedFormatPackage;
			format: Format;
	  }
	| {
			kind: 'formatDeclarationWithoutScope';
			declaration: FormatDeclaration;
	  }
	| {
			kind: 'duplicateFormatDeclaration';
			conflictingDeclarations: FormatDeclaration[];
	  }
	| {
			kind: 'diffingDefaultFormats';
			package: LocalizedFormatPackage;
			format: Format;
			declaration: FormatDeclaration;
	  }
	| {
			kind: 'missingDefaultFormat';
			package: LocalizedFormatPackage;
			format: Format;
			declaration: FormatDeclaration;
	  };

export type UpdateAction =
	| {
			kind: 'RemoveUnknownFormat';
			format: Format;
			package: LocalizedFormatPackage;
	  }
	| {
			kind: 'AddDeclaredFormat';
			declaration: FormatDeclaration;
			format: Format;
			package: LocalizedFormatPackage;
	  }
	| {
			kind: 'UpdateFormatWithDeclaredDefaultFormat';
			declaration: FormatDeclaration;
			oldFormat: Format;
			newFormat: Format;
			package: LocalizedFormatPackage;
	  };

@hotClass(module)
export class API {
	public getDiagnostics(projectRootPath: string) {
		const path = resolve(projectRootPath);
		const prog = createProgram(projectRootPath);
		const formatDeclarations = getAllDeclaredFormats(prog);
		const scopes = new Scopes(path);

		const diags = this._getDiagnostics(scopes, formatDeclarations);
		return diags;
	}

	public fixDiagnostics(
		diags: Diagnostic[],
		log: (action: UpdateAction) => void
	) {
		const editor = new FileEditor();
		const diagsByPkg = groupBy(diags, d =>
			'package' in d ? d.package : null
		);
		for (const [pkg, diags] of diagsByPkg) {
			if (pkg && diags.length > 0) {
				const formats = toObject(pkg.getFormats(), f => f.id);

				for (const d of diags) {
					this.fixDiagnostic(d, pkg, formats, log, editor);
				}

				pkg.setFormats(Object.values(formats));
			}
		}
		editor.applyEdits();
		editor.writeChanges();
	}

	private fixDiagnostic(
		d: Diagnostic,
		pkg: LocalizedFormatPackage,
		formats: Record<string, Format>,
		log: (action: UpdateAction) => void,
		editor: FileEditor
	) {
		if (d.kind === 'diffingDefaultFormats') {
			const format = formats[d.declaration.id];
			const oldFormat: Format = {
				id: d.declaration.id,
				format: format.format,
			};

			/*
            const node = d.declaration.node as ts.CallExpression;
			const firstArg = node.arguments[0];
			const f = editor.openFile(node.getSourceFile().fileName);
			f.replace(
				firstArg.getStart(),
				firstArg.getEnd(),
				`{ id: ${JSON.stringify(
					d.declaration.id
				)}, defaultFormat: ${JSON.stringify(d.format.format)} }`
            );*/

			formats[d.declaration.id].format = d.declaration.defaultFormat!;
			log({
				kind: 'UpdateFormatWithDeclaredDefaultFormat',
				declaration: d.declaration,
				oldFormat: oldFormat,
				newFormat: format,
				package: d.package,
			});
		} else if (d.kind === 'missingDefaultFormat') {
			const node = d.declaration.node as ts.CallExpression;
			const firstArg = node.arguments[0];
			const f = editor.openFile(node.getSourceFile().fileName);
			f.replace(
				firstArg.getStart(),
				firstArg.getEnd(),
				`{ id: ${JSON.stringify(
					d.declaration.id
				)}, defaultFormat: ${JSON.stringify(d.format.format)} }`
			);
		} else if (d.kind === 'missingFormat') {
			const format =
				pkg.lang === pkg.scope.defaultLang
					? d.declaration.defaultFormat
					: null;
			formats[d.declaration.id] = {
				id: d.declaration.id,
				format: format !== undefined ? format : null,
			};
			log({
				kind: 'AddDeclaredFormat',
				declaration: d.declaration,
				format: formats[d.declaration.id],
				package: d.package,
			});
		} else if (d.kind === 'unknownFormat') {
			log({
				kind: 'RemoveUnknownFormat',
				format: d.format,
				package: d.package,
			});
			delete formats[d.format.id];
		}
	}

	private _getDiagnostics(
		scopes: Scopes,
		formatDeclarations: FormatDeclaration[]
	): Diagnostic[] {
		const processedDecls = new Set<FormatDeclaration>();

		const diagnostics = new Array<Diagnostic>();
		function log(diag: Diagnostic) {
			diagnostics.push(diag);
		}

		const groups = groupBy(formatDeclarations, d => d.id);
		for (const values of groups.values()) {
			if (values.length > 1) {
				log({
					kind: 'duplicateFormatDeclaration',
					conflictingDeclarations: values,
				});
			}
		}

		for (const scope of scopes.getScopes()) {
			const declsInScope = formatDeclarations.filter(d =>
				scope.containsSourceFile(d.fileName)
			);
			for (const d of declsInScope) {
				processedDecls.add(d);
			}
			const declsInScopeById = toObject(declsInScope, d => d.id);

			for (const pkg of scope.getLocalizedFormatPackages()) {
				const isDefaultPkg = pkg.lang === scope.defaultLang;
				const formats = pkg.getFormats();
				const formatsById = toObject(formats, f => f.id);
				const diffs = diffObjectsKeys(formatsById, declsInScopeById);

				for (const diff of diffs) {
					if (!diff.val1) {
						log({
							kind: 'missingFormat',
							declaration: diff.val2,
							package: pkg,
						});
					} else if (!diff.val2) {
						log({
							kind: 'unknownFormat',
							format: diff.val1,
							package: pkg,
						});
					} else {
						if (diff.val1.format === null) {
							log({
								kind: 'emptyFormat',
								format: diff.val1,
								package: pkg,
							});
						} else if (isDefaultPkg) {
							if (!diff.val2.defaultFormat) {
								log({
									kind: 'missingDefaultFormat',
									format: diff.val1,
									declaration: diff.val2,
									package: pkg,
								});
							} else if (
								diff.val1.format !== diff.val2.defaultFormat
							) {
								log({
									kind: 'diffingDefaultFormats',
									format: diff.val1,
									declaration: diff.val2,
									package: pkg,
								});
							}
						}
					}
				}
			}
		}
		return diagnostics;
	}
}
