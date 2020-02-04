//import * as m from '../../native-demo/node_modules/mobx-react';

declare module 'mobx-react' {
	const x: typeof import('../../native-demo/node_modules/mobx-react');
	export = x;
}
