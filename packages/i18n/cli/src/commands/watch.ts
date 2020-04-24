import { Command, command, param } from 'clime';
import { toObject, flatMap } from '../utils/other';
import {
	Scopes,
	LocalizedFormatPackage,
	Format,
	PackageFormat,
} from '../model/Scopes';
import { Server } from '../server';
import {
	scopeType,
	DiagnosticData,
	FormatDeclarationData,
	LocalizedFormatPackageId,
	FormatId,
	ActionId,
} from '../shared';
import { build } from '@knuddels/i18n-frontend/scripts/build';
import { FormatDeclaration } from '../model/FormatDeclarationProvider';
import { Diagnostic } from '../model/DiagnosticProvider';
import { autorun } from 'mobx';
import { DiagnosticFixProvider, Action, API } from '../model';

@command({ description: 'Watch mode' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const { distDir } = await build();

		const api = new API({ projectRootPath, watch: true });

		const diagnosticFixProvider = new DiagnosticFixProvider(api.scopes);
		function getFixesWithIdForDiagnostic(
			d: Diagnostic,
			diagnosticIdx: number
		): { id: string; action: Action }[] {
			const actions = diagnosticFixProvider.getFixes(d);
			return actions.map<{ id: string; action: Action }>(
				(a, actionIdx) => ({
					id: `${diagnosticIdx}/${actionIdx}`,
					action: a,
				})
			);
		}

		const server = new Server(null!, distDir, {
			setFormat: async (scopeName, lang, formatId, format) => {
				const s = api.scopes.getScope(scopeName);
				if (!s) {
					throw new Error();
				}
				const pkg = s.getLocalizedFormatPackage(lang);
				if (!pkg) {
					throw new Error();
				}

				const formatsById = toObject<Format, string>(
					pkg.formats,
					f => f.id
				);
				formatsById[formatId] = { id: formatId, format };
				pkg.setFormats(Object.values(formatsById));
			},
			applyActions: async actionIds => {
				const actions = flatMap(
					api.diagnosticProvider.diagnostics,
					(d, idx) => getFixesWithIdForDiagnostic(d, idx)
				);
				const filteredActions = actions
					.filter(a => actionIds.some(id => id.id === a.id))
					.map(a => a.action);
				diagnosticFixProvider.applyActions(filteredActions);
			},
		});

		autorun(() => {
			const diags = api.diagnosticProvider.diagnostics;
			function translateDeclaration(
				decl: FormatDeclaration
			): FormatDeclarationData {
				return {
					formatId: decl.id,
					defaultFormat: decl.defaultFormat,
				};
			}
			function translatePackage(
				pkg: LocalizedFormatPackage
			): LocalizedFormatPackageId {
				return {
					lang: pkg.lang,
					scopeName: pkg.scope.name,
				};
			}
			function translateFormat(format: PackageFormat): FormatId {
				return {
					formatId: format.id,
					lang: format.package.lang,
					scopeName: format.package.scope.name,
					format: format.format,
				};
			}

			function getFixesId(
				d: Diagnostic,
				diagnosticIdx: number
			): ActionId[] {
				return getFixesWithIdForDiagnostic(d, diagnosticIdx).map(a => ({
					id: a.id,
					kind: a.action.kind,
					title: a.action.title,
				}));
			}

			const data = diags.map<DiagnosticData>((d, idx) => {
				switch (d.kind) {
					case 'missingFormat':
						return {
							kind: 'missingFormat',
							declaration: translateDeclaration(d.declaration),
							package: translatePackage(d.package),
							fixes: getFixesId(d, idx),
						};
					case 'emptyFormat':
						return {
							kind: 'emptyFormat',
							format: translateFormat(d.format),
							fixes: getFixesId(d, idx),
						};
					case 'unknownFormat':
						return {
							kind: 'unknownFormat',
							format: translateFormat(d.format),
							fixes: getFixesId(d, idx),
						};
					case 'formatDeclarationWithoutScope':
						return {
							kind: 'formatDeclarationWithoutScope',
							declaration: translateDeclaration(d.declaration),
							fixes: getFixesId(d, idx),
						};
					case 'duplicateFormatDeclaration':
						return {
							kind: 'duplicateFormatDeclaration',
							conflictingDeclarations: d.conflictingDeclarations.map(
								translateDeclaration
							),
							fixes: getFixesId(d, idx),
						};
					case 'diffingDefaultFormats':
						return {
							kind: 'diffingDefaultFormats',
							declaration: translateDeclaration(d.declaration),
							format: translateFormat(d.format),
							fixes: getFixesId(d, idx),
						};
					case 'missingDefaultFormat':
						return {
							kind: 'missingDefaultFormat',
							declaration: translateDeclaration(d.declaration),
							format: translateFormat(d.format),
							fixes: getFixesId(d, idx),
						};
				}
			});
			server.publishDiagnostics(data);
		});

		autorun(() => {
			const scopesData = api.scopes.scopes.map(s => {
				const packages = s.localizedFormatPackages;
				const data: typeof scopeType['_A'] = {
					defaultLang: s.defaultLang,
					name: s.name,
					packages: packages.map(p => {
						const data: (typeof scopeType['_A'])['packages'][0] = {
							lang: p.lang,
							formats: [...p.formats],
						};
						return data;
					}),
				};
				return data;
			});

			server.publishData(scopesData);
		});
	}
}
