import * as React from 'react';
import { observer } from 'mobx-react';
import { observable, action, computed, trace } from 'mobx';
import { OffsetScrollView } from './OffsetScrollView';
import { BatchProcessor } from './BatchProcessor';
import { XPView, XPLayoutEventArgs, XPResizeObserver } from './XP';
import { last } from '@knuddels/std';

export interface Range {
	start: number;
	length: number;
}

export function rangeIntersects(r1: Range, r2: Range): boolean {
	if (r1.start + r1.length <= r2.start) {
		return false;
	}
	if (r1.start >= r2.start + r2.length) {
		return false;
	}
	return true;
}

type Simplify<T> = (T extends string ? { T: string } : { T: T })['T'];

type Id = string;

export interface SuperScrollViewItem {
	readonly id: Id;
	// readonly reuseKey: string;
	readonly canBeVirtualized: boolean;
	readonly estimatedHeight: number;
	readonly canBeUsedAsAnchor: boolean;
	render(): React.ReactElement;
}

export class ViewInfo {
	constructor(
		public readonly viewPortTop: number,
		public readonly viewPortLength: number,
		public readonly viewTop: number,
		public readonly viewLength: number,
		public readonly targetViewPortTop: number | undefined
	) {}

	public equals(other: ViewInfo): boolean {
		return (
			this.viewPortTop === other.viewPortTop &&
			this.viewPortLength === other.viewPortLength &&
			this.viewTop === other.viewTop &&
			this.viewLength === other.viewLength
		);
	}

	public get viewPortBottom(): number {
		return this.viewPortTop + this.viewPortLength;
	}

	public get targetViewPortBottom(): number | undefined {
		if (!this.targetViewPortTop) {
			return undefined;
		}
		return this.targetViewPortTop + this.viewPortLength;
	}

	public get viewBottom(): number {
		return this.viewTop + this.viewLength;
	}
}

@observer
export class SuperScrollView<
	TItem extends SuperScrollViewItem
