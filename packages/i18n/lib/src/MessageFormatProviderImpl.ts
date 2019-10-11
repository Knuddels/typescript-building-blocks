import { computed, ObservableSet, action } from 'mobx';
import MessageFormat from 'intl-messageformat';
import { FormatId } from './FormatId';
import {
	MessageFormatProvider,
	LocalizedMessageFormatProvider,
} from './MessageFormatProvider';
import { LocaleId } from '@knuddels/std';

export type Formats = Record<string, string | null>;
export interface FormatBundle {
	formats: Formats;
}
export type FormatBundleProvider = (locale: LocaleId) => FormatBundle;

export class MessageFormatProviderImpl implements MessageFormatProvider {
	private readonly providers = new ObservableSet<FormatBundleProvider>();

	public getLocalizedMessageFormatProvider(
		localeId: LocaleId
	): LocalizedMessageFormatProvider {
		return new LocalizedMessageFormatProviderImpl(localeId, this.providers);
	}

	@action
	public registerFormatProvider(provider: FormatBundleProvider): void {
		this.providers.add(provider);
	}
}

class LocalizedMessageFormatProviderImpl {
	constructor(
		public readonly localeId: LocaleId,
		private readonly providers: Set<FormatBundleProvider>
	) {}

	@computed
	private get formats(): Record<string, MessageFormat> {
		const result: Record<string, MessageFormat> = {};
		for (const p of this.providers) {
			const bundle = p(this.localeId);
			for (const [key, value] of Object.entries(bundle.formats)) {
				result[key] = new MessageFormat(value);
			}
		}
		return result;
	}

	public getMessageFormat(descriptor: FormatId): MessageFormat {
		let f = this.formats[descriptor.id];
		if (!f) {
			if (!descriptor.defaultFormat) {
				return new MessageFormat(descriptor.id);
			}
			f = new MessageFormat(
				descriptor.defaultFormat,
				this.localeId.getLocaleCode()
			);
		}
		return f;
	}
}
