import React from 'react';
import { XPResizeObserver } from './XPResizeObserver';
import { XPStyle } from './XPStyle';
import { View, LayoutChangeEvent } from 'react-native';

export type XPLayoutEventArgs = { height: number; width: number };

export class XPView extends React.Component<{
	testId?: string;
	style: XPStyle;
	/**
	 * Is called when initial size is known and on every resize.
	 */
	onLayout?: (args: XPLayoutEventArgs) => void;
	xpResizeObserver?: XPResizeObserver;
}> {
	render() {
		const { style, children } = this.props;
		return (
			<View
				onLayout={this.handleLayout}
				style={{ display: 'flex', flexDirection: 'column', ...style }}
			>
				{children}
			</View>
		);
	}

	private readonly handleLayout = (e: LayoutChangeEvent) => {
		if (this.props.onLayout) {
			const l = e.nativeEvent.layout;
			this.props.onLayout({ height: l.height, width: l.width });
		}
	};
}
