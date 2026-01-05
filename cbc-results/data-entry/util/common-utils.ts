import {Page} from "puppeteer";
import {db} from "./database";

export type CbcResultRow = { type: string, name: string, val: string };

export function getResultsByType(type: string): CbcResultRow[] {
    return db.prepare('SELECT result_name as name, result_value as val FROM cbc_results WHERE result_type = ?').all(type.toLowerCase()) as CbcResultRow[];
}

export function getResultValue(type: string, name: string): string | number | null {
    const result = db.prepare('SELECT result_value as val FROM cbc_results WHERE result_type = ? AND result_name = ?').get(type.toLowerCase(), name.toLowerCase()) as {
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

export async function enterInputText(page: Page, htmlInputSelector: string, field: string, value: string | number | null, waitForSelector?: string) {
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
    const inputValue = typeof value === 'number' ? value.toString() : value;
    await page.click(htmlInputSelector, {count: 2, delay: 100});
    await page.keyboard.type(inputValue, {delay: 100});
    await page.keyboard.press('Enter');
    if (waitForSelector) {
        await page.waitForSelector(waitForSelector, {timeout: 5000});
    }
}

export function isNumeric(value: string | null): boolean {
    if (!value) {
        return false;
    }
    return Number.isFinite(+value);
}