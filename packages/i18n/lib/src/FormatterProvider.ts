import { FormatId } from './FormatId';
import { LocaleId } from '@knuddels/std';
import { FormattedData } from './FormattedData';
import { LocalePreference } from './LocalePreference';

export interface FormatterProvider {
	getLocalizedFormatterProvider(
		localePreference: LocalePreference
	): LocalizedFormatterProvider;
}

export interface LocalizedFormatterProvider {
	readonly localePreference: LocalePreference;
	getFormatter(formatId: FormatId): Formatter;
}

export interface Formatter {
	format(data?: {}): string;
	formatStructured(data?: {}): FormattedData;
}
