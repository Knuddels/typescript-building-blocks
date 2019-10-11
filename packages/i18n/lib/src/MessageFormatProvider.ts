import MessageFormat from 'intl-messageformat';
import { FormatId } from './FormatId';
import { LocaleId } from '@knuddels/std';

export interface MessageFormatProvider {
	getLocalizedMessageFormatProvider(
		localeId: LocaleId
	): LocalizedMessageFormatProvider;
}

export interface LocalizedMessageFormatProvider {
	readonly localeId: LocaleId;
	getMessageFormat(descriptor: FormatId): MessageFormat;
}
