// This fixes the default Intl that, by default, only supports english. This sucks for testing.
import 'intl';
import 'intl/locale-data/jsonp/de';
import 'intl/locale-data/jsonp/en';

import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/dist/locale-data/en';
import '@formatjs/intl-pluralrules/dist/locale-data/de';

import '@formatjs/intl-relativetimeformat/polyfill';
import '@formatjs/intl-relativetimeformat/dist/locale-data/en';
import '@formatjs/intl-relativetimeformat/dist/locale-data/de';

Intl.NumberFormat = (global as any).IntlPolyfill.NumberFormat;
Intl.DateTimeFormat = (global as any).IntlPolyfill.DateTimeFormat;
