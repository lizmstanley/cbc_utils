import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {dirname} from 'path';
import {fileURLToPath} from "url";
import {initializeDatabase} from "../util/database";
import {
    CbcResultRow,
    enterInputText,
    findTableRowWithText,
    getQualifiedResultValue,
    getResultsByTypeAndName,
    isExpectedMnCbcSpecies,
    selectOptionWithText,
} from "../util/common-utils";
import {encode as xpathEncode} from 'html-entities';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({path: path.join(__dirname, '.mou.env')});

const COMPILER_FIRST_NAME = process.env.COMPILER_FIRST_NAME;
const COMPILER_LAST_NAME = process.env.COMPILER_LAST_NAME;
const LOGIN_NAME = `${COMPILER_LAST_NAME}, ${COMPILER_FIRST_NAME}`;
const PASSWORD = process.env.PASSWORD;
const COUNT_YEAR = process.env.COUNT_YEAR;
const SHOW_BROWSER = !!process.env.SHOW_BROWSER;
const BASE_CBC_URL = 'https://moumn.org/CBC/';
const LOGIN_URL = `${BASE_CBC_URL}/compilers_login.php`;
const COMPILER_PAGE_URL = `${BASE_CBC_URL}/compilers_control.php`;

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
        await page.goto(COMPILER_PAGE_URL);
        await clickWeatherEffortLink(page);
        await setEffort(page);
        await setWeather(page);
        await page.goto(COMPILER_PAGE_URL);
        await clickEditDataLink(page);
        await enterChecklistCounts(page);
        await page.goto(COMPILER_PAGE_URL);
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

    console.log(`Logging in as: ${LOGIN_NAME}`);

    const selectedLogin = await selectOptionWithText(page, LOGIN_NAME, "select[@name='id']");
    console.log(`Selected compiler id: ${selectedLogin}`);
    await page.focus('input[type="password"]');
    await page.keyboard.type(PASSWORD!);
    await page.click('input[type="submit"][name="submit"][value="Login"]');

    if (!(await isAuthenticated(page))) {
        throw new Error("Login failed: Authentication cookie not found");
    }

    const invalidLoginMessage = await page.$("xpath//html/body/table/tbody/tr[3]/td[2]/font/p[1]/font[contains(text(), 'The password entered does not match the password on file!')]");
    if (invalidLoginMessage) {
        if ((await invalidLoginMessage.evaluate(el => el.textContent))?.includes("The password entered does not match the password on file!")) {
            throw new Error("Login failed: Invalid credentials");
        }
    }

    console.log('Checking for login confirmation page');
    const compilersLoginPageMessage = await page.waitForSelector(`xpath///html/body/table/tbody/tr[3]/td[2]/h3/font[contains(text(), "${xpathEncode(COMPILER_FIRST_NAME)} ${xpathEncode(COMPILER_LAST_NAME)}'s Compiler Page")]`, {timeout: 5000});

    if (!compilersLoginPageMessage) {
        throw new Error('Login confirmation not found, login may have failed');
    }
    console.log('Login successful');
}

async function clickWeatherEffortLink(page: Page) {
    const editWeatherEffortLink = await page.$("body > table > tbody > tr:nth-child(3) > td:nth-child(2) > font > table > tbody > tr:nth-child(3) > td:nth-child(5) > a");
    // The link won't exist if weather and effort have already been submitted
    if (editWeatherEffortLink) {
        console.log(`Clicking Weather and Effort link`);
        await editWeatherEffortLink.click();
        await page.waitForNavigation();
    }
}

