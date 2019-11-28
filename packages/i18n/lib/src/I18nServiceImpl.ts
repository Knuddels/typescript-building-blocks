import { FormatId } from './FormatId';
import { observable, action, computed, autorun } from 'mobx';
import {
	LocalizedFormatterProvider,
	FormatterProvider,
} from './FormatterProvider';
import { memoizeFormatConstructor } from './memoizeFormatConstructor';
import { BugIndicatingError, LocaleId } from '@knuddels/std';
import { I18nService, DateSource, DateTimeFormatOptions } from './I18nService';
import { FormattedData } from './FormattedData';
import { LocalePreference } from './LocalePreference';

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

	@computed
	public get currentLocalePreference(): LocalePreference {
		return new LocalePreference(this.currentLocale, this.fallbackLocale);
	}

	private readonly numberCtorCache = memoizeFormatConstructor(
		Intl.NumberFormat
	);

	private readonly dateTimeCtorCache = memoizeFormatConstructor(
		Intl.DateTimeFormat
	);

	private readonly relativeTimeCtorCache = memoizeFormatConstructor(
		Intl.RelativeTimeFormat
	);

	constructor(
		initialLocale: LocaleId,
		private readonly fallbackLocale: LocaleId,
		private readonly messageFormatProvider: FormatterProvider
	) {
		this._currentLocale = initialLocale;
		autorun(() => {
			this.localizedFormatProvider;
		});
	}

	@action
	public setLocale(locale: LocaleId): void {
		this._currentLocale = locale;
	}

	@computed get localizedFormatProvider(): LocalizedFormatterProvider {
		return this.messageFormatProvider.getLocalizedFormatterProvider(
			this.currentLocalePreference
		);
	}

	public formatStructured(formatId: FormatId, data?: {}): FormattedData {
		const messageFormat = this.localizedFormatProvider.getFormatter(
			formatId
		);
		return messageFormat.formatStructured(data);
	}

	public format(formatId: FormatId, data?: {}): string {
		const messageFormat = this.localizedFormatProvider.getFormatter(
			formatId
		);
		return messageFormat.format(data);
	}

	public formatNumber(
		value: number,
		options?: Intl.NumberFormatOptions
	): string {
		const f = this.numberCtorCache(this.currentLocale.localeCode, options);
		return f.format(value);
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

	public formatDateTimeAmount(
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
		return this.formatDateTimeAmount(diff, displayUnit, options);
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
