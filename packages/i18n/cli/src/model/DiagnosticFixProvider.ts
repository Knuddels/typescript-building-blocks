import { hotClass, registerUpdateReconciler } from '@hediet/node-reload';
import * as ts from 'typescript';
import { FormatDeclaration } from '../model/FormatDeclarationProvider';
import {
	LocalizedFormatPackage,
	PackageFormat,
	Format,
	Scopes,
} from '../model/Scopes';
import { FileEditor } from '../utils/FileEditor';
import { groupBy, toObject, flatMap } from '../utils/other';
import { Diagnostic } from './DiagnosticProvider';
import { computed } from 'mobx';

registerUpdateReconciler(module);

export class DiagnosticFixProvider {
	@computed
	get formatsGroupedById(): Map<string, PackageFormat[]> {
		return groupBy(
			flatMap(
				flatMap(this.scopes.scopes, s => s.localizedFormatPackages),
				p => p.formats
			),
			p => p.id
		);
	}

	constructor(private readonly scopes: Scopes) {}

	public getFixes(diagnostic: Diagnostic): Action[] {
		if (diagnostic.kind === 'diffingDefaultFormats') {
			return [
				new SetDeclarationDefaultFormatAction(
					diagnostic.declaration,
					diagnostic.format.format!,
					'Update default format in code'
				),
				new UpdatePackageFormatAction(
					diagnostic.format,
					diagnostic.declaration.defaultFormat!,
					'Update format in default language'
				),
			];
		} else if (diagnostic.kind === 'missingDefaultFormat') {
			return [
				new SetDeclarationDefaultFormatAction(
					diagnostic.declaration,
					diagnostic.format.format!,
					'Set default format in code'
				),
			];
		} else if (diagnostic.kind === 'missingFormat') {
			let existingFormat: PackageFormat | undefined = undefined;

			const existingFormatsInOtherScopes = this.formatsGroupedById.get(
				diagnostic.declaration.id
			);
			if (existingFormatsInOtherScopes) {
				existingFormat = existingFormatsInOtherScopes.find(
					f => f.package.lang === diagnostic.package.lang
				);
			}

			const newFormat =
				existingFormat && existingFormat.format
					? existingFormat.format
					: diagnostic.package.scope.defaultLang ===
							diagnostic.package.lang &&
					  diagnostic.declaration.defaultFormat
					? diagnostic.declaration.defaultFormat
					: null;
			return [
				new AddPackageFormatAction(
					{
						id: diagnostic.declaration.id,
						format: newFormat,
					},
					diagnostic.package,
					existingFormat && existingFormat.format
						? `Add format from ${existingFormat.package.scope.name}`
						: 'Add format'
				),
			];
		} else if (diagnostic.kind === 'unknownFormat') {
			return [
				new RemovePackageFormatAction(
					diagnostic.format,
					'Remove format'
				),
			];
		} else {
			return [];
		}
	}

	public applyActions(actions: Action[]): void {
		const editor = new FileEditor();
		const actionsByPkg = groupBy(actions, d => d.targetPackage);
		for (const [pkg, actions] of actionsByPkg) {
			if (pkg) {
				const formats = toObject(pkg.formats, f => f.id);
				for (const action of actions) {
					action.apply(pkg, formats, editor);
				}
				pkg.setFormats(Object.values(formats));
			} else {
				for (const action of actions) {
					action.apply(null!, {}, editor);
				}
			}
		}
		editor.applyEdits();
		editor.writeChanges();
	}
}

export type Action =
	| RemovePackageFormatAction
	| AddPackageFormatAction
	| UpdatePackageFormatAction
	| SetDeclarationDefaultFormatAction
	| SetDeclarationDefaultFormatAction;

export interface BaseAction {
	apply(
		currentPackage: LocalizedFormatPackage,
		currentFormats: Record<string, Format>,
		editor: FileEditor
	): void;

	readonly targetPackage: LocalizedFormatPackage | undefined;
}

export class RemovePackageFormatAction implements BaseAction {
	public readonly kind = 'RemovePackageFormat';
	constructor(
		public readonly formatToRemove: PackageFormat,
		public readonly title: string
	) {}

	get targetPackage(): LocalizedFormatPackage {
		return this.formatToRemove.package;
	}

	apply(
		currentPackage: LocalizedFormatPackage,
		currentFormats: Record<string, Format>,
		editor: FileEditor
	): void {
		delete currentFormats[this.formatToRemove.id];
	}
}
export class AddPackageFormatAction implements BaseAction {
	public readonly kind = 'AddPackageFormat';
	constructor(
		public readonly formatToAdd: Format,
		public readonly targetPackage: LocalizedFormatPackage,
		public readonly title: string
	) {}

	apply(
		currentPackage: LocalizedFormatPackage,
		currentFormats: Record<string, Format>,
		editor: FileEditor
	): void {
		currentFormats[this.formatToAdd.id] = this.formatToAdd;
	}
}
export class UpdatePackageFormatAction implements BaseAction {
	public readonly kind = 'UpdatePackageFormat';
	constructor(
		public readonly format: PackageFormat,
		public readonly newFormat: string,
		public readonly title: string
	) {}

	get targetPackage(): LocalizedFormatPackage {
		return this.format.package;
	}

	apply(
		currentPackage: LocalizedFormatPackage,
		currentFormats: Record<string, Format>,
		editor: FileEditor
	): void {
		currentFormats[this.format.id] = {
			id: this.format.id,
			format: this.newFormat,
		};
	}
}
export class SetDeclarationDefaultFormatAction implements BaseAction {
	public readonly kind = 'UpdateDeclarationDefaultFormat';
	constructor(
		public readonly declaration: FormatDeclaration,
		public readonly newFormat: string,
		public readonly title: string
	) {}

	readonly targetPackage = undefined;

	apply(
		currentPackage: LocalizedFormatPackage,
		currentFormats: Record<string, Format>,
		editor: FileEditor
	): void {
		const node = this.declaration.node as ts.CallExpression;
		const firstArg = node.arguments[0];
		const f = editor.openFile(node.getSourceFile().fileName);
		f.replace(
			firstArg.getStart(),
			firstArg.getEnd(),
			`{ id: ${JSON.stringify(
				this.declaration.id
			)}, defaultFormat: ${JSON.stringify(this.newFormat)} }`
		);
	}
}