async function setEffort(page: Page) {
    const inputOptions = {pressEnter: false};

    const feederWatchingHours = getQualifiedResultValue("effort", "hours", "feeder");
    const totalHoursByFoot = getQualifiedResultValue("effort", "hours", "foot");
    const totalHoursByVehicle = getQualifiedResultValue("effort", "hours", "vehicle");
    const totalHoursCrossCountrySkiing = getQualifiedResultValue("effort", "hours", "cross country ski");
    const totalEffortHours = Number(feederWatchingHours) + Number(totalHoursByFoot) + Number(totalHoursByVehicle) + Number(totalHoursCrossCountrySkiing);

    // MOU is all imperial units. The database supports metric so a future improvement could be to convert if needed.
    const totalMilesByFoot = getQualifiedResultValue("effort", "distance", "foot");
    const totalMilesByVehicle = getQualifiedResultValue("effort", "distance", "vehicle");
    const totalMilesCrossCountrySkiing = getQualifiedResultValue("effort", "distance", "cross country ski");
    const totalEffortMiles = Number(totalMilesByFoot) + Number(totalMilesByVehicle) + Number(totalMilesCrossCountrySkiing);

    await enterInputText(page, "input[name='pers']", "Total Number of Field Counters", getQualifiedResultValue("effort", "counters", "field"), inputOptions);
    await enterInputText(page, "input[name='prty']", "Max Number of Parties", getQualifiedResultValue("effort", "parties", "max"), inputOptions);
    await enterInputText(page, "input[name='feed']", "Total Number of Feeder Counters", getQualifiedResultValue("effort", "counters", "feeder"), inputOptions);
    await enterInputText(page, "input[name='feedhrs']", "Total Hours Feeder Watching", feederWatchingHours, inputOptions);
    await enterInputText(page, "input[name='fthrs']", "Total Hours By Foot", totalHoursByFoot, inputOptions);
    await enterInputText(page, "input[name='ftmi']", "Total Miles By Foot", totalMilesByFoot, inputOptions);
    await enterInputText(page, "input[name='carhrs']", "Total Hours By Vehicle", totalHoursByVehicle, inputOptions);
    await enterInputText(page, "input[name='carmi']", "Total Miles By Vehicle", totalMilesByVehicle, inputOptions);
    await enterInputText(page, "input[name='skihrs']", "Total Hours Cross Country Skiing", totalHoursCrossCountrySkiing, inputOptions);
    await enterInputText(page, "input[name='skimi']", "Total Miles Cross Country Skiing", totalMilesCrossCountrySkiing, inputOptions);
    //not supporting owling miles at this time
    await enterInputText(page, "input[name='tothrs']", "Total Effort Hours", totalEffortHours, inputOptions);
    await enterInputText(page, "input[name='totmi']", "Total Effort Miles", totalEffortMiles, inputOptions);
}

