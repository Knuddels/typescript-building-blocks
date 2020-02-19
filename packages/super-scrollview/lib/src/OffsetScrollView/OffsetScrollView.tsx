import React from 'react';
import { runInAction, observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { XPStyle } from '../XP/XPStyle';

@observer
export class OffsetScrollView extends React.Component<{
	contentOffsetY: number;
	onScroll?: (args: {
		x: number;
		y: number;
		xVelocity: number;
		yVelocity: number;
	}) => void;
	style: XPStyle;
}> {
	@observable private currentContentOffset = 0;
	private lastContentOffset: number | undefined = undefined;
	private readonly scrollViewRef = React.createRef<HTMLDivElement>();

	private scrollTop = 0;
	public scrollTarget: number | undefined = undefined;
	private isScrollingActiveTimeout: any = undefined;

	public scrollTo(arg: { y: number; animated: boolean }) {
		const translatedY = arg.y - this.currentContentOffset;
		this.scrollViewRef.current!.scroll({
			top: translatedY,
			behavior: arg.animated ? 'smooth' : 'auto',
		});

		this.scrollTop = translatedY;
		if (!arg.animated && this.props.onScroll) {
			this.props.onScroll({
				x: 0,
				y: arg.y,
				xVelocity: 0,
				yVelocity: 0,
			});
		}
	}

	componentDidMount() {
		this.lastContentOffset = this.props.contentOffsetY;
		this.debouncedFixScroll();
	}

	componentDidUpdate() {
		this.debouncedFixScroll();
	}

	private debouncedFixScroll() {
		if (this.isScrollingActiveTimeout) {
			clearTimeout(this.isScrollingActiveTimeout);
		}

		this.isScrollingActiveTimeout = setTimeout(() => {
			this.isScrollingActiveTimeout = undefined;
			// debounced, so that it does not mess with active scroll animations.
			this.fixScrollCompensation();
		}, 300);
	}

	private fixScrollCompensation() {
		let scrollTo: number | undefined = undefined;

		console.log(
			'fixScrollCompensation',
			this.props.contentOffsetY - this.lastContentOffset!
		);
		//return;

		runInAction(() => {
			this.currentContentOffset = this.props.contentOffsetY;

			const scrollOffset =
				this.currentContentOffset - this.lastContentOffset!;
			if (Math.abs(scrollOffset) <= 0.1) {
				return;
			}

			const newScrollY = this.scrollTop - scrollOffset;

			this.lastContentOffset = this.currentContentOffset;
			this.scrollTop = newScrollY;
			this.scrollTarget = newScrollY;
			scrollTo = newScrollY;
		});

		if (scrollTo !== undefined) {
			this.scrollViewRef.current!.scroll({
				top: scrollTo,
				behavior: 'auto',
			});
		}
	}

	private readonly handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
		const newTop = this.scrollViewRef.current!.scrollTop;

		if (this.scrollTarget && Math.abs(newTop - this.scrollTarget) < 0.5) {
			this.scrollTop = this.scrollTarget;
			this.scrollTarget = undefined;
		} else {
			this.scrollTop = newTop;
		}

		if (this.props.onScroll) {
			this.props.onScroll({
				x: 0,
				y: this.scrollTop + this.currentContentOffset,
				xVelocity: 0, //event.nativeEvent.velocity!.x,
				yVelocity: 0, //event.nativeEvent.velocity!.y,
			});
		}

		this.debouncedFixScroll();
	};

	render(): React.ReactNode {
		return (
			<div
				ref={this.scrollViewRef}
				style={{
					display: 'flex',
					...this.props.style,
					overflow: 'auto',
				}}
				onScroll={this.handleScroll}
			>
				<div
					style={{
						display: 'flex',
						flex: 1,
						marginTop: -this.currentContentOffset,
					}}
				>
					{this.props.children}
				</div>
			</div>
		);
	}
}
