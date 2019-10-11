import { expect } from 'chai';
import { LocaleId } from '../src';

describe('LocaleId', () => {
	it('basics', () => {
		const en = new LocaleId('en');
		expect(en.localeCode).to.equal('en');
		expect(en.language).to.equal('en');
		expect(en.country).to.be.undefined;

		const enUS = new LocaleId('en', 'us');
		expect(enUS.localeCode).to.equal('en-US');
		expect(enUS.language).to.equal('en');
		expect(enUS.country).to.equals('us');
	});

	it('locale code', () => {
		expect(LocaleId.fromLocaleCode('en')!.localeCode).to.equal('en');
		expect(LocaleId.fromLocaleCode('en-us')!.localeCode).to.equal('en-US');
		expect(LocaleId.fromLocaleCode('eN-uS')!.localeCode).to.equal('en-US');
		expect(LocaleId.fromLocaleCode('eN-uS-')).to.be.undefined;
	});

	it('predefined language ids', () => {
		expect(LocaleId.deDE.localeCode).to.equal('de-DE');
		expect(LocaleId.enUS.localeCode).to.equal('en-US');
	});
});
