function getCacheId(inputs: any[]): string {
	return JSON.stringify(
		inputs.map(input =>
			input && typeof input === 'object' ? orderedProps(input) : input
		)
	);
}

function orderedProps(obj: Record<string, any>): Record<string, any>[] {
	return Object.keys(obj)
		.sort()
		.map(k => ({ [k]: obj[k] }));
}

export type CacheValue =
	| Intl.NumberFormat
	| Intl.DateTimeFormat
	// | Intl.PluralRules TODO uncomment this once we need plural rules
	| any;

type CtorReturnType<T> = T extends (new (...args: any[]) => infer TReturnType)
	? TReturnType
	: never;

export function memoizeFormatConstructor<T extends new (...args: any[]) => any>(
	formatConstructor: T,
	cache: Record<string, CtorReturnType<T>> = {}
): (...args: ConstructorParameters<T>) => CtorReturnType<T> {
	return (...args: ConstructorParameters<T>) => {
		const cacheId = getCacheId(args);
		let format = cacheId && cache[cacheId];
		if (!format) {
			format = new formatConstructor(...args);
			if (cacheId) {
				cache[cacheId] = format;
			}
		}

		return format;
	};
}
