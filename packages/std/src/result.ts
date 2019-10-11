import { BugIndicatingError } from './errors';

/**
 * Represents a result that can either be "ok" or "error".
 * Use the `ok` and `err` functions to instantiate a result.
 */
export class Result<TOk, TError = void | { message: string }> {
	constructor(
		private readonly state:
			| { kind: 'ok'; value: TOk }
			| { kind: 'error'; value: TError }
	) {}

	public get kind(): 'ok' | 'error' {
		return this.state.kind;
	}

	public get value(): TOk | TError {
		return this.state.value;
	}

	/**
	 * Matches the result to its ok and error variant and returns a new value.
	 * ## Examples
	 * Match and return static values:
	 * ```ts
	 * const message = myResult.match({
	 * 		ok: "result is ok",
	 * 		error: "result is error",
	 * });
	 * ```
	 * Match and return dynamic values:
	 * ```ts
	 * const message = myResult.match({
	 * 		ok: val => `result is ${val}`,
	 * 		error: val => `result is ${val}`,
	 * });
	 * ```
	 * Match and don't return anything:
	 * ```ts
	 * myResult.match({
	 * 		ok: val => alert(`result is ${val}`),
	 * 		error: val => alert(`result is ${val}`),
	 * });
	 * ```
	 */
	public match<TOkResult, TErrorResult = TOkResult>(handlers: {
		ok: TOkResult | ((value: TOk) => TOkResult);
		error: TErrorResult | ((value: TError) => TErrorResult);
	}): TOkResult | TErrorResult {
		const h = handlers[this.state.kind];
		if (typeof h === 'function') {
			return (h as any)(this.state.value as any);
		} else {
			return h as any;
		}
	}

	/**
	 * Returns the ok value.
	 * Throws an fatal exception if the result is not ok.
	 */
	public unwrap(): TOk {
		if (this.state.kind !== 'ok') {
			throw new BugIndicatingError('Could not unwrap result.');
		}
		return this.state.value;
	}

	/**
	 * Returns the error value.
	 * Throws an fatal exception if the result is not an error.
	 */
	public unwrapError(): TError {
		if (this.state.kind !== 'error') {
			throw new BugIndicatingError('Could not unwrap error.');
		}
		return this.state.value;
	}

	public isOk(): this is Result<TOk, never> & { value: TOk; kind: 'ok' } {
		return this.state.kind === 'ok';
	}

	public isError(): this is Result<never, TError> & {
		value: TError;
		kind: 'error';
	} {
		return this.state.kind === 'error';
	}

	/**
	 * Maps the ok value to an error kind if the error is neither `undefined` nor `false`.
	 */
	public selectErrorKind<TField extends keyof TOk>(
		field: TField
	): Result<
		TOk,
		| TError
		| {
				kind: TOk[TField];
		  }
	> {
		return this.match<Result<TOk, TError | { kind: TOk[TField] }>>({
			ok: v => {
				const errObj = v[field] as any;
				if (
					errObj === undefined ||
					errObj === null ||
					errObj === false
				) {
					return this;
				}
				return err({ kind: errObj });
			},
			error: this,
		});
	}

	/**
	 * Maps the ok value to an error if the error is neither `undefined` nor `false`.
	 */
	public selectError<TField extends keyof TOk>(
		field: TField
	): Result<
		TOk,
		| TError
		| {
				kind: 'error';
				error: RemoveUndefinedAndNullAndFalse<TOk[TField]>;
		  }
	>;
	/**
	 * Maps the ok value to an error if the error is neither `undefined` nor `false`.
	 */
	public selectError<TNewError>(
		selector: (value: TOk) => TNewError | undefined | null | false
	): Result<TOk, TError | TNewError>;
	public selectError<TNewError>(
		selector:
			| ((value: TOk) => TNewError | undefined | null | false)
			| keyof TOk
	): Result<TOk, TError | TNewError> {
		return this.match<Result<TOk, TError | TNewError>>({
			ok: v => {
				const error =
					typeof selector === 'string'
						? v[selector]
						: (selector as any)(v);
				if (error === undefined || error === null || error === false) {
					return this;
				}
				return err(error);
			},
			error: this,
		});
	}

	/**
	 * Maps the ok value to a new ok value.
	 */
	public map<TNewOk>(fn: (value: TOk) => TNewOk): Result<TNewOk, TError> {
		return this.match<Result<TNewOk, TError>>({
			ok: v => ok(fn(v)),
			error: v => this as any,
		});
	}

	/**
	 * Maps the ok value to its property with name `fieldName`.
	 */
	public select<TFieldName extends keyof TOk>(
		fieldName: TFieldName
	): Result<TOk[TFieldName], TError> {
		return this.map(v => v[fieldName]);
	}

	/**
	 * Maps the ok value to a new result.
	 */
	public flatMap<TNewOk, TNewError>(
		map: (value: TOk) => Result<TNewOk, TNewError | TError>
	): Result<TNewOk, TNewError | TError> {
		return this.match<Result<TNewOk, TNewError | TError>>({
			ok: v => map(v),
			error: e => this as Result<any, TError>,
		});
	}
}

type RemoveUndefinedAndNullAndFalse<T> = T extends undefined
	? never
	: T extends null
	? never
	: T extends false
	? never
	: T;

/**
 * Creates an empty ok result.
 */
export function ok(value: void): Result<void, never>;
/**
 * Creates an ok result that wraps the given value.
 */
export function ok<TOk>(value: TOk): Result<TOk, never>;
export function ok(value: any): Result<any, never> {
	return new Result({ kind: 'ok', value: value });
}

/**
 * Creates an empty error result.
 */
export function err(): Result<never, void>;
/**
 * Creates an error result that wraps the given error.
 */
export function err<TError>(error: TError): Result<never, TError>;
export function err(value: any = undefined): Result<any, any> {
	return new Result({ kind: 'error', value });
}

/**
 * Creates an error result that uses a kind discriminator.
 */
export function errOfKind<TKind extends string, TError>(
	kind: TKind,
	errorData: TError
): Result<never, { kind: TKind; error: TError }> {
	return err({
		kind: kind,
		error: errorData,
	});
}
