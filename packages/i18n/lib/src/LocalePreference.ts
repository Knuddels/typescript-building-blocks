import { LocaleId } from '@knuddels/std';

export class LocalePreference {
	constructor(
		public readonly localeId: LocaleId,
		public readonly fallback: LocaleId
	) {
		if (this.localeId.isCountryInvariant) {
			this.preferredLocales = [this.localeId, this.fallback];
		} else {
			this.preferredLocales = [
				this.localeId,
				this.localeId.getCountryInvariantLocale(),
				this.fallback,
			];
		}
	}

	public readonly preferredLocales: ReadonlyArray<LocaleId>;
}
