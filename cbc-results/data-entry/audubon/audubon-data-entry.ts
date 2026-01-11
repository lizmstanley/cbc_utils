import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {dirname} from 'path';

import {
    CbcResultRow,
    enterDropdownText,
    enterInputText,
    getQualifiedResultValue,
    getResultsByTypeAndName,
    isAouRealSpecies,
    isExpectedMnCbcSpecies,
} from "../util/common-utils";
import {fileURLToPath} from "url";
import {initializeDatabase} from "../util/database-ddl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path: [path.join(__dirname, '.audubon.env'), path.join(__dirname, '..', '.env')]});

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const CIRCLE_NAME = process.env.CIRCLE_NAME;

const SHOW_BROWSER = process.env.SHOW_BROWSER === undefined || !(process.env.SHOW_BROWSER.trim()) || !!process.env.SHOW_BROWSER;
// This url works for login without having to wait at all!
const LOGIN_URL = 'https://netapp.audubon.org/aap/application/cbc';
// Once we're in, use this base URL for navigation
const BASE_CBC_URL = 'https://netapp.audubon.org/CBC';

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
        await selectCircle(page);
        await setStartEndTime(page);
        await setWeather(page);
        await setEffort(page);
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

    console.log('Filling in login form with email and password');
    await page.focus('input[type="text"]');
    await page.keyboard.type(EMAIL!);
    await page.focus('input[type="password"]');
    await page.keyboard.type(PASSWORD!);
    await page.click('#contentMain_rpnlLogin_bLogin');

    if (!(await isAuthenticated(page))) {
        throw new Error("Login failed: Authentication cookie not found");
    }

    if (await page.$("#contentMain_rpnlLogin_pnlInvalidLogin")) {
        throw new Error("Login failed: Invalid credentials");
    }
    // Checking for this page to ensure we're actually logged in with the full menu available
    console.log('Checking for login confirmation page');

    const loginDiv = await page.waitForSelector("xpath//html/body/form/div[3]/div[3]/div/div/div[2]/div[1]/div[1]/div[1]", {timeout: 5000});
    let isLoggedIn = false;
    if (loginDiv) {
        isLoggedIn = await loginDiv.evaluate((node, email) =>
                node.textContent?.includes(`You are logged in as: ${email!.toUpperCase()}`),
            EMAIL
        );
    }
    if (!isLoggedIn) {
        throw new Error('Login confirmation not found, login may have failed');
    }
    console.log('Login successful');
}

// Have to select the circle before proceeding with anything else
async function selectCircle(page: Page) {
    console.log(`Selecting circle: ${CIRCLE_NAME}`);

    const circleMenuItem = await page.$("a[href*='circleid']");
    if (circleMenuItem) {
        const isCircle = await circleMenuItem.evaluate(
            (el, circleName) => el.innerText === circleName,
            CIRCLE_NAME
        );
        if (isCircle) {
            const circleHref = await circleMenuItem.evaluate(el => el.getAttribute('href'));
            if (circleHref) {
                console.log(`Navigating to circle page: ${circleHref}`);
                await page.goto(`${BASE_CBC_URL}/${circleHref}`);
                console.log(`Selected circle ${CIRCLE_NAME}`);
                return;
            }
        }
    }
    throw new Error(`Unable to select circle ${CIRCLE_NAME}`);
}

