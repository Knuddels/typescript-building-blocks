export type PromiseReturnType<T extends Promise<any>> = T extends Promise<
	infer TData
>
	? TData
	: never;
export type AsyncReturnType<
	T extends (...args: any) => any
> = PromiseReturnType<ReturnType<T>>;

export type Filter<T, U> = T extends U ? T : never;
export type Narrow<T extends { kind: string }, TVal extends T['kind']> = Filter<
	T,
	{ kind: TVal }
>;