> extends React.Component<{
	items: TItem[];
	initialScrollTo?:
		| { item: TItem; location: 'top' | 'bottom' }
		| 'top'
		| 'bottom';
	onBeforeItemsRendered?: (args: {
		items: TItem[];
		visibleRange: Range;
		renderedRange: Range;
	}) => void;
	onItemLayout?: (item: TItem, first: boolean) => void;
	onViewInfoChange?: (newViewPort: ViewInfo) => void;
	OffsetScrollViewClass?: Simplify<typeof OffsetScrollView>;
	autoScrollDown?: boolean;
}> {
	private readonly resizeObserver = new XPResizeObserver();

	@observable private scrollTop: number = 0;
	@observable private viewHeight: number | undefined = undefined;

	private dummyHeight = 0;

	private anchor:
		| { item: ItemInfo<TItem>; top: number; mode: 'top' | 'bottom' }
		| undefined;

	private readonly itemInfos = new Map<Id, ItemInfo<TItem>>();

	private readonly scrollViewRef = React.createRef<OffsetScrollView>();

	// these are not observable and more a recommendation
	// of how many elements should be rendered.
	private overscanHeight: { top: number; bottom: number } = {
		top: 400,
		bottom: 400,
	};

	@action.bound
	private handleScrollViewLayout(args: XPLayoutEventArgs) {
		if (this.viewHeight === args.height) {
			return;
		}

		const isInitial = this.viewHeight === undefined;
		this.viewHeight = args.height;

		if (isInitial) {
			this.setInitialScroll();
		}
	}

	private setInitialScroll() {
		// this scrolls to the bottom when rendered the first time.
		let initialScrollTo = this.props.initialScrollTo;
		if (!initialScrollTo) {
			initialScrollTo = 'bottom';
		}

		let scrollToItem: TItem;
		let location: 'top' | 'bottom';

		if (initialScrollTo === 'bottom') {
			scrollToItem = this.props.items[0];
			location = 'bottom';
		} else if (initialScrollTo === 'top') {
			scrollToItem = this.props.items[this.props.items.length - 1];
			location = 'top';
		} else if (initialScrollTo) {
			scrollToItem = initialScrollTo.item;
			location = initialScrollTo.location;
		} else {
			throw new Error('impossible');
		}

		if (!scrollToItem) {
			return;
		}

		const layout = this.createLayoutWithDummyHeight(this.dummyHeight);
		const b = layout.layout.getBottomOf(this.getItem(scrollToItem));
		if (!b) {
			return;
		}

		if (location === 'top') {
			this.setAnchorMode({ kind: 'automatic', mode: 'top' });
		} else {
			this.setAnchorMode({ kind: 'automatic', mode: 'bottom' });
		}

		const top =
			layout.bottomToTop(
				b.bottom,
				location === 'top' ? b.item.height : 0
			) - (location === 'bottom' ? this.viewHeight! : 0);

		if (this.scrollViewRef.current) {
			this.scrollViewRef.current.scrollTo({
				y: top,
				animated: false,
			});
		}
	}

	@action.bound
	private handleScroll(e: {
		x: number;
		y: number;
		xVelocity: number;
		yVelocity: number;
	}) {
		//if (Math.abs(this.scrollTop - e.y) > 0) {
		this.scrollTop = e.y;
		this.updateViewInfo();
		//}

		// adapt overscan to scroll velocity
		const yv = e.yVelocity;
		if (yv > 3) {
			this.overscanHeight = { top: 1000, bottom: 0 };
		} else if (yv < -3) {
			this.overscanHeight = { top: 0, bottom: 1000 };
		} else {
			this.overscanHeight = { top: 400, bottom: 400 };
		}
	}

	private firstUpdate = true;

	public componentDidUpdate() {
		this.updateViewInfo();
		const anythingScheduled = ItemInfo.layoutBatchProcessor.runScheduled();
		if (!anythingScheduled && this.firstUpdate) {
			this.firstUpdate = false;
			this.setInitialScroll();
		}
	}

	private wasScrolledToBottom = false;
	private isScrolledToBottom = false;
	private lastTop = -1;

	private updateViewInfo() {
		const newHeight = this.rootNode.height;
		if (this.viewHeight) {
			const newViewInfo = new ViewInfo(
				this.scrollTop,
				this.viewHeight!,
				this.dummyHeight,
				newHeight,
				0
			);

			const viewPortTop = newViewInfo.viewPortTop;
			const lastViewPortTop = this.lastTop;
			this.lastTop = viewPortTop;

			const viewPortBottom = viewPortTop + newViewInfo.viewPortLength;
			const isScrolledToBottom =
				newViewInfo.viewBottom - viewPortBottom < 1;

			this.isScrolledToBottom = isScrolledToBottom;
			this.wasScrolledToBottom =
				(this.wasScrolledToBottom &&
					lastViewPortTop === this.lastTop) ||
				isScrolledToBottom;

			if (this.props.onViewInfoChange) {
				this.props.onViewInfoChange(newViewInfo);
			}
		}
	}

	public scrollDown(options?: { animated?: boolean }) {
		this.scrollViewRef.current!.scrollTo({
			y: this.dummyHeight + this.rootNode.height! - this.viewHeight!,
			animated: !!(options || {}).animated,
		});
	}

	@observable
	private anchorMode:
		| { kind: 'manual' }
		| { kind: 'automatic'; mode: 'top' | 'bottom' } = {
		kind: 'automatic',
		mode: 'bottom',
	};

	@action
	public setAnchorMode(
		mode:
			| { kind: 'manual'; item: TItem }
			| { kind: 'automatic'; mode: 'top' | 'bottom' }
	) {
		if (mode.kind === 'manual') {
			const item = this.getItem(mode.item);
			const l = this.createLayoutWithDummyHeight(this.dummyHeight);
			this.anchor = {
				item: item,
				top: l.bottomToTop(item.offset, 0 * item.height),
				mode: 'bottom',
			};
		}
		this.anchorMode = mode;
	}

	private readonly handleItemLayout = (item: TItem, first: boolean) => {
		if (this.wasScrolledToBottom && !this.isScrolledToBottom) {
			setTimeout(() => {
				this.scrollDown({ animated: true });
			}, 0);
		}

		if (this.props.onItemLayout) {
			this.props.onItemLayout(item, first);
		}
	};

	private getItem(item: TItem): ItemInfo<TItem> {
		const key = item.id;
		let citem = this.itemInfos.get(key);
		if (!citem) {
			citem = new ItemInfo(item, this.handleItemLayout);
			this.itemInfos.set(key, citem);
		} else {
			citem.item = item;
		}
		return citem;
	}

	@computed
	private get rootNode(): Node<TItem> {
		const ids = new Set(this.itemInfos.keys());
		const rootNode = Node.create(
			this.props.items.map((i, idx) => {
				ids.delete(i.id);
				const ci = this.getItem(i);
				ci.index = idx;
				return ci;
			}),
			0,
			// skip the last node, it will be added later
			this.props.items.length - 1
		);
		for (const id of ids) {
			this.itemInfos.delete(id);
		}

		// add space before adding the last item
		rootNode.addChild(
			new Space(() => {
				if (!this.viewHeight) {
					return 0;
				}
				const height = rootNode.children.reduce(
					// dont call v.height for space elements as that
					// would cause an infinite recursion.
					(cur, v) => cur + (v.kind === 'Space' ? 0 : v.height),
					0
				);
				if (height < this.viewHeight) {
					const h = this.viewHeight - height;
					return h;
				}
				return 0;
			})
		);

		// add the last item
		if (this.props.items.length > 0) {
			rootNode.addChild(
				this.getItem(this.props.items[this.props.items.length - 1])
			);
		}

		return rootNode;
	}

	createLayoutWithDummyHeight(dummyHeight: number) {
		const layout = this.rootNode;
		return {
			layout,
			updateDummyHeight: (newValue: number) => (dummyHeight = newValue),
			bottomToTop: (bottom: number, itemHeight: number) =>
				layout.height - (bottom + itemHeight) + dummyHeight,
			topToBottom: (top: number, itemHeight: number) =>
				layout.height - (top + itemHeight) + dummyHeight,
		};
	}

	/**
	 * * The first render mounts the scroll div.
	 * * The second render mounts some item divs by using their guessed heights.
	 * * The third render renders these items again with their actual heights (if they changed).
	 *   This might force a scroll compensation.
	 * * The forth render fixes the scroll compensation.
	 */
	render(): React.ReactElement {
		const layout = this.createLayoutWithDummyHeight(this.dummyHeight);

		if (
			this.anchor &&
			// consider anchor only if view can be scrolled
			this.viewHeight &&
			this.viewHeight < layout.layout.height
		) {
			const anchorWithNewPosition = layout.layout.getBottomOf(
				this.anchor.item
			);
			if (anchorWithNewPosition) {
				let newAnchorTop = layout.bottomToTop(
					anchorWithNewPosition.bottom,
					this.anchor.mode === 'top'
						? anchorWithNewPosition.item.height
						: 0
				);
				const delta = this.anchor.top - newAnchorTop;
				// thus `new(anchor.top) + dummyHeight + delta = old(anchor.top) + dummyHeight`
				// for react native: > 2
				if (Math.abs(delta) > 0) {
					// This adjusts positioning so that
					// when anchor is rendered this time,
					// its top position matches the top position
					// of the last render.
					this.dummyHeight += delta;
					layout.updateDummyHeight(this.dummyHeight);
				}
			}
		}

		const visibleBottomRange: Range = {
			start: layout.topToBottom(this.scrollTop, this.viewHeight || 0),
			length: this.viewHeight || 0,
		};

		const renderBottomRange: Range = {
			start: visibleBottomRange.start - this.overscanHeight.top,
			length:
				visibleBottomRange.length +
				this.overscanHeight.top +
				this.overscanHeight.bottom,
		};

		// Don't render anything if we don't have the scroll div yet.
		// This would mess with initial scroll position.
		const itemsToRender =
			this.viewHeight !== undefined // TODO this special case is not needed
				? layout.layout.getItems(renderBottomRange)
				: [];

		if (this.viewHeight !== undefined) {
			if (this.props.onBeforeItemsRendered && itemsToRender.length > 0) {
				const firstIdx = itemsToRender[0].item.index;
				const lastIdx = last(itemsToRender)!.item.index;

				this.props.onBeforeItemsRendered({
					items: this.props.items,
					renderedRange: {
						start: firstIdx,
						length: lastIdx - firstIdx,
					},
					// TODO compute actual visible range
					visibleRange: {
						start: firstIdx,
						length: lastIdx - firstIdx,
					},
				});
			}
		}

		if (this.anchorMode.kind === 'automatic') {
			const possibleAnchorItems = itemsToRender.filter(
				i =>
					i.item.item.canBeUsedAsAnchor &&
					rangeIntersects(visibleBottomRange, {
						start: i.bottom,
						length: 1, //item.item.height
					})
			);

			if (this.anchorMode.mode === 'top') {
				possibleAnchorItems.reverse();
			}

			const anchorItem =
				possibleAnchorItems.find(i => i.item.hasPreciseHeight) ||
				possibleAnchorItems[0];

			if (anchorItem) {
				this.anchor = {
					item: anchorItem.item,
					top: layout.bottomToTop(
						anchorItem.bottom,
						this.anchorMode.mode === 'top'
							? anchorItem.item.height
							: 0
					),
					mode: this.anchorMode.mode,
				};
			} else {
				this.anchor = undefined;
			}
		}
		itemsToRender.reverse();

		const OffsetScrollView_ =
			this.props.OffsetScrollViewClass || OffsetScrollView;
		return (
			<XPView
				testId="ScrollView-Outer"
				style={{ flex: 1, minHeight: 0 }}
				onLayout={this.handleScrollViewLayout}
				xpResizeObserver={this.resizeObserver}
			>
				<OffsetScrollView_
					ref={this.scrollViewRef}
					style={{ flex: 1 }}
					contentOffsetY={this.dummyHeight}
					onScroll={this.handleScroll}
				>
					<XPView
						testId="ScrollView-Inner"
						style={{
							height: layout.layout.height + this.dummyHeight,
							flex: 1,
							position: 'relative',
						}}
					>
						{itemsToRender.map(item => (
							<XPView
								key={item.item.id}
								onLayout={item.item.handleLayout}
								xpResizeObserver={this.resizeObserver}
								style={{
									opacity:
										item.item.actualHeight === undefined
											? 1
											: 1,
									position: 'absolute',
									width: '100%',
									left: 0,
									top: layout.bottomToTop(
										item.bottom,
										item.item.height
									),
								}}
							>
								{item.item.render()}
							</XPView>
						))}
					</XPView>
				</OffsetScrollView_>
			</XPView>
		);
	}
}

