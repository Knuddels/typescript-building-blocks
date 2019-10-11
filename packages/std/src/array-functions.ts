export function last<T>(arr: readonly T[]): T | undefined {
	return lastOrDefault(arr, undefined);
}

export function lastOrDefault<T, TDefault>(
	arr: readonly T[],
	defaultValue: TDefault
): T | TDefault {
	if (arr.length === 0) {
		return defaultValue;
	}
	return arr[arr.length - 1];
}

export function lastOrUndefined<T>(arr: readonly T[]): T | undefined {
	return lastOrDefault(arr, undefined);
}

/**
 * Removes duplicate items from `items`. `keySelector` is used to determine if two items are equal.
 */
export function distinct<T>(
	items: ReadonlyArray<T>,
	keySelector: (item: T) => unknown
): T[] {
	const map = new Map<unknown, T>();
	for (const item of items) {
		const key = keySelector(item);
		if (!map.has(key)) {
			map.set(key, item);
		}
	}
	return [...map.values()];
}
