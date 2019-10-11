export type DeferredState = 'none' | 'resolved' | 'rejected';

export class Deferred<T = void> {
	public readonly resolve: (value: T) => void;
	public readonly reject: (reason?: any) => void;
	public readonly promise: Promise<T>;
	private _state: DeferredState = 'none';
	public get state(): DeferredState {
		return this._state;
	}

	constructor() {
		let escapedResolve: (value: T) => void;
		let escapedReject: (reason?: any) => void;
		this.promise = new Promise((resolve, reject) => {
			escapedResolve = resolve;
			escapedReject = reject;
		});
		this.resolve = val => {
			this._state = 'resolved';
			escapedResolve(val);
		};
		this.reject = reason => {
			this._state = 'rejected';
			escapedReject(reason);
		};
	}
}