async function setStartEndTime(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/StartEndTime.aspx`);

    //if there's a "delete" link, start/end times are already set
    const deleteTimeLink = async () => page.$("#MainContent_CountTimeGridView_cell0_0_CountTimeDelete_0");
    if (await deleteTimeLink()) {
        console.log('Start and end times already set, skipping');
        return;
    }

    function roundToNearest15(num: number) {
        return `${Math.round(num / 15) * 15}`;
    }

    const startTime = getResultsByTypeAndName("time", "Start");
    const endTime = getResultsByTypeAndName("time", "End");

    if (startTime) {
        if (startTime.length > 1) {
            console.warn(`Multiple start times found, using the first one: ${startTime}`);
        }
        const [startHour, startMin] = startTime[0].value.split(":").map(Number);
        await enterDropdownText(page, "#StartTimeHour_I", "Start Hour", startHour);
        await enterDropdownText(page, '#StartTimeMin_I', "Start Minute", roundToNearest15(startMin));
        await enterDropdownText(page, '#StartTimeAMPM_I', "Start AM/PM", startTime[0].qualifier);
    }
    if (endTime) {
        if (endTime.length > 1) {
            console.warn(`Multiple end times found, using the first one: ${endTime}`);
        }
        const [endHour, endMin] = endTime[0].value.split(":").map(Number);
        await enterDropdownText(page, '#EndTimeHour_I', "End Hour", endHour);
        await enterDropdownText(page, '#EndTimeMin_I', "End Minute", roundToNearest15(endMin));
        await enterDropdownText(page, '#EndTimeAMPM_I', "End AM/PM", endTime[0].qualifier);
    }

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

async function setWeather(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/Weather.aspx`);

    // temp min/max
    await enterInputText(page, "#txtWeatherTempMin", "Temperature Min", getQualifiedResultValue("weather", "temperature", "min"));

    await enterInputText(page, "#txtWeatherTempMax", "Temperature Max", getQualifiedResultValue("weather", "temperature", "max"));
    await enterInputText(page, "#cmbWeatherTempUnits_I", "Temperature Units", getQualifiedResultValue("weather", "temperature", "unit"));
    // wind direction and min/maxvelocity
    await enterDropdownText(page, "#cmbWeatherWindDirection_I", "Wind Direction", getQualifiedResultValue("weather", "wind", "direction"), ["unknown", "calm", "east", "north", "northeast", "northwest", "south", "southeast", "southwest", "west", "variable"]);
    await enterInputText(page, "#txtWeatherWindMinVelocity", "Wind Velocity Min", getQualifiedResultValue("weather", "wind velocity", "min"));
    await enterInputText(page, "#txtWeatherWindMaxVelocity", "Wind Velocity Max", getQualifiedResultValue("weather", "wind velocity", "max"));
    await enterInputText(page, "#cmbWeatherWindVelocityUnits_I", "Wind Units", getQualifiedResultValue("weather", "wind velocity", "unit"));
    // snow depth min/max
    await enterInputText(page, "#txtWeatherSnowDepthMin", "Snow Depth Min", getQualifiedResultValue("weather", "snow depth", "min"));
    await enterInputText(page, "#txtWeatherSnowDepthMax", "Snow Depth Max", getQualifiedResultValue("weather", "snow depth", "max"));
    await enterInputText(page, "#cmbWeatherSnowDepthUnits_I", "Snow Depth Units", getQualifiedResultValue("weather", "snow depth", "unit"));
    // water conditions
    await enterDropdownText(page, "#cmbWeatherStillWater_I", "Still Water", getQualifiedResultValue("weather", "water body", "still"), ["unknown", "frozen", "open", "partly frozen", "partly open"]);
    await enterDropdownText(page, "#cmbWeatherMovingWater_I", "Moving Water", getQualifiedResultValue("weather", "water body", "moving"), ["unknown", "frozen", "open", "partly frozen", "partly open"]);
    const saveWeatherButton = await page.$("#btnWeatherSave");
    if (saveWeatherButton) {
        await saveWeatherButton.click();
        await page.waitForSelector('xpath///*[@id="ajaxFiredWeather1" and contains(., "Saved")]', {timeout: 5000});
        console.log("Saved weather information");
    }
    // cloud cover
    await enterDropdownText(page, "#cmbWeatherCloudCoverAM_I", "Cloud Cover AM", getQualifiedResultValue("weather", "cloud cover", "am"), ["unknown", "clear", "cloudy", "foggy", "local fog", "partly clear", "partly cloudy"]);
    await enterDropdownText(page, "#cmbWeatherCloudCoverPM_I", "Cloud Cover AM", getQualifiedResultValue("weather", "cloud cover", "am"), ["unknown", "clear", "cloudy", "foggy", "local fog", "partly clear", "partly cloudy"]);

    // precip
    async function clickPrecipCheckbox(selector: string, type: string, name: string, qualifier: string) {
        const precipValue = (getQualifiedResultValue(type, name, qualifier) as string)?.toLowerCase();
        let checkboxSelector;
        switch (precipValue) {
            case "none":
                checkboxSelector = `#chkWeather${selector}None`;
                break;
            case "light":
                checkboxSelector = `#chkWeather${selector}Light`;
                break;
            case "heavy":
                checkboxSelector = `#chkWeather${selector}}Heavy`;
                break;
            default:
                checkboxSelector = `#chkWeather${selector}Unknown`;
        }
        const isChecked = await page.$eval(checkboxSelector, checkbox => (checkbox as HTMLInputElement).checked);
        if (!isChecked) {
            await page.click(checkboxSelector);
        }
    }

    await clickPrecipCheckbox("AMRain", "weather", "precip rain", "am");
    await clickPrecipCheckbox("AMSnow", "weather", "precip snow", "am");
    await clickPrecipCheckbox("PMRain", "weather", "precip rain", "pm");
    await clickPrecipCheckbox("PMSnow", "weather", "precip snow", "pm");
    const savePrecipButton = await page.$("#btnAMPMConditionsSave");
    if (savePrecipButton) {
        await savePrecipButton.click();
        await page.waitForSelector('xpath///*[@id="ajaxFiredWeather2" and contains(., "Saved")]', {timeout: 5000});
        console.log("Saved precipitation information");
    }
}

