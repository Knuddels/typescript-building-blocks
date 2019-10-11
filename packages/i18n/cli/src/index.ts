import { enableHotReload } from '@hediet/node-reload';
// enableHotReload(); TODO

import 'reflect-metadata';
import * as Path from 'path';
import { CLI, Shim } from 'clime';

const cli = new CLI('format-editor', Path.join(__dirname, 'commands'));
const shim = new Shim(cli);
shim.execute(process.argv);
