export function groupBy<T, TKey>(
	items: ReadonlyArray<T>,
	keySelector: (item: T) => TKey
): Map<TKey, T[]> {
	const map = new Map<TKey, T[]>();
	for (const item of items) {
		const key = keySelector(item);
		let items = map.get(key);
		if (!items) {
			items = [];
			map.set(key, items);
		}
		items.push(item);
	}
	return map;
}

export function toObject<T, TKey extends string>(
	item: ReadonlyArray<T>,
	keySelector: (item: T) => TKey
): Record<TKey, T>;
export function toObject<T, TKey extends string, TValue>(
	item: ReadonlyArray<T>,
	keySelector: (item: T) => TKey,
	valueSelector: (item: T) => TValue
): Record<TKey, TValue>;
export function toObject<T, K, V>(
	item: ReadonlyArray<T>,
	keySelector: (item: T) => K,
	valueSelector?: (item: T) => V
): any {
	const o = {} as any;
	for (const i of item) {
		o[keySelector(i)] = valueSelector ? valueSelector(i) : i;
	}
	return o;
}

export function flatMap<T, TResult>(
	arr: T[],
	selector: (item: T, idx: number) => TResult[]
): TResult[] {
	return new Array<TResult>().concat(
		...arr.map((item, idx) => selector(item, idx))
	);
}
