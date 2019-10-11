import { FormatId } from './FormatId';
import { LocaleId } from '@knuddels/std';
import { FormattedData } from './FormattedData';

export interface FormatterProvider {
	getLocalizedMessageFormatProvider(
		localeId: LocaleId
	): LocalizedFormatterProvider;
}

export interface LocalizedFormatterProvider {
	readonly localeId: LocaleId;
	getFormatter(descriptor: FormatId): Formatter;
}

export interface Formatter {
	format(data?: {}): string;
	formatStructured(data?: {}): FormattedData;
}
