import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({path: path.join(__dirname, '.audubon-env')});

const COMPILER_FIRST_NAME = process.env.COMPILER_FIRST_NAME;
const COMPILER_LAST_NAME = process.env.COMPILER_LAST_NAME;
const LOGIN_NAME = `${COMPILER_LAST_NAME}, ${COMPILER_FIRST_NAME}`;
const PASSWORD = process.env.PASSWORD;
const CIRCLE_NAME = process.env.CIRCLE_NAME;
const SHOW_BROWSER = !!process.env.SHOW_BROWSER;
const BASE_CBC_URL = 'https://moumn.org/CBC/';
const LOGIN_URL = `${BASE_CBC_URL}/compilers_login.php`;

async function main() {
    const puppeteerOpts = SHOW_BROWSER ? {
        headless: false,
        slowMo: 100,
        args: [`--window-size=1920,1080`]
    } : {}
    const browser = await puppeteer.launch(puppeteerOpts);
    const page: Page = await browser.newPage();
    if (SHOW_BROWSER) {
        await page.setViewport({width: 1920, height: 1080});
    }

    try {
        await login(page);
        await clickEditDataLink(page);
        await setStartEndTime(page);
        await enterChecklistCounts(page);
        await logout(page);
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function login(page: Page) {
    console.log(`Navigating to ${LOGIN_URL}`);
    await page.goto(LOGIN_URL);

    console.log('Entering login name and password');
    await page.select('input[type="select"]', LOGIN_NAME!);
    await page.focus('input[type="password"]');
    await page.keyboard.type(PASSWORD!);
    await page.click('input[type="submit" value="Login"]');

    await page.waitForNavigation();

    if (!(await isAuthenticated(page))) {
        throw new Error("Login failed: Authentication cookie not found");
    }

    const invalidLoginMessage = await page.waitForSelector("xpath//html/body/table/tbody/tr[3]/td[2]/font/p[1]/font[contains(text(), 'The password entered does not match the password on file!')]", {timeout: 5000});
    if (invalidLoginMessage) {
        if ((await invalidLoginMessage.evaluate(el => el.textContent))?.includes("The password entered does not match the password on file!")) {
            throw new Error("Login failed: Invalid credentials");
        }
    }

    console.log('Checking for login confirmation page');
    const compilersLoginPageMessage = await page.waitForSelector(`xpath///html/body/table/tbody/tr[3]/td[2]/h3/font[contains(text(), "${COMPILER_FIRST_NAME} ${COMPILER_LAST_NAME}'s Compiler Page")]`, {timeout: 5000});

    if (!compilersLoginPageMessage) {
        throw new Error('Login confirmation not found, login may have failed');
    }
    console.log('Login successful');
}

async function clickEditDataLink(page: Page) {
    console.log(`Clicking Edit Data link`);

    const editDataLink = await page.$("body > table > tbody > tr:nth-child(3) > td:nth-child(2) > font > table > tbody > tr:nth-child(3) > td:nth-child(4) > a");
    await editDataLink?.click();
    await page.waitForNavigation();
}

async function setStartEndTime(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/StartEndTime.aspx`);

    //if there's a "delete" link, start/end times are already set
    const deleteTimeLink = async () => page.$("#MainContent_CountTimeGridView_cell0_0_CountTimeDelete_0");
    if (await deleteTimeLink()) {
        console.log('Start and end times already set, skipping');
        return;
    }

    async function selectTime(selector: string, value: string) {
        const timeInput = await page.$(selector);
        if (timeInput) {
            // Click thrice to select existing value so we can overwrite it
            await timeInput.click({count: 3});
            await timeInput.type(value);
        }
    }

    await selectTime("#StartTimeHour_I", "8");
    await selectTime('#StartTimeMin_I', "00");
    await selectTime('#StartTimeAMPM_I', "AM");
    await selectTime('#EndTimeHour_I', "5");
    await selectTime('#EndTimeMin_I', "00");
    await selectTime('#EndTimeAMPM_I', "PM");

    const addTimeButton = await page.$('#MainContent_btnAddTime');

    if (addTimeButton) {
        await addTimeButton.click();
        console.log("Clicked Add Time button");
    } else {
        throw new Error('One or more time selection elements not found');
    }
    //So the page updates before we check for the delete link
    await page.reload();
    if (await deleteTimeLink()) {
        console.log('Set start and end times successfully');
    }
}

async function enterChecklistCounts(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/BirdChecklist.aspx`);

    const testSpecies = [{commonName: 'American Robin', count: 5}, {commonName: 'Northern Cardinal', count: 3}];

    for (const species of testSpecies) {
        console.log(`Entering count for ${species.commonName}: ${species.count}`);
        await enterChecklistCount(page, species.commonName, species.count);
    }
}

async function enterChecklistCount(page: Page, speciesCommonName: string, count: number | string) {
    const speciesRow = await page.$(`xpath///html/body/table/tbody/tr[6]/td/form/fieldset/table/tbody/tr[td[contains(text(),'${speciesCommonName}')]]`);
    if (speciesRow) {
        const inputs = await speciesRow.$$('td:has(input)');
        if(typeof count == "number") {
            await inputs[0].click({count: 2});
            await page.keyboard.type(`${count}`, {delay: 100});
            await page.keyboard.press('Enter');
            await inputs[1].click({count: 2});
            await page.keyboard.type(`${count}`, {delay: 100});
            await page.keyboard.press('Enter');
        } else if (count === "cw") {
            await inputs[2].click();
        }
    }
}

async function typeSpeciesName(page: Page, speciesCommonName: string, timeout: number) {
    await puppeteer.Locator.race([
        page.locator('#gvBirdChecklist_DXFREditorcol2_I'),
        page.locator('::-p-xpath(//*[@id=\\"gvBirdChecklist_DXFREditorcol2_I\\"])'),
        page.locator(':scope >>> #gvBirdChecklist_DXFREditorcol2_I')
    ])
        .setTimeout(timeout)
        .click();
    await puppeteer.Locator.race([
        page.locator('#gvBirdChecklist_DXFREditorcol2_I'),
        page.locator('::-p-xpath(//*[@id=\\"gvBirdChecklist_DXFREditorcol2_I\\"])'),
        page.locator(':scope >>> #gvBirdChecklist_DXFREditorcol2_I')
    ])
        .setTimeout(timeout)
        .fill(speciesCommonName);
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
}


async function logout(page: Page) {
    console.log("Logging out");
    await page.goto(`${BASE_CBC_URL}/Account/logout.aspx`);
    if (!(await isAuthenticated(page))) {
        console.log("Logged out successfully");
    }
}

async function isAuthenticated(page: Page) {
    const cookies = await page.browserContext().cookies();
    return !!(cookies.find(cookie => cookie.domain === "moumn.org" && cookie.name === 'first_name' && cookie.value === COMPILER_FIRST_NAME))
        && !!(cookies.find(cookie => cookie.domain === "moumn.org" && cookie.name === 'last_name' && cookie.value === COMPILER_LAST_NAME)) &&
        !!(cookies.find(cookie => cookie.domain === "moumn.org" && cookie.name === 'compiler_id'));
}

(async () => {
    if (!COMPILER_FIRST_NAME || !COMPILER_FIRST_NAME || !PASSWORD) {
        console.error('COMPILER_FIRST_NAME, COMPILER_LAST_NAME and PASSWORD must be set in environment variables.');
        process.exit(1);
    }
    if (!CIRCLE_NAME) {
        console.error('CIRCLE NAME must be set in environment variables.');
        process.exit(1);
    }
    await main();
})();
