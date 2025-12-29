import * as puppeteer from 'puppeteer';
import {Page} from 'puppeteer';
import * as dotenv from 'dotenv';

dotenv.config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const CIRCLE_NAME = process.env.CIRCLE_NAME;
// This url works for login without having to wait at all!
const LOGIN_URL = 'https://netapp.audubon.org/aap/application/cbc';
// Once we're in, use this base URL for navigation
const BASE_CBC_URL = 'https://netapp.audubon.org/CBC';

async function main() {
    const browser = await puppeteer.launch({headless: true});
    const page: Page = await browser.newPage();
    try {
        await login(page);
        await selectCircle(page);
        await setStartEndTime(page);
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
    await page.type('input[type="text"]', EMAIL || '');
    await page.type('input[type="password"]', PASSWORD || '');
    await page.click('#contentMain_rpnlLogin_bLogin');
    await page.waitForNavigation({timeout: 10000});

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
        console.error('EMAIL and PASSWORD must be set in environment variables.');
        process.exit(1);
    }
    if (!CIRCLE_NAME) {
        console.error('CIRCLE NAME must be set in environment variables.');
        process.exit(1);
    }
    await main();
})();
