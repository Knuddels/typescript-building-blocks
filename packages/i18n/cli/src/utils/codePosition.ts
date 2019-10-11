import ts = require('typescript');
import { exec } from 'child_process';
import { connectToVsCode, revealTextContract } from 'vscode-rpc';
import { GlobalTokenStore } from 'vscode-rpc/dist/FileTokenStore';

export type CodePosition = string & { tag: 'CodePosition' };
interface CodePositionObj {
	fileName: string;
	startOffset: number;
	endOffset: number;
}

export function asCodePosition(pos: string): CodePosition {
	return pos as any;
}

function serialize(obj: CodePositionObj): CodePosition {
	return asCodePosition(JSON.stringify(obj));
}

function deserialize(obj: CodePosition): CodePositionObj {
	return JSON.parse(obj) as CodePositionObj;
}

export function getPositionFromNode(node: ts.Node): CodePosition {
	const fileName = node.getSourceFile().fileName;
	return serialize({
		fileName,
		startOffset: node.pos,
		endOffset: node.end,
	});
}

export interface CodePositionRevealer {
	revealCodePosition(pos: CodePosition): Promise<void>;
}

export class GenericCodePositionRevealer implements CodePositionRevealer {
	async revealCodePosition(pos: CodePosition): Promise<void> {
		function getCommandLine() {
			switch (process.platform) {
				case 'darwin':
					return 'open';
				case 'win32':
					return 'start';
				default:
					return 'xdg-open';
			}
		}

		const data = deserialize(pos);
		exec(`${getCommandLine()} ${data.fileName}`);
	}
}

export class VSCodeRpcCodePositionRevealer implements CodePositionRevealer {
	private server: typeof revealTextContract.TServerInterface | undefined;

	async revealCodePosition(pos: CodePosition): Promise<void> {
		if (!this.server) {
			try {
				const v = await connectToVsCode({
					tokenStore: new GlobalTokenStore('Code-Viewer'),
					appName: 'Code-Viewer',
				});
				const { server } = revealTextContract.getServer(v.channel, {});
				this.server = server;
			} catch (e) {
				console.error(e);
			}
		}

		if (this.server) {
			const data = deserialize(pos);
			this.server.revealText({
				fileName: data.fileName,
				range: {
					start: {
						offset: data.startOffset,
					},
					end: {
						offset: data.endOffset,
					},
				},
			});
		}
	}
}
