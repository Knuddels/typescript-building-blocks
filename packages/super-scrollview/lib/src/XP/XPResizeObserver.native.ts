import { EventEmitter } from '@knuddels/std';

export class XPResizeObserver {
	public observe(target: Element) {}

	private readonly sizeChangedEventEmitter = new EventEmitter<
		{},
		XPResizeObserver
	>();
	public readonly onSizeChanged = this.sizeChangedEventEmitter.asEvent();
}
