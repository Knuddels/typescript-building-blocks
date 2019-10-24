import { serverContract, port, scopeType, ActionId } from './shared';
import { asCodePosition, CodePositionRevealer } from './utils/codePosition';
import WebSocket = require('ws');
import { WebSocketStream } from '@hediet/typed-json-rpc-websocket';
import handler = require('serve-handler');
import http = require('http');
import { join } from 'path';
import { DiagnosticData } from './shared';

interface ClientInfo {
	client: typeof serverContract.TClientInterface;
}

export interface ServerBackend {
	setFormat(
		scopeName: string,
		lang: string,
		formatId: string,
		format: string
	): Promise<void>;

	applyActions(actions: ActionId[]): Promise<void>;
}

export class Server {
	private clients = new Set<ClientInfo>();

	private lastScopes: (typeof scopeType['_A'])[] | undefined = undefined;
	private lastDiagnostics: (DiagnosticData)[] | undefined = undefined;

	constructor(
		private readonly codePositionRevealer: CodePositionRevealer,
		private readonly dist: string,
		backend: ServerBackend
	) {
		const server = http.createServer((request, response) => {
			return handler(request, response, {
				public: dist,
			});
		});

		server.listen(port, () => {
			console.log(`Running at http://localhost:${port}`);
		});

		const wss = new WebSocket.Server({ server });

		wss.on('connection', async ws => {
			const stream = new WebSocketStream(ws);

			const { client } = serverContract.registerServerToStream(
				stream,
				undefined,
				{
					revealCodePosition: async ({ codePosition }) => {
						await codePositionRevealer.revealCodePosition(
							asCodePosition(codePosition)
						);
					},
					setFormat: async ({
						scopeName,
						lang,
						formatId,
						format,
					}) => {
						await backend.setFormat(
							scopeName,
							lang,
							formatId,
							format!
						);
					},
					applyActions: async ({ actions }) => {
						await backend.applyActions(actions);
					},
				}
			);
			const clientInfo: ClientInfo = {
				client,
			};

			if (this.lastScopes) {
				client.dataUpdated({ scopes: this.lastScopes });
			}

			if (this.lastDiagnostics) {
				client.diagnosticsUpdated({
					diagnostics: this.lastDiagnostics,
				});
			}

			this.clients.add(clientInfo);
			try {
				await stream.onClosed;
			} finally {
				this.clients.delete(clientInfo);
			}
		});
	}

	public publishData(scopes: (typeof scopeType['_A'])[]) {
		this.lastScopes = scopes;

		for (const client of this.clients) {
			client.client.dataUpdated({ scopes });
		}
	}

	public publishDiagnostics(diagnostics: DiagnosticData[]) {
		this.lastDiagnostics = diagnostics;

		for (const client of this.clients) {
			client.client.diagnosticsUpdated({ diagnostics });
		}
	}
}
