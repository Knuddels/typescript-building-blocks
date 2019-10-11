import { FormatId } from './FormatId';
import { LocaleId } from '@knuddels/std';

export interface DateTimeFormatOptions {
	weekday?: 'narrow' | 'short' | 'long';
	era?: 'narrow' | 'short' | 'long';
	year?: 'numeric' | '2-digit';
	month?: 'numeric' | '2-digit' | 'narrow' | 'short' | 'long';
	day?: 'numeric' | '2-digit';
	hour?: 'numeric' | '2-digit';
	minute?: 'numeric' | '2-digit';
	second?: 'numeric' | '2-digit';
	timeZoneName?: 'short' | 'long';

	// Time zone to express it in
	timeZone?: string;
	// Force 12-hour or 24-hour
	hour12?: true | false;

	// Rarely-used options
	hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
	formatMatcher?: 'basic' | 'best fit';
}

export type DateSource = number | Date;

export type FormattedData =
	| { kind: 'text'; value: string }
	| { kind: 'sequence'; items: FormattedData[] }
	| { kind: 'object'; data: any; child?: FormattedData };

export interface I18nService {
	readonly currentLocale: LocaleId;
	setLocale(locale: LocaleId): void;

	formatStructured(descriptor: FormatId, data?: {}): FormattedData;

	format(descriptor: FormatId, data?: {}): string;

	formatDateTime(
		dateTime: DateSource,
		options?: DateTimeFormatOptions
	): string;

	formatRelativeAmount(
		amount: number,
		unit: Intl.RelativeTimeFormatUnit,
		options?: Intl.RelativeTimeFormatOptions
	): string;

	formatDateTimeRelative(
		dateTime: DateSource,
		displayUnit: Intl.RelativeTimeFormatUnit,
		options?: Intl.RelativeTimeFormatOptions
	): string;
}
