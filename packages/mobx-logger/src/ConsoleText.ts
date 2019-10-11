export type ConsoleText =
	| ConsoleTextArray
	| { text: string; style: string; data?: Record<string, unknown> }
	| { data: Record<string, unknown> };

export interface ConsoleTextArray extends Array<ConsoleText> {}

export function renderConsoleText(text: ConsoleText): any[] {
	const styles = new Array<any>();
	const initial = {};
	const data = initial;
	let firstArg = '';

	function render(t: ConsoleText): void {
		if ('length' in t) {
			for (const item of t) {
				render(item);
			}
		} else if ('text' in t) {
			firstArg += `%c${t.text}`;
			styles.push(t.style);
			if (t.data) {
				Object.assign(data, t.data);
			}
		} else if ('data' in t) {
			Object.assign(data, t.data);
		}
	}

	render(text);

	const result = [firstArg, ...styles];
	if (Object.keys(data).length > 0) {
		result.push(data);
	}

	return result;
}

export function normalText(text: string): ConsoleText {
	return styled(text, { color: 'black' });
}

export function formatName(name: string): ConsoleText {
	return styled(`(${name})`, { color: 'gray' });
}

export function styled(
	text: string,
	options: { color: string; strikeThrough?: boolean; bold?: boolean } = {
		color: 'black',
	}
): ConsoleText {
	function objToCss(styleObj: Record<string, string>): string {
		return Object.entries(styleObj).reduce(
			(styleString, [propName, propValue]) => {
				return `${styleString}${propName}:${propValue};`;
			},
			''
		);
	}

	const style: Record<string, string> = {
		color: options.color,
	};
	if (options.strikeThrough) {
		style['text-decoration'] = 'line-through';
	}
	if (options.bold) {
		style['font-weight'] = 'bold';
	}

	return {
		text,
		style: objToCss(style),
	};
}
