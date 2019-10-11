import * as mobxTypes from 'mobx';
import { MobxSpyEvent } from './MobxSpyEvent';
import {
	ConsoleText,
	styled,
	renderConsoleText,
	normalText,
	formatName,
} from './ConsoleText';
import { formatValue } from './formatValue';

export interface MobxConsoleLoggerOptions {
	/**
	 * Uses console.group to group entries.
	 * Causes issues when using text filters in console view as chrome and firefox always show all groups.
	 */
	useGroups: boolean;
	/**
	 * Disables delaying of groups.
	 * Groups are delayed until the next log entry so that empty groups are rendered as plain text.
	 */
	disableDelayGroups: boolean;
	groupsDefaultOpen: boolean;
}

export class MobxConsoleLogger {
	private indentation = 0;
	private spyDisposer: mobxTypes.Lambda;
	private readonly options: MobxConsoleLoggerOptions;

	constructor(
		private readonly mobx: typeof mobxTypes,
		options: Partial<MobxConsoleLoggerOptions> = {}
	) {
		this.spyDisposer = mobx.spy(event => this.handleMobxEvent(event));
		this.options = Object.assign(
			{
				useGroups: false,
				disableDelayGroups: false,
				groupsDefaultOpen: false,
			},
			options
		);
	}

	public dispose(): void {
		this.spyDisposer();
	}

	private logText(text: ConsoleText): void {
		this.flushParentGroup(true);
		console.debug(...this.renderTextToArgs(text));
	}

	public log(text: string): void {
		this.logText({ style: '', text });
	}

	private startGroup(text: ConsoleText): void {
		this.flushParentGroup(true);
		if (this.options.useGroups) {
			this.uncommittedGroupText = {
				args: this.renderTextToArgs(text),
			};
			if (this.options.disableDelayGroups) {
				this.flushParentGroup(true);
			}
		} else {
			this.logText(text);
		}
		this.indentation++;
	}

	private renderTextToArgs(text: ConsoleText): any[] {
		if (this.options.useGroups) {
			return renderConsoleText(text);
		}
		return renderConsoleText([
			normalText(repeat('|  ', this.indentation)),
			text,
		]);
	}

	private endGroup() {
		if (!this.flushParentGroup(false)) {
			// parent group was already flushed => must be a proper group
			if (this.options.useGroups) {
				console.groupEnd();
			}
		}
		this.indentation--;
	}

	private uncommittedGroupText: { args: any[] } | undefined = undefined;

	private flushParentGroup(hasChildren: boolean): boolean {
		if (!this.uncommittedGroupText) {
			return false;
		}
		if (hasChildren) {
			if (this.options.groupsDefaultOpen) {
				console.group(...this.uncommittedGroupText.args);
			} else {
				console.groupCollapsed(...this.uncommittedGroupText.args);
			}
		} else {
			console.debug(...this.uncommittedGroupText.args);
		}
		this.uncommittedGroupText = undefined;
		return true;
	}

	private handleMobxEvent(event: MobxSpyEvent): void {
		if ('spyReportStart' in event) {
			if (event.type === 'add' || event.type === 'update') {
				this.startGroup([
					formatKind(event.type === 'add' ? 'init' : 'update'),
					normalText(
						`${formatOwningObj(event.object)}.${event.key} -> `
					),
					...(event.type === 'update'
						? [
								styled(formatValue(event.oldValue, 70), {
									color: 'red',
									strikeThrough: true,
								}),
								normalText(` `),
						  ]
						: []),
					styled(formatValue(event.newValue, 60), {
						color: event.type === 'add' ? 'blue' : 'green',
					}),
					normalText(' '),
					formatName(event.name),
					{
						data: {
							object: event.object,
							newValue: this.mobx.toJS(event.newValue),
						},
					},
				]);
			} else if (event.type === 'action') {
				this.startGroup([
					formatKind('action'),
					styled(event.name, { color: 'BlueViolet' }),
					{
						data: { args: event.arguments },
					},
				]);
			} else if (event.type === 'reaction') {
				this.startGroup([
					formatKind('reaction'),
					styled(event.name, { color: 'BlueViolet' }),
				]);
			} else {
				const _nvr: never = event;
			}
		} else if ('spyReportEnd' in event) {
			this.endGroup();
		} else if (event.type === 'compute') {
			this.logText([
				formatKind('compute'),
				normalText(`${formatOwningObj(event.object)} `),
				formatName(event.name),
			]);
		} else if (event.type === 'scheduled-reaction') {
			this.logText([
				formatKind('scheduled-reaction'),
				normalText(`${event.name}`),
			]);
		} else {
			const _nvr: never = event;
		}
	}
}

function formatOwningObj(obj: unknown): string {
	if (!obj) {
		return 'nullish';
	}
	const proto = Object.getPrototypeOf(obj);
	if (proto) {
		return proto.constructor.name;
	}

	return '?';
}

function formatKind(kind: string): ConsoleText {
	return styled(padStr(`${kind}: `, 10), { color: 'black', bold: true });
}

function repeat(str: string, count: number): string {
	let result = '';
	for (let i = 1; i <= count; i++) {
		result += str;
	}
	return result;
}

function padStr(str: string, length: number): string {
	while (str.length < length) {
		str += ' ';
	}
	return str;
}
