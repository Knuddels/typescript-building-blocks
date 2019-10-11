import { Result, ok, err } from '../src';
import { expect } from 'chai';

describe('result', () => {
	it('ok', () => {
		const val = { brand: 'value' };
		const r = ok(val);
		expect(r.kind).to.equal('ok');
		expect(r.isOk());
		expect(r.value === val);
	});

	it('err', () => {
		const val = { brand: 'value' };
		const r = err(val);
		expect(r.isError());
		expect(r.kind).to.equal('error');
		expect(r.value === val);
	});
});
