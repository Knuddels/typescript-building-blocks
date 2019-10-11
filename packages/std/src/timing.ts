import { Disposable } from './disposable';

export function startTimeout(
	intervalMs: number,
	callback: () => void
): Disposable {
	const handle = setTimeout(callback, intervalMs);
	return Disposable.create(() => clearTimeout(handle));
}
