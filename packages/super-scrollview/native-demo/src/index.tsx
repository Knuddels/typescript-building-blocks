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
import { SuperScrollView } from '@knuddels/super-scrollview';
import { Message, MessageStore } from './store';

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

	render() {
		//return <Text>uaa</Text>;
		const s = this.store;

		return (
			<View style={{ flexDirection: 'column', flex: 1, marginTop: 24 }}>
				<View style={{ flex: 1 }}>
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
					<View style={{}}>
						<Button
							title="Add Message"
							onPress={() => s.addMessage()}
						/>
					</View>
					<View style={{}}>
						<Button
							title="Load Message"
							onPress={() => s.loadMessage()}
						/>
					</View>
				</View>
			</View>
		);
	}
}

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
