// from https://github.com/hediet/ts-std
/**
 * Represents a type which can release resources, such
 * as event listening or a timer.
 */
export interface Disposable {
	/**
	 * Disposes this object.
	 */
	dispose(): void;
}

/**
 * Represents a type which is like a `Disposable`.
 */
export type DisposableLike =
	| Disposable
	| (() => void)
	| ReadonlyArray<Disposable>
	| Set<Disposable>
	| undefined
	| void;

export namespace Disposable {
	export function create(disposable?: DisposableLike): Disposable {
		if (!disposable) {
			return empty;
		}
		if (disposable instanceof Function) {
			return { dispose: disposable };
		}
		if ('dispose' in disposable) {
			return disposable as Disposable;
		} else if (disposable instanceof Set) {
			return new ArrayDisposer([...disposable]);
		} else if (disposable.length > 0) {
			return new ArrayDisposer(disposable);
		}

		return empty;
	}
	export const empty: Disposable = { dispose: () => {} };

	export function normalize(
		disposable: DisposableLike
	): ReadonlyArray<Disposable> {
		if (!disposable) {
			return [];
		}
		if (disposable instanceof ArrayDisposer) {
			return disposable.items;
		}
		if ('dispose' in disposable) {
			return [disposable as Disposable];
		}
		if (disposable instanceof Set) {
			return [...disposable];
		}
		if (typeof disposable === 'function') {
			return [{ dispose: disposable }];
		} else {
			return disposable;
		}
	}

	export function fn(
		callback?: (track: TrackFunction, untrack: TrackFunction) => void
	): { (): void } & Disposer {
		const d = new Disposer();
		if (callback) {
			callback(
				disposable => d.track(disposable),
				disposable => d.untrack(disposable)
			);
		}

		// tslint:disable-next-line: no-shadowed-variable
		function dispose(): void {
			d.dispose();
		}
		dispose.track = d.track.bind(d);
		dispose.untrack = d.untrack.bind(d);
		dispose.dispose = d.dispose;
		Object.defineProperty(dispose, 'disposed', {
			get(): any {
				return d.disposed;
			},
		});

		return dispose as any;
	}

	export function is(obj: unknown): obj is Disposable {
		if (typeof obj !== 'object') {
			return false;
		}

		if (obj && !('dispose' in obj)) {
			return false;
		}

		const d: Function | null = (obj as any).dispose;
		if (typeof d !== 'function') {
			return false;
		}
		if (d.length !== 0) {
			return false;
		}
		return true;
	}
}

class ArrayDisposer implements Disposable {
	constructor(public readonly items: ReadonlyArray<Disposable>) {}

	dispose(): void {
		dispose(this.items);
	}
}

// See https://github.com/Microsoft/TypeScript/issues/17002
function isArray(item: any): item is ReadonlyArray<any> {
	return Array.isArray(item);
}

export function dispose(disposable: DisposableLike): void {
	if (!disposable) {
		return;
	}

	if (isArray(disposable) || disposable instanceof Set) {
		for (const d of disposable) {
			d.dispose();
		}
	} else if ('dispose' in disposable) {
		disposable.dispose();
	} else {
		disposable();
	}
}

export type TrackFunction = <T extends DisposableLike>(disposable: T) => T;

export class Disposer implements Disposable {
	public disposed = false;
	private disposables = new Set<Disposable>();

	public track<T extends DisposableLike>(disposable: T): T {
		for (const d of Disposable.normalize(disposable)) {
			this.disposables.add(d);
		}
		return disposable;
	}

	public untrack<T extends DisposableLike>(disposable: T): T {
		for (const d of Disposable.normalize(disposable)) {
			this.disposables.delete(d);
		}
		return disposable;
	}

	public readonly dispose = () => {
		this.disposed = true;
		dispose(this.disposables);
		this.disposables.clear();
	};
}

export function disposeOnReturn<T>(
	callback: (track: TrackFunction, untrack: TrackFunction) => T
): T {
	let wasPromise = false;
	const disposables = new Set<Disposable>();
	try {
		const result = callback(
			disposable => {
				for (const d of Disposable.normalize(disposable)) {
					disposables.add(d);
				}
				return disposable;
			},
			disposable => {
				for (const d of Disposable.normalize(disposable)) {
					disposables.delete(d);
				}
				return disposable;
			}
		);
		if (isPromise(result)) {
			wasPromise = true;

			return (async function test(): Promise<unknown> {
				try {
					return await result;
				} finally {
					dispose(disposables);
				}
			})() as any;
		}

		return result;
	} finally {
		if (!wasPromise) {
			dispose(disposables);
		}
	}
}

function isPromise(obj: any): obj is Promise<unknown> {
	return (
		!!obj &&
		(typeof obj === 'object' || typeof obj === 'function') &&
		typeof (obj as any).then === 'function'
	);
}

export function addAndDeleteOnDispose<T>(set: Set<T>, item: T): Disposable;
export function addAndDeleteOnDispose<TKey, TValue>(
	set: Map<TKey, TValue>,
	key: TKey,
	item: TValue
): Disposable;
export function addAndDeleteOnDispose(
	set: Set<any> | Map<any, any>,
	keyOrItem: any,
	item?: any
): Disposable {
	if (set instanceof Set) {
		set.add(keyOrItem);
		return Disposable.create(() => set.delete(keyOrItem));
	} else {
		set.set(keyOrItem, item);
		return Disposable.create(() => set.delete(keyOrItem));
	}
}
