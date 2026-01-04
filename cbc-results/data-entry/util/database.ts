import Database from 'better-sqlite3';
import fs from 'fs';
import csv from 'csv-parser';
import path, {dirname} from "path";
import {fileURLToPath} from "url";
import {CbcResultRow} from "./common-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_RESULTS_FILE = path.join(__dirname, '..', `${process.env.RESULTS_CSV_FILE || "cbc-results.csv"}`);
const MN_CBC_SPECIES_LIST = path.join(__dirname, 'mn-cbc-species.csv');
const AOU_REAL_SPECIES_LIST = path.join(__dirname, 'NACC_list_species.csv');

export const db = new Database('cbc_database.db');

export function initializeDatabase() {
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
                 result_value
                     TEXT
             )`);
    db.exec('CREATE INDEX if NOT EXISTS idx_ ON cbc_results(result_type)');
    db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_ ON cbc_results(result_name)');
    fs.createReadStream(CSV_RESULTS_FILE)
        .pipe(csv({
            headers: ['type', 'name', 'val'],
            mapValues: ({value}) => value.trim().toLowerCase()
        }))
        .on('data', (row: CbcResultRow) => {
            db.prepare('INSERT INTO cbc_results ( result_type, result_name, result_value) VALUES (?, ?, ?)').run(row.type, row.name, row.val)
        })
        .on('end', () => {
            console.log(`${CSV_RESULTS_FILE} successfully processed`);
        });

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
    db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_ ON mn_cbc_species(common_name)');
    fs.createReadStream(MN_CBC_SPECIES_LIST)
        .pipe(csv({
            mapValues: ({value}) => value.trim().toLowerCase()
        }))
        .on('data', (row) => {
            // 4. Insert Data
            db.prepare('INSERT INTO aou_real_species ( common_name, species) VALUES (?, ?)').run(row.commonName, row.scientificName);
        })
        .on('end', () => {
            console.log(`${MN_CBC_SPECIES_LIST} successfully processed`);
        });

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
    db.exec('CREATE UNIQUE INDEX if NOT EXISTS idx_ ON aou_real_species(common_name)');
    fs.createReadStream(AOU_REAL_SPECIES_LIST)
        .pipe(csv({mapValues: ({value}) => value.trim().toLowerCase()}))
        .on('data', (row) => {
            db.prepare('INSERT INTO aou_real_species (aou_id, common_name, species) VALUES (?, ?, ?)').run(row.id, row.common_name, row.species);

        })
        .on('end', () => {
            console.log(`${AOU_REAL_SPECIES_LIST} successfully processed`);
        });
}