async function setWeather(page: Page) {

    const inputOptions = {pressEnter: false};

    await enterInputText(page, "input[name='lotemp']", "Temperature Min", getQualifiedResultValue("weather", "temperature", "min"), inputOptions);
    await enterInputText(page, "input[name='hitemp']", "Temperature Max", getQualifiedResultValue("weather", "temperature", "max"), inputOptions);
    await enterInputText(page, "input[name='wdir']", "Wind Direction", getQualifiedResultValue("weather", "wind", "direction"), inputOptions);
    await enterInputText(page, "input[name='wlo']", "Wind Velocity Min", getQualifiedResultValue("weather", "wind velocity", "min"), inputOptions);
    await enterInputText(page, "input[name='whi']", "Wind Velocity Max", getQualifiedResultValue("weather", "wind velocity", "max"), inputOptions);

    // snow
    const snowDepthMin = getQualifiedResultValue("weather", "snow depth", "min") || 0;
    const snowDepthMax = getQualifiedResultValue("weather", "snow depth", "max") || 1;
    await enterInputText(page, "input[name='snow']", "Snow Depth Min", ((Number(snowDepthMax) + Number(snowDepthMin)) / 2).toString(), inputOptions);

    const stillWaterIce = getQualifiedResultValue("weather", "water body", "still");
    const movingWaterIce = getQualifiedResultValue("weather", "water body", "moving");

    await selectOptionWithText(page, stillWaterIce as string, "select[@name='stl']");
    await selectOptionWithText(page, movingWaterIce as string, "select[@name='mov']");

    // cloud cover - need to translate from some NAS values to MOU values
    function getCloudCoverSelectText(resultRow: CbcResultRow): string {
        if (!resultRow) {
            return "not available";
        }
        switch (resultRow.value) {
            case "partly clear":
                return "partly cloudy"
            case "cloudy":
                return "overcast"
            case "local fog":
                // mou specific
                return "light fog"
            case "foggy":
                // mou specific
                return "moderate fog";
            default:
                return resultRow.value;
        }
    }

    const allCloudCover = getResultsByTypeAndName("weather", "cloud cover");
    // Should only be one am and one pm cloud cover entry
    const amCloudCover = allCloudCover.filter(cloud => cloud.qualifier === "am");
    const pmCloudCover = allCloudCover.filter(cloud => cloud.qualifier === "pm");
    if (amCloudCover.length > 1) {
        console.warn(`Multiple AM cloud cover entries found, only the first will be used. Manual intervention may be required.`);
    }
    if (pmCloudCover.length > 1) {
        console.warn(`Multiple PM cloud cover entries found, only the first will be used. Manual intervention may be required.`);
    }
    await selectOptionWithText(page, getCloudCoverSelectText(amCloudCover ? amCloudCover[0] : amCloudCover), "select[@name='amcld']");
    await selectOptionWithText(page, getCloudCoverSelectText(pmCloudCover ? pmCloudCover[0] : pmCloudCover), "select[@name='pmcld']");

    function getPrecipSelectText(precipType: string | null, precipIntensity: string | null): string {

        if (!precipType) {
            return "not available";
        }
        if (precipType === "none") {
            return "none";
        }
        switch (precipType) {
            case "rain":
                if (precipIntensity === "light") {
                    return "light rain";
                }
                if (precipIntensity === "moderate") {
                    return "moderate rain";
                }
                if (precipIntensity === "heavy") {
                    return "heavy rain";
                }
                if (precipIntensity === "intermittent") {
                    return "intermittent rain";
                }
                return "rain";
            case "combination":
                if (precipIntensity === "intermittent") {
                    return "intermittent combination";
                }
                if (precipIntensity === "light") {
                    return "light combination";
                }
                if (precipIntensity === "moderate") {
                    return "moderate combination";
                }
                if (precipIntensity === "heavy") {
                    return "heavy combination";
                }
                return "not available";
            case "snow":
                if (precipIntensity === "light") {
                    return "light snow";
                }
                if (precipIntensity === "moderate") {
                    return "moderate snow";
                }
                if (precipIntensity === "heavy") {
                    return "heavy snow";
                }
                if (precipIntensity === "intermittent") {
                    return "intermittent snow";
                }
                return "snow"
            default:
                return precipType;
        }
    }

    // going with NAS precip model for now
    const amRain = getQualifiedResultValue("weather", "precip rain", "am");
    const amSnow = getQualifiedResultValue("weather", "precip snow", "am");
    const pmRain = getQualifiedResultValue("weather", "precip rain", "am");
    const pmSnow = getQualifiedResultValue("weather", "precip snow", "am");
    const didRainAm = !!amRain && amRain !== "none" && amRain !== "unknown";
    const didSnowAm = !!amSnow && amSnow !== "none" && amSnow !== "unknown";
    const noAmPrecip = amRain === "none" && amSnow === "none";
    const unknownAmPrecip = amRain === "unknown" && amSnow === "unknown";
    const didRainPm = !!pmRain && pmRain !== "none" && pmRain !== "unknown";
    const didSnowPm = !!pmSnow && pmSnow !== "none" && pmSnow !== "unknown";
    const noPmPrecip = pmRain === "none" && pmSnow === "none";
    const unknownPmPrecip = pmRain === "unknown" && pmSnow === "unknown";

    function getPrecipType(didRain: boolean, didSnow: boolean, noPrecip: boolean, unknownPrecip: boolean): string | null {
        if (didRain && didSnow) {
            return "combination";
        } else if (didRain) {
            return "rain";
        } else if (didSnow) {
            return "snow";
        } else if (noPrecip) {
            return "none";
        } else if (unknownPrecip) {
            return "not available";
        } else {
            return null;
        }
    }

    function getPrecipIntensity(rainVal: string, snowVal: string): string | null {
        if (rainVal === "heavy" || snowVal === "heavy") {
            return "heavy";
        } else if (rainVal === "light" || snowVal === "light") {
            return "light";
        } else {
            return null;
        }
    }

    let amPrecipType = getPrecipType(didRainAm, didSnowAm, noAmPrecip, unknownAmPrecip);
    let amPrecipIntensity = getPrecipIntensity(amRain as string, amSnow as string);
    let pmPrecipType = getPrecipType(didRainPm, didSnowPm, noPmPrecip, unknownPmPrecip);
    let pmPrecipIntensity = getPrecipIntensity(pmRain as string, pmSnow as string);
    const amPrecipSelectText = getPrecipSelectText(amPrecipType, amPrecipIntensity);
    const pmPrecipSelectText = getPrecipSelectText(pmPrecipType, pmPrecipIntensity);

    await selectOptionWithText(page, amPrecipSelectText, "select[@name='ampcp']");
    await selectOptionWithText(page, pmPrecipSelectText, "select[@name='pmpcp']");

    // Require manual intervention to submit as complete
    const notCompleteRadio = await page.$("#no");
    if (notCompleteRadio) {
        console.log("Setting Weather and Effort form as not complete");
        await notCompleteRadio.click();
        const submitWeatherEffortButton = await page.$('input[type="submit"][name="send"]');
        if (submitWeatherEffortButton) {
            console.log("Submitting Weather and Effort form");
            await submitWeatherEffortButton.click();
            await page.waitForNavigation();
        }
    }
}

