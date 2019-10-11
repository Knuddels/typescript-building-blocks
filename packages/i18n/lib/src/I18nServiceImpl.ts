import { FormatId } from './FormatId';
import { observable, action, computed } from 'mobx';
import {
	LocalizedMessageFormatProvider,
	MessageFormatProvider,
} from './MessageFormatProvider';
import { memoizeFormatConstructor } from './memoizeFormatConstructor';
import { BugIndicatingError } from '@knuddels/std';
import {
	I18nService,
	DateSource,
	DateTimeFormatOptions,
	FormattedData,
} from './I18nService';
import { LocaleId } from '@knuddels/std';

export class I18nServiceImpl implements I18nService {
	@observable
	private _currentLocale: LocaleId;
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
		private readonly messageFormatProvider: MessageFormatProvider
	) {
		this._currentLocale = initialLocale;
	}

	@action
	public setLocale(locale: LocaleId): void {
		this._currentLocale = locale;
	}

	@computed get localizedFormatProvider(): LocalizedMessageFormatProvider {
		return this.messageFormatProvider.getLocalizedMessageFormatProvider(
			this._currentLocale
		);
	}

	public formatStructured(descriptor: FormatId, data?: {}): FormattedData {
		const messageFormat = this.localizedFormatProvider.getMessageFormat(
			descriptor
		);

		// This enum a copy of IntlMessageFormat.PART_TYPE, however,
		// importing PART_TYPE from intl message format throws.
		const enum PART_TYPE {
			literal = 0,
			argument = 1,
		}

		const parts = messageFormat.formatToParts(data);
		const items = parts.map<FormattedData>(p =>
			(p.type as any) === PART_TYPE.literal
				? { kind: 'text', value: p.value }
				: { kind: 'object', data: p.value }
		);
		return {
			kind: 'sequence',
			items,
		};
	}

	public format(descriptor: FormatId, data?: {}): string {
		const messageFormat = this.localizedFormatProvider.getMessageFormat(
			descriptor
		);
		return messageFormat.format(data);
	}

	public formatDateTime(
		dateTime: DateSource,
		options?: DateTimeFormatOptions
	): string {
		const f = this.dateTimeCtorCache(
			this.currentLocale.getLocaleCode(),
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
			this.currentLocale.getLocaleCode(),
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