async function setEffort(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/Effort.aspx`);

    await enterInputText(page, "#txtTotalNumber", "Total Number of Field Observers", getQualifiedResultValue("effort", "counters", "field"));
    await enterInputText(page, "#txtMaximumNumber", "Max Number of Parties", getQualifiedResultValue("effort", "parties", "max"));
    await enterInputText(page, "#txtMinimumNumber", "Min Number of Parties", getQualifiedResultValue("effort", "parties", "min"));
    await enterInputText(page, "#txtTotalNumberFeeders", "Total Number of Feeder Counters", getQualifiedResultValue("effort", "counters", "feeder"));
    // Not setting units for these because the website defaults to miles already
    // TODO use the units from the data if we want to support km (could do a conversion here)
    await enterInputText(page, "#txtTransportationHours_13", "Total Hours By Foot", getQualifiedResultValue("effort", "hours", "foot"));
    await enterInputText(page, "#txtTransportationDistance_13", "Total Miles By Foot", getQualifiedResultValue("effort", "distance", "foot"));
    // We don't differentiate vehicle types, so just put all vehicle data into "car"
    await enterInputText(page, "#txtTransportationHours_14", "Total Hours By Vehicle", getQualifiedResultValue("effort", "hours", "vehicle"));
    // Again, assuming miles here
    await enterInputText(page, "#txtTransportationDistance_14", "Total Miles By Vehicle", getQualifiedResultValue("effort", "distance", "vehicle"));
    await enterInputText(page, "#txtTransportationHours_9", "Total Hours Cross Country Skiing", getQualifiedResultValue("effort", "hours", "cross country ski"));
    await enterInputText(page, "#txtTransportationDistance_9", "Total Hours Cross Country Skiing", getQualifiedResultValue("effort", "distance", "cross country ski"));
    // At the moment we don't have any other transportation types
    await enterInputText(page, "#txtOtherFeedersHours", "Total Hours Feeder Watching", getQualifiedResultValue("effort", "hours", "feeder"));
    // Not supporting owling/noctural effort at the moment
}

async function enterChecklistCounts(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/BirdChecklist.aspx`);

    const speciesRows = getResultsByTypeAndName("species", "count");
    let totalSpeciesCount = 0
    for (const speciesRow of speciesRows) {
        const commonName = speciesRow.qualifier;
        if (!isExpectedMnCbcSpecies(commonName)) {
            continue;
        }
        const count = speciesRow.value;
        console.log(`Entering count for ${commonName}: ${count}`);
        await enterChecklistCount(page, speciesRow);
        if (/cwp$/i.test(count)) {
            continue; //don't include "count week" entries in total species count
        }
        if (isAouRealSpecies(commonName)) {
            totalSpeciesCount++;
        }
    }
    await enterTotalSpeciesCount(page, totalSpeciesCount);
}

