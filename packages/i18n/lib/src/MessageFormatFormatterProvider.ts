import { computed, ObservableSet, action, autorun } from 'mobx';
import MessageFormat from 'intl-messageformat';
import { FormatId } from './FormatId';
import {
	FormatterProvider,
	LocalizedFormatterProvider,
	Formatter,
} from './FormatterProvider';
import { LocaleId } from '@knuddels/std';
import { FormattedData } from '.';

/**
 * A formatter provider based on `intl-messageformat`.
 */
export class MessageFormatFormatterProvider implements FormatterProvider {
	private readonly providers = new ObservableSet<FormatBundleProvider>();

	public getLocalizedMessageFormatProvider(
		localeId: LocaleId
	): LocalizedFormatterProvider {
		return new LocalizedMessageFormatProviderImpl(localeId, this.providers);
	}

	@action
	public registerFormatProvider(provider: FormatBundleProvider): void {
		this.providers.add(provider);
	}
}

export type FormatBundleProvider = (locale: LocaleId) => FormatBundle;
export interface FormatBundle {
	formats: Formats;
}
export type Formats = Record<string, string | null>;

class LocalizedMessageFormatProviderImpl implements LocalizedFormatterProvider {
	constructor(
		public readonly localeId: LocaleId,
		private readonly providers: Set<FormatBundleProvider>
	) {
		autorun(() => {
			// this keeps the formats cache alive.
			this.formats;
		});
	}

	@computed
	private get formats(): Record<string, Formatter> {
		const result: Record<string, Formatter> = {};
		for (const p of this.providers) {
			const bundle = p(this.localeId);
			for (const [key, value] of Object.entries(bundle.formats)) {
				result[key] = new MessageFormatFormatter(value, this.localeId);
			}
		}
		return result;
	}

	getFormatter(descriptor: FormatId): Formatter {
		let f = this.formats[descriptor.id];
		if (!f) {
			if (!descriptor.defaultFormat) {
				return new MessageFormatFormatter(descriptor.id, this.localeId);
			}
			f = new MessageFormatFormatter(
				descriptor.defaultFormat,
				this.localeId
			);
		}
		return f;
	}
}

class MessageFormatFormatter implements Formatter {
	private readonly fmt: MessageFormat;
	constructor(format: string, locale: LocaleId) {
		this.fmt = new MessageFormat(format, locale.localeCode);
	}

	format(data?: {}): string {
		return this.fmt.format(data);
	}

	formatStructured(data?: {}): FormattedData {
		// This enum a copy of IntlMessageFormat.PART_TYPE, however,
		// importing PART_TYPE from intl message format throws.
		const enum PART_TYPE {
			literal = 0,
			argument = 1,
		}

		const parts = this.fmt.formatToParts(data);
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
}
