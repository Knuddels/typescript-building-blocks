import { BugIndicatingError } from './errors';

export function foreachProp<T extends Record<string, any>>(
	items: T,
	methods: {
		[TKey in keyof T]:
			| (((item: T[TKey]) => void) & { tag: T[TKey] })
			| null;
	}
): void {
	for (const [key, item] of Object.entries(items)) {
		const method = methods[key];
		method!(item);
	}
}

export function select(data: unknown, propertyPath: string[]): unknown {
	if (propertyPath.length === 0) {
		return data;
	}
	const firstProperty = propertyPath[0];
	const restPath = propertyPath.slice(1);
	if (typeof data !== 'object' && typeof data !== 'function' || !data) {
		throw new BugIndicatingError('Invalid path');
	}

	const subObj = (data as any)[firstProperty];
	return select(subObj, restPath);
}
