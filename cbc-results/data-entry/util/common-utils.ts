import {Page} from "puppeteer";
import {db} from "./database-ddl";
import { encode as xpathEncode} from 'html-entities';

export type CbcResultRow = { type: string, name: string, qualifier: string, value: string };

// Get all results of a given type, such as species
export function getResultsByType(type: string): CbcResultRow[] {
    return db.prepare('SELECT result_type as type, result_name as name, result_qualifier as qualifier, result_value as val FROM cbc_results WHERE result_type = ?').all(type.toLowerCase()) as CbcResultRow[];
}

export function getResultsByTypeAndName(type: string, name: string): CbcResultRow[] {
    return db.prepare('SELECT result_type as type, result_name as name, result_qualifier as qualifier, result_value as value FROM cbc_results WHERE result_type = ? and result_name = ?').all(type.toLowerCase(), name.toLowerCase()) as CbcResultRow[];
}

// For example, all of the weather precip results
export function getResultsByTypeAndNamePrefix(type: string, name: string): CbcResultRow[] {
    return db.prepare('SELECT result_type as type, result_name as name, result_qualifier as qualifier, result_value as value FROM cbc_results WHERE result_type = ? and result_name LIKE ?').all(type.toLowerCase(), `${name.toLowerCase()}%`) as CbcResultRow[];
}

// Get a single result value by name, type and qualifier.
export function getQualifiedResultValue(type: string, name: string, qualifier: string): string | number | null {
    const result = db.prepare('SELECT result_value as val FROM cbc_results WHERE result_type = ? AND result_name = ? and result_qualifier = ?').get(type.toLowerCase(), name.toLowerCase(), qualifier.toLowerCase()) as {
        val: string | number
    } | null;
    return result ? result.val : null;
}

export function isExpectedMnCbcSpecies(commonName: string) {
    const result = db.prepare('SELECT COUNT(*) as count FROM mn_cbc_species WHERE common_name = ?').get(commonName.toLowerCase()) as {
        count: number
    };
    if (!result.count) {
        console.warn(`\n
            Species ${commonName} not found in expected MN CBC species list,
            update your results to ensure the common name matches MOU CBC species list at https://moumn.org/CBC/birds_summary.php,
            or enter this species manually on the CBC website.`);
        return false;
    }
    return true;
}

export function isAouRealSpecies(commonName: string): boolean {
    const result = db.prepare('SELECT COUNT(*) as count FROM aou_real_species WHERE common_name = ?').get(commonName.toLowerCase()) as {
        count: number
    };
    if (!result.count) {
        console.info(`\n
            Species ${commonName} not found in the AOU real species list,
            and will not be automatically included in the total species calculation for the CBC website, per NAS instructions. 
            Subspecies are generally not considered "real" species for the total species count.
            If it is a generic "sp." it can be included in the total species count IF there is no other real species of that type reported.
            This will require manual review and entry.`);
        return false;
    }
    return true;
}

export async function skipExistingInput(page: Page, htmlInputSelector: string, field: string, value: string | number): Promise<boolean> {
    const existingVal = await page.$eval(htmlInputSelector, (input) => (input as HTMLInputElement).value);
    if (value && isNumeric(existingVal) && typeof value === "number" || (typeof value === "string" && isNumeric(value))) {
        if (Number(existingVal) === Number(value)) {
            console.log(`Numeric value for ${field} already set to ${value}, skipping`);
            return true;
        }
    }
    if (existingVal && existingVal.toLowerCase().trim() === value) {
        console.log(`Value for ${field} already set to ${value}, skipping`);
        return true;
    }
    return false;
}

export async function enterDropdownText(page: Page, htmlInputSelector: string, field: string, value: string | number | null, allowedValues?: string[]) {
    if (!value) {
        console.warn(`No value provided for ${field}`);
        return;
    }
    const inputValue = typeof value === 'number' ? value.toString() : value;
    if (allowedValues && !allowedValues.some(allowedVal => allowedVal === inputValue.toLowerCase())) {
        console.warn(`Value ${value} for ${field} must be one of ${allowedValues.join(',')}`);
        return;
    }
    const dropdownInput = await page.$(htmlInputSelector);
    if (await skipExistingInput(page, htmlInputSelector, field, value)) {
        return;
    }
    if (dropdownInput) {
        // Click thrice to select existing value so we can overwrite it
        await dropdownInput.click({count: 3, delay: 100});
        await dropdownInput.type(inputValue);
        await page.keyboard.press('Enter');
    }
}

export type EnterInputOptions = {
    pressEnter?: boolean,
    waitForSelector?: string
}

const defaultEnterInputOptions: EnterInputOptions = {
    pressEnter: true,
    waitForSelector: undefined
}

export async function enterInputText(page: Page, htmlInputSelector: string, field: string, value: string | number | null, opts: EnterInputOptions = {}) {
    if (!value) {
        console.warn(`No value provided for ${field}`);
        return;
    }
    if (isFinite(Number(value)) && !Number.isInteger(value)) {
        // Steve doesn't want decimals
        value = Math.round(value as number);
    }
    if (await skipExistingInput(page, htmlInputSelector, field, value)) {
        return;
    }
    const inputOptions = {...defaultEnterInputOptions, ...opts};
    const inputValue = typeof value === 'number' ? value.toString() : value;
    await page.click(htmlInputSelector, {count: 2, delay: 200});
    await page.keyboard.type(inputValue, {delay: 200});
    if (inputOptions.pressEnter) {
        await page.keyboard.press('Enter');
    }
    if (inputOptions.waitForSelector) {
        await page.waitForSelector(inputOptions.waitForSelector, {timeout: 5000});
    }
}

export async function selectOptionWithText(page: Page, optionText: string | null, xpathSelect: string = "") {
    if (!optionText) {
        throw new Error("No option text provided");
    }
    //case-insensitive hack for xpath 1.0
    const optionSelect = await page.$(`xpath///${xpathSelect ? xpathSelect : "select"}/option[translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = '${xpathEncode(optionText.toLowerCase())}']`);
    if (!optionSelect) {
        throw new Error(`Option with text ${optionText} not found`);
    }
    const optionValue = await optionSelect.getProperty("value");
    return page.select(`xpath///${xpathSelect}`, (await optionValue.jsonValue()) as string);
}

export async function findTableRowWithText(page: Page, rowText: string | null, xpathSelect: string = "") {
    if (!rowText) {
        throw new Error("No cell text provided");
    }
    //case-insensitive hack for xpath 1.0
    const tableRow = await page.$(`xpath///${xpathSelect ? xpathSelect : "table"}//tr[td[translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = '${xpathEncode(rowText.toLowerCase())}']]`);
    if (!tableRow) {
       console.warn(`Row with text ${rowText} not found - check your data. You may need to correct and reload the database, or enter the data manually.`);
       return null;
    }
    return tableRow;
}

export function isNumeric(value: string | null): boolean {
    if (!value) {
        return false;
    }
    return Number.isFinite(+value);
}