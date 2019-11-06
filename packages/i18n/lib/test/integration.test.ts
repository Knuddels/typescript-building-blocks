import './intl-fix';
import { expect } from 'chai';
import {
	I18nServiceImpl,
	MessageFormatFormatterProvider,
	declareFormat,
} from '../src';
import { LocaleId } from '@knuddels/std';

describe('integration', () => {
	it('test1', () => {
		const p = new MessageFormatFormatterProvider();
		p.registerFormatProvider(
			locale =>
				({
					de: {
						formats: {
							hello_world: 'Hallo Welt, {total, number}',
						},
					},
					en: {
						formats: {
							hello_world: 'Hello world, {total, number}',
						},
					},
				}[locale.language as 'de' | 'en'])
		);

		const format = declareFormat({
			id: 'hello_world',
			defaultFormat: 'Hello world',
		});

		const i18n = new I18nServiceImpl(LocaleId.enUS, LocaleId.enUS, p);
		expect(i18n.format(format, { total: 100000 })).to.equal(
			'Hello world, 100,000'
		);

		i18n.setLocale(LocaleId.deDE);
		expect(i18n.format(format, { total: 100000 })).to.equal(
			'Hallo Welt, 100.000'
		);
	});
});