async function clickEditDataLink(page: Page) {
    console.log(`Clicking Edit Data link`);

    const editDataLink = await page.$("body > table > tbody > tr:nth-child(3) > td:nth-child(2) > font > table > tbody > tr:nth-child(3) > td:nth-child(4) > a");
    // The link won't exist if data has already been submitted
    if (editDataLink) {
        await editDataLink.click();
        const countYearText = await page.waitForSelector(`xpath///html/body/table/tbody/tr[3]/td/h2[contains(text(), ${xpathEncode(COUNT_YEAR)})]`, {timeout: 5000});
        if (!countYearText) {
            throw new Error(`Count year ${COUNT_YEAR} not found on checklist page`);
        }
    }
}

async function enterChecklistCounts(page: Page) {
    const speciesRows = getResultsByTypeAndName("species", "count");
    const dataForm = await page.$("xpath///html/body/table/tbody/tr[6]/td/form");
    if (!dataForm) {
        throw new Error('Count entry form not found');
    }
    for (const speciesRow of speciesRows) {
        await enterChecklistCount(page, speciesRow);
    }
    // Click the "not ready for review" radio button - must click yes manually to submit for CBC review
    const readyForReviewButton = await page.$("#no");
    if (readyForReviewButton) {
        await readyForReviewButton.click();
        // Submit the form
        const submitButton = await page.$('input[type="submit"][name="submit"][value="SUBMIT"]');
        if (submitButton) {
            console.log("Submitting checklist form");
            await submitButton.click();
            await page.waitForNavigation();
        }
    }
}


async function enterChecklistCount(page: Page, resultRow: CbcResultRow) {
    if (!isExpectedMnCbcSpecies(resultRow.qualifier)) {
        return;
    }
    console.log(`Entering count for ${resultRow.qualifier}: ${resultRow.value}`);

    const speciesTableRow = await findTableRowWithText(page, resultRow.qualifier)
    if (!speciesTableRow) {
        console.warn(`Skipping species ${resultRow.qualifier}`);
        return;
    }
    const cells = await speciesTableRow.$$('td');
    if (resultRow.value === 'cw') {
        // Check the checkbox in the CW cell
        const cwCheckbox = await cells[3].$('input[type="checkbox"]');
        if (cwCheckbox) {
            const cwCheckboxName = await page.evaluate(cwCheckbox => cwCheckbox.getAttribute("name"), cwCheckbox);
            const checkboxSelector = `input[name='${cwCheckboxName}']`;
            const isChecked = await page.$eval(checkboxSelector, checkbox => (checkbox as HTMLInputElement).checked);
            if (!isChecked) {
                await page.click(checkboxSelector);
            }
        }
    } else {
        // Enter count in the second and third cell inputs
        const countMnInput = await cells[1].$('input[type="text"]');
        const countTotalInput = await cells[2].$('input[type="text"]');
        if (countMnInput) {
            const countMnTextInputName = await page.evaluate(countMnInput => countMnInput.getAttribute("name"), countMnInput);
            await enterInputText(page, `input[name='${countMnTextInputName}']`, `MN Count for ${resultRow.qualifier}`, resultRow.value, {pressEnter: false});
        }
        if (countTotalInput) {
            const countTotalInputName = await page.evaluate(countTotalInput => countTotalInput.getAttribute("name"), countTotalInput);
            await enterInputText(page, `input[name='${countTotalInputName}']`, `Total Count for ${resultRow.qualifier}`, resultRow.value, {pressEnter: false});
        }
    }
}

async function logout(page: Page) {
    console.log("Logging out");
    await page.goto("https://moumn.org/CBC/compilers_logout.php");
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
    if (!COUNT_YEAR) {
        console.error('COUNT_YEAR NAME must be set in environment variables.');
        process.exit(1);
    }
    initializeDatabase();
    await main();
     console.log(`Next steps that need to be done manually:`
        + `\n 1. Review the README in this project`
        + `\n 2. Review the entered data on the MOU CBC website.`
        + `\n 3. Enter any additional species comments/documentation as needed.`
        + `\n 4. Add any species not appearing on the circle species list via the dropdown at the bottom of the species list.`
        + `\n 5. After all required sections are complete, select the radio button at the bottom of the weather/effort page, and the species data page, to indicate the data is complete and ready for review.`
    );
})();
