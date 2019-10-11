import { Result } from './result';

export class ResultPromise<TOk, TError> {
	constructor(private readonly innerPromise: Promise<Result<TOk, TError>>) {}

	public then<T>(
		callback: (result: Result<TOk, TError>) => T | PromiseLike<T>
	): Promise<T> {
		return this.innerPromise.then(callback);
	}

	public onErr(callback: (err: TError) => void): void {
		this.innerPromise.then(r => {
			if (r.isError()) {
				callback(r.value);
			}
		});
	}

	public onOk(callback: (ok: TOk) => void): void {
		this.innerPromise.then(r => {
			if (r.isOk()) {
				callback(r.value);
			}
		});
	}

	public match<TOkResult, TErrorResult = TOkResult>(handlers: {
		ok: TOkResult | ((value: TOk) => TOkResult);
		error: TErrorResult | ((value: TError) => TErrorResult);
	}): Promise<TOkResult | TErrorResult> {
		return this.innerPromise.then(result => {
			const h = handlers[result.kind];
			if (typeof h === 'function') {
				return (h as any)(result.value as any);
			} else {
				return h as any;
			}
		});
	}
}