abstract class NodeOrItemInfo<TItem extends SuperScrollViewItem> {
	public parent: Node<TItem> | undefined;

	get offset(): number {
		if (!this.parent) {
			return 0;
		}
		let offset = this.parent.offset;
		for (const c of this.parent.children) {
			if ((c as NodeOrItemInfo<TItem>) === this) {
				break;
			}
			offset += c.height;
		}
		return offset;
	}

	abstract get height(): number;
}

class Space<TItem extends SuperScrollViewItem> extends NodeOrItemInfo<TItem> {
	public readonly kind = 'Space';

	get height(): number {
		return this.heightFn();
	}

	constructor(private readonly heightFn: () => number) {
		super();
	}
}

interface PositionedItem<TItem extends SuperScrollViewItem> {
	item: ItemInfo<TItem>;
	bottom: number;
}

class Node<TItem extends SuperScrollViewItem> extends NodeOrItemInfo<TItem> {
	public static create<TItem extends SuperScrollViewItem>(
		items: ItemInfo<TItem>[],
		fromIdx: number,
		length: number
	): Node<TItem> {
		if (length < 15) {
			return new Node(items.slice(fromIdx, fromIdx + length));
		}

		let start = fromIdx;
		const nodes = new Array<Node<TItem>>();
		while (start < fromIdx + length) {
			const len = Math.min(
				Math.floor(length / 5),
				fromIdx + length - start
			);
			nodes.push(Node.create(items, start, len));
			start += len;
		}
		const result = new Node(nodes);
		return result;
	}

