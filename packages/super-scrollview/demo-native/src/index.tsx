import React from 'react';
import {
	StyleSheet,
	Text,
	View,
	ScrollView,
	Button,
	FlatList,
} from 'react-native';
import { configure, observable, action, runInAction } from 'mobx';
import { observer } from 'mobx-react';
//import { SuperScrollView } from '@knuddels/super-scrollview';
import { Message, MessageStore } from './store';
import { LoremIpsumMessages } from './loremIpsum';

import MessageQueue from 'react-native/Libraries/BatchedBridge/MessageQueue';
/*
const spyFunction = msg => {
	console.log('spy', msg);
};

MessageQueue.spy(spyFunction);
*/

@observer
export class App extends React.Component {
	constructor(props: any) {
		super(props);
		this.store = new MessageStore();
		for (let i = 0; i < 5; i++) {
			this.store.loadMessage();
		}
	}

	private store: MessageStore;

	private s: ScrollView | null = null;

	setScrollViewRef(r: ScrollView | null) {
		if (r) {
			this.s = r;
		}
	}

	private h: any;

	private t = 0;

	componentDidMount() {
		this.h = true;
		return;
		const m = () => {
			requestAnimationFrame(() => {
				this.t++;
				if (this.s) {
					this.s.scrollTo({
						y: Math.sin(this.t / 10) * 200 + 500,
						animated: false,
					});
				}
				if (this.h) {
					m();
				}
			});
		};

		m();
	}

	componentWillUnmount() {
		this.h = undefined;
		//clearInterval(this.h);
	}

	render() {
		//return <Text>uaa</Text>;
		const s = this.store;
		const l = LoremIpsumMessages;

		return (
			<View style={{ flexDirection: 'column', flex: 1, marginTop: 24 }}>
				<View style={{ flex: 1 }}>
					<View style={{}}>
						<Button
							title="Add Messagaae"
							onPress={() => s.addMessage()}
						/>
					</View>
					<View style={{}}>
						<Button
							title="Load Message"
							onPress={() => s.loadMessage()}
						/>
					</View>
					<ScrollView ref={r => this.setScrollViewRef(r)} style={{}}>
						{l.map((m, idx) => (
							<Message2Component key={idx} text={m} />
						))}
					</ScrollView>
				</View>
			</View>
		);
	}
}

@observer
class Message2Component extends React.Component<{ text: string }> {
	render() {
		const item = this.props.text;
		return (
			<View
				style={{
					borderColor: 'black',
					borderStyle: 'solid',
					borderWidth: 1,
					padding: 10,
					margin: 2,
					alignSelf: 'stretch',
					flex: 1,
				}}
			>
				<Text>{item}</Text>
			</View>
		);
	}
}

/*
					<SuperScrollView<Message>
						ref={s.ref}
						items={s.contacts}
						virtualize={item =>
							item !== s.contacts[s.contacts.length - 1]
						}
						onItemLayout={item => s.onLayout.emit({ item: item })}
						renderItem={item => {
							if (item === s.contacts[s.contacts.length - 1]) {
								return (
									<View
										style={{
											backgroundColor: 'red',
											height: 100,
										}}
									>
										<Text>{'first'}</Text>
									</View>
								);
							}
							return <MessageComponent item={item} />;
						}}
						getKey={item => `id${item.id}`}
					/>
					*/

@observer
class MessageComponent extends React.Component<{ item: Message }> {
	@observable hide = !this.props.item.shown;

	componentDidMount() {
		runInAction(() => {
			this.props.item.shown = true;
			this.hide = false;
		});
	}

	render() {
		const item = this.props.item;
		return (
			<View
				style={{
					borderColor: 'black',
					borderStyle: 'solid',
					borderWidth: 1,
					padding: 10,
					margin: 2,
					alignSelf: 'stretch',
					backgroundColor:
						this.props.item.id % 10 === 0 ? 'red' : 'white',
					flex: 1,

					/*left: this.hide ? 100 : 0,
					opacity: this.hide ? 0 : 1*/
				}}
			>
				<Text>{item.text}</Text>
			</View>
		);
	}
}
