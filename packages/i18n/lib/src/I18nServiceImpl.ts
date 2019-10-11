import { FormatId } from './FormatId';
import { observable, action, computed } from 'mobx';
import {
	LocalizedFormatterProvider,
	FormatterProvider,
} from './FormatterProvider';
import { memoizeFormatConstructor } from './memoizeFormatConstructor';
import { BugIndicatingError, LocaleId } from '@knuddels/std';
import { I18nService, DateSource, DateTimeFormatOptions } from './I18nService';
import { FormattedData } from './FormattedData';

export class I18nServiceImpl implements I18nService {
	@observable
	private _currentLocale: LocaleId;
	/**
	 * Gets the current locale and triggers a mobx dependency.
	 * Use `setLocale` to update the current locale.
	 */
	public get currentLocale(): LocaleId {
		return this._currentLocale;
	}

	private readonly dateTimeCtorCache = memoizeFormatConstructor(
		Intl.DateTimeFormat
	);

	private readonly relativeTimeCtorCache = memoizeFormatConstructor(
		Intl.RelativeTimeFormat
	);

	constructor(
		initialLocale: LocaleId,
		private readonly messageFormatProvider: FormatterProvider
	) {
		this._currentLocale = initialLocale;
	}

	@action
	public setLocale(locale: LocaleId): void {
		this._currentLocale = locale;
	}

	@computed get localizedFormatProvider(): LocalizedFormatterProvider {
		return this.messageFormatProvider.getLocalizedMessageFormatProvider(
			this._currentLocale
		);
	}

	public formatStructured(descriptor: FormatId, data?: {}): FormattedData {
		const messageFormat = this.localizedFormatProvider.getFormatter(
			descriptor
		);
		return messageFormat.formatStructured(data);
	}

	public format(descriptor: FormatId, data?: {}): string {
		const messageFormat = this.localizedFormatProvider.getFormatter(
			descriptor
		);
		return messageFormat.format(data);
	}

	public formatDateTime(
		dateTime: DateSource,
		options?: DateTimeFormatOptions
	): string {
		const f = this.dateTimeCtorCache(
			this.currentLocale.localeCode,
			options
		);
		return f.format(dateTime);
	}

	public formatRelativeAmount(
		amount: number,
		unit: Intl.RelativeTimeFormatUnit,
		options?: Intl.RelativeTimeFormatOptions
	): string {
		const f = this.relativeTimeCtorCache(
			this.currentLocale.localeCode,
			options
		);
		const formatted = f.format(amount, unit);
		return formatted;
	}

	public formatDateTimeRelative(
		dateTime: DateSource,
		displayUnit: Intl.RelativeTimeFormatUnit,
		options?: Intl.RelativeTimeFormatOptions
	): string {
		dateTime = normalizeDateSource(dateTime);
		// TODO: Retrieve current time via mobx so that react components update when the format changes
		const now = new Date();
		if (displayUnit === 'day') {
			now.setHours(0, 0, 0, 0);
			dateTime.setHours(0, 0, 0, 0);
		}

		const diffMs = dateTime.getTime() - now.getTime();
		const diff = Math.ceil(diffMs / unitToMs(displayUnit));

		if (displayUnit === 'minute' && diff === 0) {
			// "0 seconds" => "now", "0 minutes" => "in 0 minutes", even if numeric: auto.
			// This fixes that.
			displayUnit = 'second';
		}
		return this.formatRelativeAmount(diff, displayUnit, options);
	}
}

export function unitToMs(unit: Intl.RelativeTimeFormatUnit): number {
	switch (unit) {
		case 'second':
			return 1000;
		case 'minute':
			return 60 * unitToMs('second');
		case 'hour':
			return 60 * unitToMs('minute');
		case 'day':
			return 24 * unitToMs('hour');
		default:
			throw new BugIndicatingError('Not implemented yet.');
	}
}

export function normalizeDateSource(date: DateSource): Date {
	if (typeof date === 'number') {
		return new Date(date);
	}
	return date;
}
