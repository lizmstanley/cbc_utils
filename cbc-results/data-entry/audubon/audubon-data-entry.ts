import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {dirname} from 'path';

// @ts-expect-error
import convertTime from 'convert-time';
import {
    enterDropdownText,
    enterInputText,
    getResultsByType,
    getResultValue, isAouRealSpecies,
    isExpectedMnCbcSpecies,
} from "../util/common-utils";
import {fileURLToPath} from "url";
import {initializeDatabase} from "../util/database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path: path.join(__dirname, '.audubon.env')});
dotenv.config({path: path.join(__dirname, '..', '.env')});

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const CIRCLE_NAME = process.env.CIRCLE_NAME;

const SHOW_BROWSER = process.env.SHOW_BROWSER === undefined || !!process.env.SHOW_BROWSER;
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

    function convert24HrTime(timeStr: string) {
        return convertTime(timeStr.replace(/^0/, ""), "hh MM A").split(" ");
    }

    function roundToNearest15(num: number) {
        return `${Math.round(num / 15) * 15}`;
    }

    const startTime = getResultValue("time", "Start");
    const endTime = getResultValue("time", "End");
    if (startTime !== null) {
        const [startHour, startMin, startAMPM] = convert24HrTime(startTime as string);
        await enterDropdownText(page, "#StartTimeHour_I", "Start Hour", startHour);
        await enterDropdownText(page, '#StartTimeMin_I', "Start Minute", roundToNearest15(startMin));
        await enterDropdownText(page, '#StartTimeAMPM_I', "Start AM/PM", startAMPM);
    }
    if (endTime !== null) {
        const [endHour, endMin, endAMPM] = convert24HrTime(endTime as string);
        await enterDropdownText(page, '#EndTimeHour_I', "End Hour", endHour);
        await enterDropdownText(page, '#EndTimeMin_I', "End Minute", roundToNearest15(endMin));
        await enterDropdownText(page, '#EndTimeAMPM_I', "End AM/PM", endAMPM);
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
    await enterInputText(page, "#txtWeatherTempMin", "Temperature Min", getResultValue("weather", "Temperature Min") );
    await enterInputText(page, "#txtWeatherTempMax", "Temperature Max", getResultValue("weather", "Temperature Max"));
    await enterInputText(page, "#cmbWeatherTempUnits_I", "Temperature Units", getResultValue("weather", "Temperature Units"));
    // wind direction and min/maxvelocity
    await enterDropdownText(page, "#cmbWeatherWindDirection_I", "Wind Direction", getResultValue("weather", "Wind Direction" ), ["unknown", "calm", "east", "north", "northeast", "northwest", "south", "southeast", "southwest", "west", "variable"]);
    await enterInputText(page, "#txtWeatherWindMinVelocity", "Wind Velocity Min", getResultValue("weather", "Wind Velocity Min"));
    await enterInputText(page, "#txtWeatherWindMaxVelocity", "Wind Velocity Max", getResultValue("weather", "Wind Velocity Max"));
    await enterInputText(page, "#cmbWeatherWindVelocityUnits_I", "Wind Units", getResultValue("weather", "Wind Units"));
    // snow depth min/max
    await enterInputText(page, "#txtWeatherSnowDepthMin", "Snow Depth Min", getResultValue("weather", "Snow Depth Min"));
    await enterInputText(page, "#txtWeatherSnowDepthMax", "Snow Depth Max", getResultValue("weather", "Snow Depth Max"));
    await enterInputText(page, "#cmbWeatherSnowDepthUnits_I", "Snow Depth Units", getResultValue("weather", "Snow Depth Units"));
    // water conditions
    await enterDropdownText(page, "#cmbWeatherStillWater_I", "Still Water", getResultValue("weather", "Still Water"), ["unknown", "frozen", "open", "partly frozen", "partly open"]);
    await enterDropdownText(page, "#cmbWeatherMovingWater_I", "Moving Water", getResultValue("weather", "Moving Water"), ["unknown", "frozen", "open", "partly frozen", "partly open"]);
    const saveWeatherButton = await page.$("#btnWeatherSave");
    if (saveWeatherButton) {
        await saveWeatherButton.click();
        await page.waitForSelector('xpath///*[@id="ajaxFiredWeather1" and contains(., "Saved")]', {timeout: 5000});
        console.log("Saved weather information");
    }
    // cloud cover
    await enterDropdownText(page, "#cmbWeatherCloudCoverAM_I", "Cloud Cover AM", getResultValue("weather", "Cloud Cover AM"), ["unknown", "clear", "cloudy", "foggy", "local fog", "partly clear", "partly cloudy"]);
    await enterDropdownText(page, "#cmbWeatherCloudCoverPM_I", "Cloud Cover AM", getResultValue("weather", "Cloud Cover AM"), ["unknown", "clear", "cloudy", "foggy", "local fog", "partly clear", "partly cloudy"]);

    // precip
    async function clickPrecipCheckbox(selector: string, field: string) {
        const precipValue = (getResultValue("weather", field) as string)?.toLowerCase();
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

    await clickPrecipCheckbox("AMRain", "Am Rain");
    await clickPrecipCheckbox("AMSnow", "Am Snow");
    await clickPrecipCheckbox("PMRain", "Pm Rain");
    await clickPrecipCheckbox("PMSnow", "Pm Snow");
    const savePrecipButton = await page.$("#btnAMPMConditionsSave");
    if (savePrecipButton) {
        await savePrecipButton.click();
        await page.waitForSelector('xpath///*[@id="ajaxFiredWeather2" and contains(., "Saved")]', {timeout: 5000});
        console.log("Saved precipitation information");
    }
}

async function setEffort(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/Effort.aspx`);

    await enterInputText(page, "#txtTotalNumber", "Total Number of Field Counters", getResultValue("effort", "Total Number of Field Counters"));
    await enterInputText(page, "#txtMaximumNumber", "Max Number of Parties", getResultValue("effort", "Max Number of Parties"));
    await enterInputText(page, "#txtMinimumNumber", "Min Number of Parties", getResultValue("effort", "Min Number of Parties"));
    await enterInputText(page, "#txtTotalNumberFeeders", "Total Number of Feeder Counters", getResultValue("effort", "Total Number of Feeder Counters"));
    // Not setting units for these because the website defaults to miles already
    await enterInputText(page, "#txtTransportationHours_13", "Total Hours By Foot", getResultValue("effort", "Total Hours By Foot"));
    await enterInputText(page, "#txtTransportationDistance_13", "Total Miles By Foot", getResultValue("effort", "Total Miles By Foot"));
    // We don't differentiate vehicle types, so just put all vehicle data into "car"
    await enterInputText(page, "#txtTransportationHours_14", "Total Hours By Vehicle", getResultValue("effort", "Total Hours By Vehicle"));
    await enterInputText(page, "#txtTransportationDistance_14", "Total Miles By Vehicle", getResultValue("effort", "Total Miles By Vehicle"));
    await enterInputText(page, "#txtTransportationHours_9", "Total Hours Cross Country Skiing", getResultValue("effort", "Total Hours Cross Country Skiing"));
    await enterInputText(page, "#txtTransportationDistance_9", "Total Hours Cross Country Skiing", getResultValue("effort", "Total Miles Cross Country Skiing"));
    // At the moment we don't have any other transportation types
    await enterInputText(page, "#txtOtherFeedersHours", "Total Hours Feeder Watching", getResultValue("effort", "Total Hours Feeder Watching"));
    // Not supporting owling/noctural effort at the moment
}

async function enterChecklistCounts(page: Page) {
    await page.goto(`${BASE_CBC_URL}/Compiler/BirdChecklist.aspx`);

    const speciesRows = getResultsByType("species");
    let totalSpeciesCount = 0
    for (const species of speciesRows) {
        const commonName = species.name;
        if (!isExpectedMnCbcSpecies(commonName)) {
            continue;
        }
        const count = species.val;
        console.log(`Entering count for ${commonName}: ${count}`);
        await enterChecklistCount(page, commonName, count);
        if(/cwp$/i.test(count)) {
            continue; //don't include "count week" entries in total species count
        }
        if(isAouRealSpecies(commonName)) {
            totalSpeciesCount++;
        }
    }
    await enterTotalSpeciesCount(page, totalSpeciesCount);
}

async function enterChecklistCount(page: Page, speciesCommonName: string, count: number | string) {
    const addSpeciesButton = await page.$("#btnAddSpeciesRow");
    if (addSpeciesButton) {
        await addSpeciesButton.click();
    }
    const timeout = 10000;
    //thank goodness for Chrome dev tools recorder exporting puppeteer code! needed on this one.
    await typeSpeciesName(page, speciesCommonName, timeout);
    const countSelector = "#gvBirdChecklist_tccell0_4 > input[type='text'].count";
    try {
        const countInput = await page.waitForSelector(countSelector, {timeout: 10000});
        if (!countInput) {
            return;
        }
        await enterInputText(page, countSelector, speciesCommonName, `${count}`, 'xpath///*[@id="ajaxError" and contains(., "Saved")]');
    } catch (err) {
        // @ts-ignore
        if (err.message.inludes(`Error: Error: failed to find element matching selector ${countSelector}`)) {
            const notFound = await page.$eval("#gvBirdChecklist_DXMainTable", (el) => el.textContent.includes("No data to display"));
            if (notFound) {
                console.log(`WARNING: Unable to find species ${speciesCommonName} on website checklist, check your CBC results and/or enter it manually.`);
            }
        }
    }
}

async function enterTotalSpeciesCount(page: Page, totalSpeciesCount: number) {
    await page.goto("https://netapp.audubon.org/CBC/Compiler/TotalSpecies.aspx");

    console.log("Entering total species count");
    const totalSpeciesInputSelector = "#TotalSpecies";
    await enterInputText(page, totalSpeciesInputSelector, "Total Species Count", totalSpeciesCount);
    await page.waitForSelector('xpath///*[@id="ajaxFiredTotalSpecies" and contains(., "Saved")]', {timeout: 5000});
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
