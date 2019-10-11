import { Command, command, param } from 'clime';
import { Scopes } from '../model/Scopes';

@command({ description: 'Sorts all formats' })
export default class extends Command {
	async execute(
		@param({ description: 'Project root path', required: true })
		projectRootPath: string
	) {
		const scopes = new Scopes(projectRootPath);
		for (const s of scopes.getScopes()) {
			for (const p of s.getLocalizedFormatPackages()) {
				const f = p.getFormats();
				p.setFormats(f);
			}
		}
	}
}
