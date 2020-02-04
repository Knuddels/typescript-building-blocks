import { EventEmitter } from '@knuddels/std';

export class XPResizeObserver {
	private observer = new ResizeObserver(() => this.handleObservers());

	private handleObservers(): void {
		this.sizeChangedEventEmitter.emit({}, this);
	}

	public observe(target: Element) {
		this.observer.observe(target);
	}

	private readonly sizeChangedEventEmitter = new EventEmitter<
		{},
		XPResizeObserver
	>();
	public readonly onSizeChanged = this.sizeChangedEventEmitter.asEvent();
}
