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
import { LocalePreference } from './LocalePreference';

/**
 * A formatter provider based on `intl-messageformat`.
 */
export class MessageFormatFormatterProvider implements FormatterProvider {
	private readonly providers = new ObservableSet<FormatBundleProvider>();

	public getLocalizedFormatterProvider(
		localePreference: LocalePreference
	): LocalizedFormatterProvider {
		return new LocalizedMessageFormatProviderImpl(
			localePreference,
			this.providers
		);
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
		public readonly localePreference: LocalePreference,
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
		for (const provider of this.providers) {
			let bundle: FormatBundle | undefined = undefined;
			for (const locale of this.localePreference.preferredLocales) {
				// TODO combine multiple locale bundles
				try {
					bundle = provider(locale);
					break;
				} catch (e) {
					console.warn(
						`Could not load locale "${locale}" for bundle "${provider.toString()}". Fallback.`
					);
				}
			}

			if (!bundle) {
				console.error(
					`Could not load any locale for "${provider.toString()}"`
				);
				continue;
			}

			for (const [key, value] of Object.entries(bundle.formats)) {
				if (!value) {
					console.warn(`Key '${key}' has no translation!`);
				}
				result[key] = new MessageFormatFormatter(
					value || key,
					this.localePreference.preferredLocales
				);
			}
		}
		return result;
	}

	getFormatter(formatId: FormatId): Formatter {
		const f = this.formats[formatId.id];
		if (f) {
			return f;
		}
		if (formatId.defaultFormat) {
			const defaultFormat = new MessageFormatFormatter(
				formatId.defaultFormat,
				this.localePreference.preferredLocales
			);
			this.formats[formatId.id] = defaultFormat;
			return defaultFormat;
		}
		return new MessageFormatFormatter(
			formatId.id,
			this.localePreference.preferredLocales
		);
	}
}

class MessageFormatFormatter implements Formatter {
	private readonly fmt: MessageFormat;
	constructor(format: string, locales: ReadonlyArray<LocaleId>) {
		this.fmt = new MessageFormat(format, locales.map(l => l.localeCode));
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
