/**
 * This class wraps a string and protects it from being printed to the console or to any other logs.
 */
export class SecureString {
	public readonly getValue: () => string;

	constructor(value: string) {
		this.getValue = () => {
			return value;
		};
	}
	public isEmpty(): boolean {
		return this.getValue() === '';
	}
}
