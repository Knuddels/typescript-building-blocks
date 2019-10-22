import { I18nService } from './I18nService';

/**
 * Represents a format id.
 * Use an instance of `I18nService` to format data against a format id:
 * The `I18nService` resolves the format id to a localized format
 * which describes how to format the given data as string or react element.
 */
export class FormatId {
	constructor(
		public readonly id: string,
		public readonly defaultFormat?: string
	) {}

	/**
	 * Formats data.
	 * @experimental Discuss whether this convenience method is really necessary.
	 */
	public format(service: I18nService, data?: {}): string {
		return service.format(this, data);
	}
}

/**
 * Declares a static format id.
 * `data` must be a JSON literal and `data.id` must be
 * unique across all `declareFormat` calls in this project.
 *
 * Use `defaultFormat` to specify the format for the language as set in `formats-scope.json`.
 * The default format is used to generate the default language format package and to provide context.
 * The default format can also be updated from the default language format package.
 *
 * Multiple calls to `declareFormat` with the same id will return identical `FormatId`s.
 * This is useful when `declareFormat` is used as
 * argument to react components so that they don't rerender every time.
 */
export function declareFormat(data: {
	id: string;
	defaultFormat?: string;
}): FormatId {
	let cached = declaredFormatsCache.get(data.id);
	if (!cached) {
		cached = new FormatId(data.id, data.defaultFormat);
		declaredFormatsCache.set(data.id, cached);
	} else {
		if (process.env.NODE_ENV !== 'production') {
			if (cached.defaultFormat !== data.defaultFormat) {
				console.error(
					`Default format must be static. Was "${cached.defaultFormat}", is now "${data.defaultFormat}".`
				);
			}
		}
	}
	return cached;
}

const declaredFormatsCache = new Map<string, FormatId>();

/**
 * Represents a reference to a format id.
 * This is used in tests to reference a format id as string
 * while allowing tools to statically check that reference.
 */
export interface FormatIdRef {
	__brand: 'FormatIdRef';
	id: string;
}

/**
 * References an id.
 * This id must be declared somewhere else with `declareFormat`.
 * Such references should only occur in tests.
 */
export function referenceFormat(id: string): FormatIdRef {
	return {
		__brand: 'FormatIdRef',
		id,
	};
}