	public readonly kind = 'Node';

	public get children(): ReadonlyArray<
		Node<TItem> | ItemInfo<TItem> | Space<TItem>
	> {
		return this._children;
	}

	@computed
	get height(): number {
		let s = 0;
		for (const c of this.children) {
			s += c.height;
		}
		return s;
	}

	private constructor(
		private readonly _children: Array<
			Node<TItem> | ItemInfo<TItem> | Space<TItem>
		>
	) {
		super();

		for (const c of _children) {
			c.parent = this;
		}
	}

	addChild(child: Node<TItem> | ItemInfo<TItem> | Space<TItem>) {
		child.parent = this;
		this._children.push(child);
	}

	getBottomOf(
		itemToLookFor: ItemInfo<TItem>
	): PositionedItem<TItem> | undefined {
		return {
			bottom: itemToLookFor.offset,
			item: itemToLookFor,
		};
	}

	getItems(bottomRange: Range): PositionedItem<TItem>[] {
		const result = new Array<PositionedItem<TItem>>();
		let curBottom = 0;
		function traverse(node: Node<TItem> | ItemInfo<TItem> | Space<TItem>) {
			if (curBottom + node.height < bottomRange.start) {
				curBottom += node.height;
				return;
			}
			if (node.kind === 'ItemInfo') {
				result.push({ bottom: curBottom, item: node });
				curBottom += node.height;
			} else if (node.kind === 'Space') {
				curBottom += node.height;
			} else {
				for (const n of node.children) {
					if (curBottom > bottomRange.start + bottomRange.length) {
						return;
					}
					traverse(n);
				}
			}
		}
		traverse(this);
		return result;
	}
}

