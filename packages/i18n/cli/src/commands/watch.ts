import { Command, command, param } from 'clime';
import { API, Diagnostic, UpdateAction } from '../model/API';
import { groupBy, toObject } from '../utils/other';
import { createProgram } from '../typescript/createProgram';
import { Scopes } from '../model/Scopes';
import { Server } from '../server';
import { scopeType } from '../shared';
import { build } from '@format-editor/frontend/scripts/build';

@command({ description: 'Watch mode' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const { distDir } = await build();

		//const prog = createProgram(projectRootPath);
		const scopes = new Scopes(projectRootPath);

		const server = new Server(null!, distDir, {
			setFormat: async (scopeName, lang, formatId, format) => {
				const s = scopes.getScope(scopeName);
				if (!s) {
					throw new Error();
				}
				const pkg = s.getLocalizedFormatPackage(lang);
				if (!pkg) {
					throw new Error();
				}

				const formats = pkg.getFormats();
				const formatsById = toObject(formats, f => f.id);
				formatsById[formatId] = { id: formatId, format };
				pkg.setFormats(Object.values(formatsById));
			},
		});

		const scopesData = scopes.getScopes().map(s => {
			const packages = s.getLocalizedFormatPackages();
			const data: typeof scopeType['_A'] = {
				defaultLang: s.defaultLang,
				name: s.name,
				packages: packages.map(p => {
					const data: (typeof scopeType['_A'])['packages'][0] = {
						lang: p.lang,
						formats: p.getFormats(),
					};
					return data;
				}),
			};
			return data;
		});

		server.publishData(scopesData);
	}
}
