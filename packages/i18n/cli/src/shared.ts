import {
	contract,
	notificationContract,
	requestContract,
	types,
} from '@hediet/typed-json-rpc';

export const port = 44441;

export type FormatDeclarationData = {
	formatId: string;
	defaultFormat: string | null;
};

export type LocalizedFormatPackageId = {
	scopeName: string;
	lang: string;
};

export type FormatId = {
	scopeName: string;
	lang: string;
	formatId: string;
	format: string | null;
};

export type ActionId = {
	kind:
		| 'RemovePackageFormat'
		| 'AddPackageFormat'
		| 'UpdatePackageFormat'
		| 'UpdateDeclarationDefaultFormat';
	id: string;
	title: string;
};

export type DiagnosticData = { fixes: ActionId[] } & (
	| {
			kind: 'missingFormat';
			package: LocalizedFormatPackageId;
			declaration: FormatDeclarationData;
	  }
	| {
			kind: 'emptyFormat';
			format: FormatId;
	  }
	| {
			kind: 'unknownFormat';
			format: FormatId;
	  }
	| {
			kind: 'formatDeclarationWithoutScope';
			declaration: FormatDeclarationData;
	  }
	| {
			kind: 'duplicateFormatDeclaration';
			conflictingDeclarations: FormatDeclarationData[];
	  }
	| {
			kind: 'diffingDefaultFormats';
			format: FormatId;
			declaration: FormatDeclarationData;
	  }
	| {
			kind: 'missingDefaultFormat';
			format: FormatId;
			declaration: FormatDeclarationData;
	  }
);

const unchecked = <T>() => types.any as types.Type<T>;

export const diagnostic = unchecked<DiagnosticData>();

export const formatType = types.type({
	id: types.string,
	format: types.union([types.string, types.null]),
});

export const localizedFormatPackageType = types.type({
	lang: types.string,
	formats: types.array(formatType),
});

export const scopeType = types.type({
	name: types.string,
	defaultLang: types.string,
	packages: types.array(localizedFormatPackageType),
});

export const serverContract = contract({
	server: {
		revealCodePosition: requestContract({
			params: types.type({
				codePosition: types.string,
			}),
		}),
		applyActions: requestContract({
			params: types.type({
				actions: types.array(unchecked<ActionId>()),
			}),
		}),
		setFormat: requestContract({
			params: types.type({
				scopeName: types.string,
				lang: types.string,
				formatId: types.string,
				format: types.union([types.string, types.null]),
			}),
		}),
	},
	client: {
		diagnosticsUpdated: notificationContract({
			params: types.type({
				diagnostics: types.array(diagnostic),
			}),
		}),
		dataUpdated: notificationContract({
			params: types.type({
				scopes: types.array(scopeType),
			}),
		}),
	},
});