class ItemInfo<TItem extends SuperScrollViewItem> extends NodeOrItemInfo<
	TItem
> {
	public static layoutBatchProcessor = new BatchProcessor(5);

	public readonly kind = 'ItemInfo';

	@observable actualHeight: number | undefined = undefined;
	@computed get height(): number {
		if (this.actualHeight === undefined) {
			return this.item.estimatedHeight;
		}
		return this.actualHeight;
	}

	public get hasPreciseHeight(): boolean {
		return this.actualHeight !== undefined;
	}

	public parent: Node<TItem> | undefined;
	public index: number = -1;

	public get id() {
		return this.item.id;
	}

	constructor(
		public item: TItem,
		public readonly onLayout?: (item: TItem, first: boolean) => void
	) {
		super();
	}

	public render(): React.ReactElement {
		return this.item.render();
	}

	@action.bound
	handleLayout(newSize: { height: number; width: number }) {
		const height = newSize.height;
		// TODO: this can be 0 for web
		if (!this.actualHeight || Math.abs(this.actualHeight - height) > 1) {
			ItemInfo.layoutBatchProcessor.schedule(() => {
				if (this.onLayout) {
					this.onLayout(this.item, !this.actualHeight);
				}

				this.actualHeight = height;
			});
		}
	}
}
