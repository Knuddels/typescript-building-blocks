# I18n CLI

## usage

To run the I18n CLI, run `yarn i18n show .` in the main project.

## polyfills

```json
    "@formatjs/intl-pluralrules": "^1.2.0",
    "@formatjs/intl-relativetimeformat": "^4.1.0",
    "intl": "^1.2.5"
```

The `intl` package does not provide `PluralRules` polyfills.

```ts
import 'intl';
import 'intl/locale-data/jsonp/de';
import 'intl/locale-data/jsonp/en';

import '@formatjs/intl-pluralrules/polyfill';
import '@formatjs/intl-pluralrules/dist/locale-data/en';
import '@formatjs/intl-pluralrules/dist/locale-data/de';

import '@formatjs/intl-relativetimeformat/polyfill';
import '@formatjs/intl-relativetimeformat/dist/locale-data/en';
import '@formatjs/intl-relativetimeformat/dist/locale-data/de';
```
