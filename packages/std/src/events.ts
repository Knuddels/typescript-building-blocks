// from https://github.com/hediet/ts-std
import { Disposable } from './disposable';
import { DontUseThisMemberInANonTypePositionError } from './errors';

/**
 * The event handler function type.
 */
export type EventHandler<TArgs, TSender> = (
	args: TArgs,
	sender: TSender
) => void;

export abstract class EventSource<TArgs = void, TSender = void> {
	/**
	 * Subscribes to this event. `fn` is called whenever an event is emitted by this source.
	 * The subscription can be revoked by disposing the returned value.
	 */
	public abstract sub(fn: EventHandler<TArgs, TSender>): Disposable;
	/**
	 * Subscribes to this event. `fn` is called the first time an event is emitted by this source.
	 * The subscription can be revoked by disposing the returned value.
	 */
	public abstract one(fn: EventHandler<TArgs, TSender>): Disposable;

	/**
	 * Waits for a single event.
	 */
	public waitOne(): Promise<TArgs> {
		return new Promise(resolve => this.one(resolve));
	}

	/**
	 * Returns the type of the arguments, the callback is called with.
	 * `typeof eventSource.TArgs`
	 */
	public get TArgs(): TArgs {
		throw new DontUseThisMemberInANonTypePositionError();
	}
}

interface Subscription<TArgs, TSender> {
	readonly handler: EventHandler<TArgs, TSender>;
	readonly isOnce: boolean;
}

export class EventEmitter<TArgs = void, TSender = void> extends EventSource<
	TArgs,
	TSender
> {
	private readonly subscriptions = new Set<Subscription<TArgs, TSender>>();

	public sub(fn: EventHandler<TArgs, TSender>): Disposable {
		const sub: Subscription<TArgs, TSender> = {
			handler: fn,
			isOnce: false,
		};
		this.subscriptions.add(sub);
		return Disposable.create(() => this.subscriptions.delete(sub));
	}

	public one(fn: EventHandler<TArgs, TSender>): Disposable {
		const sub: Subscription<TArgs, TSender> = {
			handler: fn,
			isOnce: false,
		};
		this.subscriptions.add(sub);
		return Disposable.create(() => this.subscriptions.delete(sub));
	}

	public asEvent(): EventSource<TArgs, TSender> {
		return this;
	}

	public emit(args: TArgs, sender: TSender): void {
		for (const sub of this.subscriptions.values()) {
			if (sub.isOnce) {
				this.subscriptions.delete(sub);
			}
			sub.handler(args, sender);
		}
	}
}
