#!/usr/bin/env node
const path = require('path');
require('child_process').execSync(
	`yarn tsc --build ${path.join(__dirname, 'tsconfig.json')}`,
	{
		stdio: 'inherit',
	}
);
require('./dist/index');
