import { observable, computed } from 'mobx';
import { WebSocketStream } from '@hediet/typed-json-rpc-websocket';
import { scopeType, serverContract, port } from '@format-editor/cli';
import { wait } from '@hediet/std/timer';

export class Model {
	constructor() {
		this.init();
	}

	@observable public data: (typeof scopeType['_A'])[] | undefined = undefined;

	private server:
		| typeof serverContract.TServerInterface
		| undefined = undefined;

	public revealCodePosition(codePosition: string) {
		if (this.server) {
			this.server.revealCodePosition({ codePosition });
		}
	}

	public async updateFormat(
		scopeName: string,
		lang: string,
		formatId: string,
		format: string | null
	): Promise<void> {
		if (this.server) {
			await this.server.setFormat({
				scopeName,
				lang,
				formatId,
				format,
			});
		}
	}

	@observable connectionState:
		| { kind: 'connected' }
		| { kind: 'connecting' }
		| { kind: 'disconnected' }
		| { kind: 'error'; error: string } = { kind: 'connecting' };

	async init(): Promise<void> {
		while (true) {
			this.connectionState = { kind: 'connecting' };
			try {
				const stream = await WebSocketStream.connectTo({
					host: 'localhost',
					port,
				});
				this.connectionState = { kind: 'connected' };
				const { server } = serverContract.getServerFromStream(
					stream,
					undefined,
					{
						dataUpdated: ({ scopes }) => {
							this.data = scopes;
						},
					}
				);
				this.server = server;

				await stream.onClosed;
				this.connectionState = { kind: 'disconnected' };
			} catch (e) {
				this.connectionState = { kind: 'error', error: e };
			}
			this.server = undefined;
			await wait(3000);
		}
	}
}
