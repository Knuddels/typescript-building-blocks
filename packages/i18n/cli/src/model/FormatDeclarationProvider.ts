import { hotClass, registerUpdateReconciler } from '@hediet/node-reload';
import * as ts from 'typescript';
import { Provider } from './Provider';
import { SimpleCache } from '../utils/SimpleCache';
import { computed } from 'mobx';

export class FormatDeclaration {
	private _fileName: string | undefined = undefined;

	constructor(
		public readonly id: string,
		public readonly node: ts.Node,
		public readonly defaultFormat: string | null
	) {}

	public get fileName() {
		if (!this._fileName) {
			this._fileName = this.node.getSourceFile().fileName;
		}
		return this._fileName;
	}
}

export function getAllDeclaredFormats(p: ts.Program): FormatDeclaration[] {
	return new Main().getAllDeclaredFormats(p);
}

export function getDeclaredFormats(sf: ts.SourceFile): FormatDeclaration[] {
	return new Main().getDeclaredFormats(sf);
}

export class FormatDeclarationProvider {
	constructor(private readonly programProvider: Provider<ts.Program>) {}

	private readonly cache = new SimpleCache<
		ts.SourceFile,
		FormatDeclaration[]
	>((sf) => (sf as any).version || sf.fileName);

	@computed
	public get formatDeclarations(): FormatDeclaration[] {
		const prog = this.programProvider.get();
		const m = new Main();
		const result = new Array<FormatDeclaration>();
		for (const sf of prog.getSourceFiles()) {
			result.push(
				...this.cache.getEntry(sf, (sf) => m.getDeclaredFormats(sf))
			);
		}
		return result;
	}
}

registerUpdateReconciler(module);

function undefinedToNull<T>(val: T | undefined): T | null {
	if (val === undefined) {
		return null;
	}
	return val;
}

@hotClass(module)
class Main {
	public getAllDeclaredFormats(p: ts.Program): FormatDeclaration[] {
		const formats = new Array<FormatDeclaration>();
		for (const sf of p.getSourceFiles()) {
			const f = this.getDeclaredFormats(sf);
			formats.push(...f);
		}

		return formats;
	}

	public getDeclaredFormats(sf: ts.SourceFile): FormatDeclaration[] {
		const result = new Array<FormatDeclaration>();

		const visitNode = (node: ts.Node) => {
			node.forEachChild((c) => {
				visitNode(c);
			});

			if (ts.isCallExpression(node)) {
				const match = this.matchDeclareFormat(node);
				if (match) {
					result.push(match);
				}
			}
		};

		visitNode(sf);

		return result;
	}

	private matchDeclareFormat(
		call: ts.CallExpression
	): FormatDeclaration | false {
		if (!ts.isIdentifier(call.expression)) {
			return false;
		}
		if (call.expression.text !== 'declareFormat') {
			return false;
		}
		const firstArg = call.arguments[0];

		let val: unknown = undefined;
		try {
			val = this.interpretExpression(firstArg);
		} catch (e) {
			// todo
			return false;
		}

		if (typeof val !== 'object' || !val) {
			return false;
		}

		const id = (val as any).id;
		if (typeof id !== 'string') {
			// the typechecker already emits an error
			return false;
		}

		return new FormatDeclaration(
			id,
			call,
			undefinedToNull((val as any).defaultFormat)
		);
	}

	private interpretExpression(expr: ts.Expression): unknown {
		if (ts.isStringLiteral(expr)) {
			return expr.text;
		} else if (ts.isObjectLiteralExpression(expr)) {
			const result: Record<string, unknown> = {};
			for (const p of expr.properties) {
				if (!ts.isPropertyAssignment(p)) {
					throw new Error();
				}
				let key: string | undefined = undefined;
				if (ts.isIdentifier(p.name)) {
					key = p.name.text;
				}
				if (!key) {
					throw new Error();
				}

				result[key] = this.interpretExpression(p.initializer);
			}
			return result;
		}

		throw new Error('Invalid expression');
	}
}
