export interface IReadonlyMap<TKey, TValue> {
	get(key: TKey): TValue;
	has(key: TKey): boolean;
}

export interface IMap<TKey, TValue> extends IReadonlyMap<TKey, TValue> {
	delete(key: TKey): void;
	clear(): void;
	set(key: TKey, value: TValue): void;
}

export function transformKey<TKey, TBaseKey, TValue>(
	keyTransformer: (key: TKey) => TBaseKey,
	baseMap: IMap<TBaseKey, TValue>
): IMap<TKey, TValue> {
	return {
		// for debugging only
		['_baseMap' as any]: baseMap,

		clear: () => {
			baseMap.clear();
		},
		delete: key => {
			baseMap.delete(keyTransformer(key));
		},
		get: key => {
			return baseMap.get(keyTransformer(key));
		},
		set: (key, value) => {
			baseMap.set(keyTransformer(key), value);
		},
		has: key => {
			return baseMap.has(keyTransformer(key));
		},
	};
}

export class LazyMap<TKey, TValue> implements IReadonlyMap<TKey, TValue> {
	private readonly map = new Map<TKey, TValue>();

	constructor(private readonly generator: (key: TKey) => TValue) {}

	public get(key: TKey): TValue {
		if (!this.map.get(key)) {
			const value = this.generator(key);
			this.map.set(key, value);
			return value;
		}
		return this.map.get(key)!;
	}

	public delete(key: TKey): void {
		this.map.delete(key);
	}

	public clear(): void {
		this.map.clear();
	}

	public has(key: TKey): boolean {
		return true;
	}
}
