declare namespace Intl {
	declare interface RelativeTimeFormatOptions {
		localeMatcher?: 'lookup' | 'best fit';
		numeric?: 'always' | 'auto';
		style?: 'long' | 'short' | 'narrow';
	}

	type RelativeTimeFormatUnit =
		| 'year'
		| 'quarter'
		| 'month'
		| 'week'
		| 'day'
		| 'hour'
		| 'minute'
		| 'second';

	declare class RelativeTimeFormat {
		constructor(
			locales?: string | string[],
			options?: RelativeTimeFormatOptions
		);

		public format(
			value: Date | number,
			unit: RelativeTimeFormatUnit
		): string;

		public formatToParts(value: Date | number): string;
	}
}
