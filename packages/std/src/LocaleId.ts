import { BugIndicatingError } from './errors';

export class LocaleId {
	public static enUS = new LocaleId('en', 'us');
	public static deDE = new LocaleId('de', 'de');

	public static fromLocaleCode(code: string): LocaleId | undefined {
		const match = code.match(/([a-zA-Z]+)([-_]([a-zA-Z]+))?/);
		if (!match) {
			return undefined;
		}
		const language = match[1].toLowerCase();
		let country = match[3];
		if (country) {
			country = country.toLowerCase();
		}
		return new LocaleId(language, country);
	}

	constructor(
		public readonly language: string,
		public readonly country?: string
	) {
		if (language !== language.toLowerCase()) {
			throw new BugIndicatingError(
				`language must be lowercase, but was "${language}".`
			);
		}
		if (country && country !== country.toLowerCase()) {
			throw new BugIndicatingError(
				`country must be lowercase, but was "${country}".`
			);
		}
	}

	public getLocaleCode(): string {
		if (this.country) {
			return `${this.language}-${this.country.toUpperCase()}`;
		}
		return this.language;
	}

	public toString(): string {
		return this.getLocaleCode();
	}
}
