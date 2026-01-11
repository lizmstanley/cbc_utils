import yargs from 'yargs';
import {hideBin} from "yargs/helpers";
import {initializeDatabase} from "./database";

interface InitOptions {
    force: boolean;
}

const parser = yargs(hideBin(process.argv))
    .option('force', {
        type: 'boolean',
        description: 'Force reload of all data sets into the database',
        default: false
    });
(async () => {
    const args = parser.parse(hideBin(process.argv)) as InitOptions;
    if (args['force']) {
        console.log('Force data reload option detected. All data sets will be reloaded into the database.');
    }
    initializeDatabase(args.force);
})();


