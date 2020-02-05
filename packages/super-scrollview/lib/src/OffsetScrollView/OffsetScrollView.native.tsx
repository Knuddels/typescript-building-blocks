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
	@observable private currentContentOffsetY = 0;
	private lastContentOffset: number | undefined = undefined;
	private readonly scrollViewRef = React.createRef<ScrollView>();
	private currentScrollTop = 0;
	private isScrollingActiveTimeout: any = undefined;

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
						marginTop: -this.currentContentOffsetY,
					}}
				>
					{this.props.children}
				</View>
			</ScrollView>
		);
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
		this.currentContentOffsetY = this.props.contentOffsetY;

		const scrollOffset =
			this.currentContentOffsetY - this.lastContentOffset!;
		if (Math.abs(scrollOffset) <= 0.1) {
			return;
		}

		const newScrollY = this.currentScrollTop - scrollOffset;

		setTimeout(() => {
			this.scrollViewRef.current!.scrollTo({
				y: newScrollY,
				animated: false,
			});
		}, 0);

		this.lastContentOffset = this.currentContentOffsetY;
		this.currentScrollTop = newScrollY;
	}

	private readonly handleScroll = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	) => {
		const newTop = event.nativeEvent.contentOffset.y;
		this.handleScrollEx(
			newTop,
			event.nativeEvent.velocity!.x,
			event.nativeEvent.velocity!.y
		);
	};

	private handleScrollEx(
		newScrollTop: number,
		velocityX: number,
		velocityY: number
	) {
		this.currentScrollTop = newScrollTop;

		if (this.props.onScroll) {
			this.props.onScroll({
				x: 0,
				y: this.currentScrollTop + this.currentContentOffsetY,
				xVelocity: velocityX,
				yVelocity: velocityY,
			});
		}

		this.debouncedFixScroll();
	}

	public scrollTo(arg: { y: number; animated: boolean }) {
		if (!this.scrollViewRef.current) {
			return;
		}
		const translatedY = arg.y - this.currentContentOffsetY;
		this.scrollViewRef.current!.scrollTo({
			y: translatedY,
			animated: arg.animated,
		});
		if (!arg.animated) {
			this.currentScrollTop = translatedY;
		}
		this.handleScrollEx(this.currentScrollTop, 0, 0);
	}
}
