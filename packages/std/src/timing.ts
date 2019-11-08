import { Disposable } from './disposable';

export function startTimeout(
	timeoutMs: number,
	callback: () => void
): Disposable {
	const handle = setTimeout(callback, timeoutMs);
	return Disposable.create(() => clearTimeout(handle));
}

export function startInterval(
	intervalMs: number,
	callback: () => void
): Disposable {
	const handle = setInterval(callback, intervalMs);
	return Disposable.create(() => clearInterval(handle));
}
