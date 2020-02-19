require('ts-node').register({
	transpileOnly: true,
	project: require('path').join(__dirname, './tsconfig.json'),
});
module.exports = require('./build.ts');
