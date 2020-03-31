export class SimpleCache<TKey, TData> {
	private map = new Map<unknown, TData>();
	private unused = new Set<unknown>();

	constructor(
		private readonly keySelector: (key: TKey) => unknown,
		private readonly computeFn: (key: TKey) => TData
	) {}

	public markAllAsUnused(): void {
		this.unused.clear();
		for (const key of this.map.keys()) {
			this.unused.add(key);
		}
	}

	public deleteUnused(): void {
		for (const unused of this.unused) {
			this.map.delete(unused);
		}
		this.unused.clear();
	}

	public getEntry(key: TKey): TData {
		const strKey = this.keySelector(key);
		let r = this.map.get(strKey);
		if (!r) {
			r = this.computeFn(key);
			this.map.set(strKey, r);
		}
		this.unused.delete(strKey);
		return r;
	}
}
