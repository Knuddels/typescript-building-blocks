export type FormattedData =
	| { kind: 'text'; value: string }
	| { kind: 'sequence'; items: FormattedData[] }
	| { kind: 'object'; data: any; child?: FormattedData };
