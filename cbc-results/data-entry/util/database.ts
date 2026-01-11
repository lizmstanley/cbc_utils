import Database from 'better-sqlite3';
import fs from 'fs';
import csv from 'csv-parser';
import path, {dirname} from "path";
import {fileURLToPath} from "url";
import {CbcResultRow} from "./common-utils";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path: path.join(__dirname, '..', '.env')});

const CSV_RESULTS_FILE = path.join(__dirname, '..', `/csv-data-files/${process.env.RESULTS_CSV_FILE}`);
const MN_CBC_SPECIES_LIST = path.join(__dirname, '..', '/csv-data-files/mn-cbc-species.csv');
const AOU_REAL_SPECIES_LIST = path.join(__dirname, '..', '/csv-data-files/NACC_list_species.csv');
const FORCE_DATA_LOAD = process.env.FORCE_DATA_LOAD === 'true';

export const db = new Database('cbc_database.db');

export function initializeDatabase(forceDataReload: boolean = FORCE_DATA_LOAD !== undefined ? FORCE_DATA_LOAD : false) {
    console.log('Initializing database...');
    db.exec(`CREATE TABLE IF NOT EXISTS data_load_status
             (
                 id
                     INTEGER
                     PRIMARY
                         KEY,
                 data_set
                     TEXT,
                 is_loaded
                     INTEGER DEFAULT 0,
                 loaded_at
                     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
             )`);
    db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_data_load_status ON data_load_status(data_set)');
    const cbcResultsLoaded = isDataLoaded('cbc_results');
    const mnCbcSpeciesLoaded = isDataLoaded('mn_cbc_species');
    const aouRealSpeciesLoaded = isDataLoaded('aou_real_species');
    if (cbcResultsLoaded && mnCbcSpeciesLoaded && aouRealSpeciesLoaded && !forceDataReload) {
        console.log('All data sets already loaded, skipping data load. Set FORCE_DATA_LOAD=true to reload.');
        return;
    }
    else {
        if(forceDataReload) {
            console.log('Force reloading all data sets...');
        }
    }
    if (forceDataReload || !cbcResultsLoaded) {
        console.log('Loading CBC Results data...');
        db.exec('DROP TABLE IF EXISTS cbc_results');
        db.exec(`CREATE TABLE IF NOT EXISTS cbc_results
                 (
                     id
                         INTEGER
                         PRIMARY
                             KEY,
                     result_type
                         TEXT,
                     result_name
                         TEXT,
                     result_qualifier
                         TEXT,
                     result_value
                         TEXT
                 )`);
        db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_cbc_results ON cbc_results(result_type, result_name, result_qualifier)');
        fs.createReadStream(CSV_RESULTS_FILE)
            .pipe(csv({
                // headers in csv are: type,name,qualifier,value
                // TODO: validate expected headers exist
                mapValues: ({value}) => value.trim().toLowerCase(),
                mapHeaders: ({header}) => header.trim().toLowerCase(),
            }))
            .on('data', (row: CbcResultRow) => {
                db.prepare('INSERT INTO cbc_results ( result_type, result_name, result_qualifier, result_value) VALUES (?, ?, ?, ?)').run(row.type, row.name, row.qualifier, row.value)
            })
            .on('end', () => {
                console.log(`${CSV_RESULTS_FILE} successfully processed`);
            });
        db.prepare('INSERT INTO data_load_status (data_set, is_loaded, loaded_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT (data_set) DO UPDATE SET is_loaded=1, loaded_at=CURRENT_TIMESTAMP').run('cbc_results', 1);
    }
    if (forceDataReload || !mnCbcSpeciesLoaded) {
        console.log('Loading MN CBC Species data...');
        db.exec(`DROP TABLE IF EXISTS mn_cbc_species`);
        db.exec(`CREATE TABLE IF NOT EXISTS mn_cbc_species
                 (
                     id
                         INTEGER
                         PRIMARY
                             KEY,
                     common_name
                         TEXT,
                     species
                         TEXT
                 )`);
        db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_mn_cbc_species ON mn_cbc_species(common_name)');
        fs.createReadStream(MN_CBC_SPECIES_LIST)
            .pipe(csv({
                mapValues: ({value}) => value.trim().toLowerCase()
            }))
            .on('data', (row) => {
                // 4. Insert Data
                db.prepare('INSERT INTO mn_cbc_species ( common_name, species) VALUES (?, ?)').run(row.commonName, row.scientificName);
            })
            .on('end', () => {
                console.log(`${MN_CBC_SPECIES_LIST} successfully processed`);
            });
        db.prepare('INSERT INTO data_load_status (data_set, is_loaded, loaded_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT (data_set) DO UPDATE SET is_loaded=1, loaded_at=CURRENT_TIMESTAMP').run('mn_cbc_species', 1);
    }
    if (forceDataReload || !aouRealSpeciesLoaded) {
        console.log('Loading AOU Real Species data...');
        db.exec(`DROP TABLE IF EXISTS aou_real_species`);
        db.exec(`CREATE TABLE IF NOT EXISTS aou_real_species
                 (
                     id
                         INTEGER
                         PRIMARY
                             KEY,
                     aou_id
                         INTEGER,
                     common_name
                         TEXT,
                     species
                         TEXT
                 )`);
        db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_aou_real_species ON aou_real_species(common_name)');
        fs.createReadStream(AOU_REAL_SPECIES_LIST)
            .pipe(csv({mapValues: ({value}) => value.trim().toLowerCase()}))
            .on('data', (row) => {
                db.prepare('INSERT INTO aou_real_species (aou_id, common_name, species) VALUES (?, ?, ?)').run(row.id, row.common_name, row.species);
            })
            .on('end', () => {
                console.log(`${AOU_REAL_SPECIES_LIST} successfully processed`);
            });
        db.prepare('INSERT INTO data_load_status (data_set, is_loaded, loaded_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT (data_set) DO UPDATE SET is_loaded=1, loaded_at=CURRENT_TIMESTAMP').run('aou_real_species', 1);
    }
}

function isDataLoaded(dataSet: string): boolean {
    const row = db.prepare('SELECT is_loaded FROM data_load_status WHERE data_set = ?').get(dataSet) as {
        is_loaded: number
    } | undefined;
    return row ? !!row.is_loaded : false;
}

