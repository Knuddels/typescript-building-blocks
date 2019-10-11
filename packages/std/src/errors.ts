/**
 * When this error is thrown, there is a bug.
 * This error should not be catched.
 */
export class BugIndicatingError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, BugIndicatingError.prototype);

		// Use this debugger statement to find the bug.
		// Without, it might be hard to understand the context
		// if the error is catched an rethrown.
		// tslint:disable: no-debugger
		// eslint-disable-next-line no-debugger
		debugger;
	}
}

export function expectUnreachable(x: never): never {
	throw new BugIndicatingError(
		`Didn't expect to get here. Used discriminator: ${JSON.stringify(x)}`
	);
}

export function shouldBeUnreachable(x: never): void {
	console.warn(
		`Didn\'t expect to get here. Used discriminator: ${JSON.stringify(x)}`
	);
}

/**
 * Indicates that code that thought to be unreachable was executed.
 */
export class UnreachableError extends BugIndicatingError {
	constructor() {
		super("Didn't expect to get here.");
	}
}

/**
 * Indicates that a property has been accessed at runtime whose purpose was only providing types.
 */
export class DontUseThisMemberInANonTypePositionError extends BugIndicatingError {
	constructor() {
		super(
			'Do not use this member in a non-type position. It is only meant for typing.'
		);
	}
}
