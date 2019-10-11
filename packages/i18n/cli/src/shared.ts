import {
	contract,
	notificationContract,
	requestContract,
	types,
} from '@hediet/typed-json-rpc';

export const port = 44441;

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
		dataUpdated: notificationContract({
			params: types.type({
				scopes: types.array(scopeType),
			}),
		}),
	},
});
