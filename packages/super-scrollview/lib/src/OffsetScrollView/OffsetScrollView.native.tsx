import React from 'react';
import {
	ScrollView,
	View,
	NativeSyntheticEvent,
	NativeScrollEvent,
} from 'react-native';
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
	private readonly scrollViewRef = React.createRef<ScrollView>();

	private scrollTop = 0;
	private scrollTarget: number | undefined = undefined;
	private isScrollingActiveTimeout: any = undefined;

	public scrollTo(arg: { y: number; animated: boolean }) {
		const translatedY = arg.y - this.currentContentOffset;
		this.scrollViewRef.current!.scrollTo({
			y: translatedY,
			animated: arg.animated,
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
			runInAction('update scroll position', () => {
				this.isScrollingActiveTimeout = undefined;
				// debounced, so that it does not mess with active scroll animations.
				this.fixScrollCompensation();
			});
		}, 300);
	}

	@action
	private fixScrollCompensation() {
		this.currentContentOffset = this.props.contentOffsetY;

		const scrollOffset =
			this.currentContentOffset - this.lastContentOffset!;
		if (Math.abs(scrollOffset) <= 0.1) {
			return;
		}

		const newScrollY = this.scrollTop - scrollOffset;

		setTimeout(() => {
			this.scrollViewRef.current!.scrollTo({
				y: newScrollY,
				animated: false,
			});
		}, 0);

		this.lastContentOffset = this.currentContentOffset;
		this.scrollTop = newScrollY;
		this.scrollTarget = newScrollY;
	}

	private readonly handleScroll = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	) => {
		const newTop = event.nativeEvent.contentOffset.y;
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
				xVelocity: event.nativeEvent.velocity!.x,
				yVelocity: event.nativeEvent.velocity!.y,
			});
		}

		this.debouncedFixScroll();
	};

	render(): React.ReactNode {
		return (
			<ScrollView
				ref={this.scrollViewRef}
				style={this.props.style}
				onScroll={this.handleScroll}
				onMomentumScrollEnd={this.handleScroll}
			>
				<View
					style={{
						flex: 1,
						marginTop: -this.currentContentOffset,
					}}
				>
					{this.props.children}
				</View>
			</ScrollView>
		);
	}
}
