import {
	Scopes,
	LocalizedFormatPackage,
	Format,
	PackageFormat,
} from '../model/Scopes';
import { FormatDeclaration } from '../model/FormatDeclarationProvider';
import { diffObjectsKeys } from '../utils/diffObjectsKeys';
import { groupBy, toObject } from '../utils/other';
import { computed } from 'mobx';
import { Provider } from './Provider';

export type Diagnostic =
	| {
			kind: 'missingFormat';
			package: LocalizedFormatPackage;
			declaration: FormatDeclaration;
	  }
	| {
			kind: 'emptyFormat';
			format: PackageFormat;
	  }
	| {
			kind: 'unknownFormat';
			format: PackageFormat;
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
			format: PackageFormat;
			declaration: FormatDeclaration;
	  }
	| {
			kind: 'missingDefaultFormat';
			format: PackageFormat;
			declaration: FormatDeclaration;
	  };

export class DiagnosticProvider {
	constructor(
		private readonly formatDeclarationProvider: Provider<
			FormatDeclaration[]
		>,
		private readonly scopes: Scopes
	) {}

	@computed
	get diagnostics(): Diagnostic[] {
		return this._getDiagnostics(
			this.scopes,
			this.formatDeclarationProvider.get()
		);
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

		const groups = groupBy(formatDeclarations, (d) => d.id);
		for (const values of groups.values()) {
			if (values.length > 1) {
				log({
					kind: 'duplicateFormatDeclaration',
					conflictingDeclarations: values,
				});
			}
		}

		const declsByScope = groupBy(formatDeclarations, (d) =>
			scopes.findScopeForSourceFile(d.fileName)
		);

		for (const [scope, declsInScope] of declsByScope.entries()) {
			if (!scope) {
				// TODO log error, declaration has no scope.
				continue;
			}

			for (const d of declsInScope) {
				processedDecls.add(d);
			}
			const declsInScopeById = toObject(declsInScope, (d) => d.id);

			for (const pkg of scope.localizedFormatPackages) {
				const isDefaultPkg = pkg.lang === scope.defaultLang;
				const formats = pkg.formats;
				const formatsById = toObject(formats, (f) => f.id);
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
						});
					} else {
						if (diff.val1.format === null) {
							log({
								kind: 'emptyFormat',
								format: diff.val1,
							});
						} else if (isDefaultPkg) {
							if (diff.val2.defaultFormat === null) {
								log({
									kind: 'missingDefaultFormat',
									format: diff.val1,
									declaration: diff.val2,
								});
							} else if (
								diff.val1.format !== diff.val2.defaultFormat
							) {
								log({
									kind: 'diffingDefaultFormats',
									format: diff.val1,
									declaration: diff.val2,
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
