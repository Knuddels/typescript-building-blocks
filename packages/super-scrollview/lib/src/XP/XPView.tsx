import React from 'react';
import { XPResizeObserver } from './XPResizeObserver';
import { Disposable } from '@knuddels/std';
import { XPStyle } from './XPStyle';

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
	private readonly divRef = React.createRef<HTMLDivElement>();
	private disposable: Disposable | undefined;

	render() {
		const { style, children } = this.props;
		return (
			<div
				className={this.props.testId}
				ref={this.divRef}
				style={{ display: 'flex', flexDirection: 'column', ...style }}
			>
				{children}
			</div>
		);
	}

	private getSize(): { height: number; width: number } {
		const div = this.divRef.current!;
		const rect = div.getBoundingClientRect();
		return { height: rect.height, width: rect.width };
	}

	componentDidMount() {
		const div = this.divRef.current!;

		if (this.props.onLayout) {
			this.props.onLayout(this.getSize());
		}

		if (this.props.xpResizeObserver) {
			this.props.xpResizeObserver.observe(div);
			this.disposable = this.props.xpResizeObserver.onSizeChanged.sub(
				() => {
					if (this.props.onLayout) {
						this.props.onLayout(this.getSize());
					}
				}
			);
		}
	}

	componentWillUnmount() {
		if (this.disposable) {
			this.disposable.dispose();
		}
	}
}
