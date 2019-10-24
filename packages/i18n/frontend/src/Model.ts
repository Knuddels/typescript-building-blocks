import { observable, computed, ObservableSet } from 'mobx';
import { WebSocketStream } from '@hediet/typed-json-rpc-websocket';
import {
	scopeType,
	serverContract,
	port,
	DiagnosticData,
	ActionId,
} from '@knuddels/i18n-cli';
import { wait } from '@hediet/std/timer';

export class DiagnosticInfo {
	constructor(public readonly diagnostic: DiagnosticData) {}

	@observable selected: boolean = true;
	@observable defaultActionIdx: number = 0;

	get defaultAction(): DiagnosticData['fixes'][0] | undefined {
		return this.diagnostic.fixes[this.defaultActionIdx];
	}
}

export class Model {
	constructor() {
		this.init();
	}

	@observable public data: (typeof scopeType['_A'])[] | undefined = undefined;

	@observable public diagnostics: DiagnosticData[] = [];

	@observable activePanel: 'Formats' | 'CodeIssues' = 'Formats';

	@computed
	public get diagnosticInfos(): DiagnosticInfo[] {
		return this.diagnostics.map(d => new DiagnosticInfo(d));
	}

	fixSelected() {
		const actions = this.diagnosticInfos
			.filter(i => i.selected)
			.map(i => i.defaultAction)
			.filter((a): a is ActionId => a !== undefined);
		if (this.server) {
			this.server.applyActions({ actions });
		}
	}

	public readonly filteredScopes = new ObservableSet<
		typeof scopeType['_A']
	>();

	public shouldShowScope(scope: typeof scopeType['_A']) {
		if (this.filteredScopes.size === 0) {
			return true;
		}
		return [...this.filteredScopes].some(s => s.name === scope.name);
	}

	public readonly filteredLanguages = new ObservableSet<string>();

	public shouldShowLanguage(scope: typeof scopeType['_A']) {
		if (this.filteredLanguages.size === 0) {
			return true;
		}
		return this.filteredLanguages.has(scope);
	}

	private server:
		| typeof serverContract.TServerInterface
		| undefined = undefined;

	public revealCodePosition(codePosition: string) {
		if (this.server) {
			this.server.revealCodePosition({ codePosition });
		}
	}

	applyActions(actions: ActionId[]) {
		if (this.server) {
			this.server.applyActions({
				actions,
			});
		}
	}

	public async updateFormat(
		scopeName: string,
		lang: string,
		formatId: string,
		format: string | null
	): Promise<void> {
		if (this.server) {
			this.data!.find(s => s.name === scopeName)!
				.packages.find(pkg => pkg.lang === lang)!
				.formats.find(f => f.id === formatId)!.format = format;
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
						diagnosticsUpdated: async ({ diagnostics }) => {
							console.log(diagnostics);
							this.diagnostics = diagnostics;
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
