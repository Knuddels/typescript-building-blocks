import * as React from 'react';
import { Model } from './Model';
import classnames = require('classnames');
import { observer, disposeOnUnmount } from 'mobx-react';

import { observable, ObservableSet, runInAction, action } from 'mobx';
import { LoremIpsumMessages } from './loremIpsum';

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	private scrollRef: HTMLDivElement | null = null;

	render() {
		const model = this.props.model;
		const msgs = LoremIpsumMessages.map(m => new Message(m));

		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					height: '100%',
				}}
			>
				<div>
					<input
						type="checkbox"
						onChange={e => this.updateTracking(e.target.checked)}
					/>
				</div>
				<div
					className="scrollbar"
					ref={this.setScrollDivRef}
					style={{ overflow: 'auto', flex: 1, position: 'relative' }}
					onMouseMove={e => this.handleMouseMove(e)}
				>
					<div
						style={{
							width: 100,
							height: 100,
							background: 'red',
							position: 'absolute',
							top: this.targetTop,
						}}
					></div>
					{msgs.map((m, idx) => (
						<MessageComponent key={idx} msg={m} />
					))}
				</div>
			</div>
		);
	}

	private shouldTrack = false;
	updateTracking(shouldTrack: boolean) {
		this.shouldTrack = shouldTrack;
	}

	private h: any;
	private clientY: number = 0;

	@observable
	private targetTop: number = 0;
	private time = 0;

	componentDidMount() {
		this.h = setInterval(() => {
			this.time++;
			this.targetTop = 100 + (1 + Math.sin(this.time / 50)) * 200;

			if (this.shouldTrack) {
				this.scrollRef!.scrollTo({
					top: this.targetTop,
					behavior: 'smooth',
				});
			}
		}, 10);
	}

	componentWillUnmount() {
		clearInterval(this.h);
	}

	handleMouseMove(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		this.clientY = e.clientY;
		/*
		const top = this.scrollRef!.getBoundingClientRect()!.top;
		const y = this.clientY - top;
		this.scrollRef!.scrollTo({
			top: 1000 - y,
			behavior: 'smooth',
		});*/
	}

	@action.bound
	setScrollDivRef(scrollRef: HTMLDivElement | null) {
		this.scrollRef = scrollRef;
	}
}

class Message {
	constructor(public readonly text: string) {}
}

export class MessageComponent extends React.Component<{ msg: Message }> {
	render() {
		return (
			<div
				style={{
					border: '1px solid',
					padding: 10,
					margin: 5,
					background: 'lightgray',
				}}
			>
				{this.props.msg.text}
			</div>
		);
	}
}