async function enterChecklistCount(page: Page, speciesRow: CbcResultRow) {
    const addSpeciesButton = await page.$("#btnAddSpeciesRow");
    if (addSpeciesButton) {
        await addSpeciesButton.click();
    }
    const timeout = 10000;
    //thank goodness for Chrome dev tools recorder exporting puppeteer code! needed on this one.
    await typeSpeciesName(page, speciesRow.qualifier, timeout);
    const countSelector = "#gvBirdChecklist_tccell0_4 > input[type='text'].count";
    try {
        const countInput = await page.waitForSelector(countSelector, {timeout: 10000});
        if (!countInput) {
            return;
        }
        await enterInputText(page, countSelector, speciesRow.qualifier, `${speciesRow.value}`, {
            waitForSelector: 'xpath///*[@id="ajaxError" and contains(., "Saved")]',
            pressEnter: false
        });
    } catch (err) {
        // @ts-ignore
        if (err.message && err.message.includes(`Error: Error: failed to find element matching selector ${countSelector}`)) {
            const notFound = await page.$eval("#gvBirdChecklist_DXMainTable", (el) => el.textContent.includes("No data to display"));
            if (notFound) {
                console.log(`WARNING: Unable to find species ${speciesRow.value} on website checklist, check your CBC results and/or enter it manually.`);
            }
        }
        else {
            console.error(`Unexpected error entering count for species ${speciesRow.qualifier}:`, err);
        }
    }
}

async function enterTotalSpeciesCount(page: Page, totalSpeciesCount: number) {
    await page.goto("https://netapp.audubon.org/CBC/Compiler/TotalSpecies.aspx");

    console.log(`Entering total species count ${totalSpeciesCount}`);
    console.log(`Entering input tetx for total species count: ${totalSpeciesCount}`);
    await enterInputText(page, "#TotalSpecies", "Total Species Count", totalSpeciesCount, {waitForSelector:'xpath///*[@id="ajaxFiredTotalSpecies" and contains(., "Saved")]', pressEnter:false});
    console.log("Saved total species count successfully");
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
    const authCookie = cookies.find(cookie => cookie.domain === "netapp.audubon.org" && cookie.name === 'ckAAPAuthentication' && cookie.value.startsWith(`Username=${EMAIL}`));
    return !!authCookie;
}

(async () => {
    if (!EMAIL || !PASSWORD) {
        console.error('EMAIL and PASSWORD must be set in environment variables. These are your Audubon CBC website login credentials.');
        process.exit(1);
    }
    if (!CIRCLE_NAME) {
        console.error('CIRCLE NAME must be set in environment variables. This is the value seen under the "Select Circle" menu item on the Audubon CBC website.');
        process.exit(1);
    }
    initializeDatabase();
    await main();
    console.log(`Next steps that need to be done manually:`
        + `\n 1. Review the README in this project`
        + `\n 2. Review the entered data on the Audubon CBC website - you can pull your count summary report to see the numbers.`
        + `\n 3. Check any generic "sp." entries to see if they need to be included in the total species count.`
        + `\n 4. Flag any high/low/unusual species.`
        + `\n 5. Enter any optional special aspects for this count.`
        + `\n 6. After all required sections are complete, submit the count for review and final submission to CBC/NAS.`
    );
})();
