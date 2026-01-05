## Entering CBC Data

### Intro, aka Liz's mini-rant about current state of CBC data entry

This is to help automate the data entry for the Audubon Christmas Bird Count (CBC).
If you're a CBC compiler, you know that entering data into the Audubon CBC website can be tedious
and quite honestly, frustrating.  

The goal here is to allow uploading a CSV file with the data.
Since Audubon unfortunately doesn't provide an API, or the ability to upload a CSV file directly,
we will work around what I will diplomatically call an outdated interface. 

For myself as a compiler in Minnesota, with a very
complex count circle, I also have to enter the same data in a completely different, but equally
outdated and frustrating MOU website. 

It's error-prone and time-consuming. I have gotten to the point of being so annoyed by it all, 
that I am going to automate the whole thing to make my life easier, and if you are reading this, hopefully yours too.

Since here in MN not only do we have to enter data into the Audubon CBC website, but also into the [Minnesota Ornithologists' Union (MOU) website](https://moumn.org/CBC/, 
I plan to implement Puppeteer for both. Neither site provides an API or a way to upload CSV files, so scraping the website is a workaround 
to automate the data entry process. Both sites are rather dated, and unsophisticated in their auth/security (thankfully) which makes this somewhat
easy to do. 

These tools are written in TypeScript and run on Node.js. The main reason for that is to use Puppeteer, which is a well known web scraping library. 
This way we can programmatically access the websites, login, and enter data.

## Setup

This project is written in TypeScript and runs in Node.js. Please read thoroughly.
Note that I am doing this on Linux, so if you're on Windows or Mac, your specific steps may be slightly different. 
I'm happy to answer questions, but if the answer is found in the README, I may just refer you back here. At some point I would like
to package this up better (single executable), but for now this is a personal project that I'm sharing. Those that some technical/programming
experience will likely have an easier time getting this set up as it exists today.

1. Clone this project
2. Install NVM (Node Version Manager), see https://github.com/nvm-sh/nvm
   3. Some easier instructions (for Linux/Mac/Windows) here: https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/
3. At a terminal in this (`cbc-results/data-entry`) directory, execute `nvm install $(cat .nvmrc)` to install the correct Node version
4. `nvm use` to switch to that Node version
5. Run `npm install` to install the project dependencies
6. Copy the sample general .env file: `cp data-entry/sample.env .env`
7. Edit the `.env` file to update any general environment variables you want to set
6. Copy the sample audubon.env file: `cp data-entry/sample.audbon.env .audubon.env` 
7. Edit the `.audubon.env` file to add your Audubon CBC credentials and the name of your CBC circle (the one you select from the menu on the compiler page.)
8. `npm run build` to compile the Typescript code
9. `npm run start-aububon` to run the Audubon CBC data entry script

## Puppeteer
This project uses Puppeteer to automate web browser actions. This application defaults to showing the browser, so you can watch
as it navigates and types in data. If you want to run it headless (without showing the browser), you can set the SHOW_BROWSER environment variable 
to "false" in the `data-entry/.env` file.

## Database
The application loads data from CSV files into a Sqlite database for easier querying and data integrity.
The database file is `data-entry/cbc-database.db`. If you're comfortable with databases, you can use a Sqlite client to query the data.

The CSV files used to load data into the database are in the `data-entry/csv-data-files/` directory:
* `data-entry/csv-data-files/mn-cbc-species.csv` - list of MN CBC species (from MOU), included in this project. 
* `data-entry/csv-data-files/nacc-species.csv` - list of NACC (AOU "real") species, included in this project. 
* `data-entry/csv-data-files/cbc-results.csv` - the CBC data for your count circle.
  * The file needs to be aved in `data-entry/csv-data-files`
  * The default file name is `cbc-results.csv`, but you can change that by setting the RESULTS_CSV_FILE environment variable in the `data-entry/.env` file.

To force reload of all existing data from the CSV files into the database, set FORCE_DATA_LOAD=true to in the `data-entry/.env` file.
This will truncate all tables and reload from the CSV files on the next run. Set back to false after that.

The cbc-results.csv can be generated from a spreadsheet or other tool. It must be structured as described below.
There are 3 comma separated entries on each line. Do not add a header row. Each line is of the form:
result_type, result_name, result_value. For example:
```
Time,Start,08:00
Time,End,17:00
Weather,Temperature Min,10
Weather,Temperature Max,20
Effort,Min Number of Parties,33
Effort,Total Hours By Vehicle,71.28
Species,Wild Turkey,64
Species,Bald Eagle,165
Species,Red-tailed Hawk,30
Species,Red-bellied Woodpecker,77
Species,Snowy Owl,1
Species,Gadwall,cw
```

Note that the start and end times must be in 24-hour format. There is a full example (data I actually used from my count circle
at `csv-data-files/cbc-results-example.csv`.) Decimal numbers will be rounded.

## NAS Data Entry

### Automated steps
* Login to NAS CBC website
* Navigate to your CBC circle's data entry page
* Enter start and end times
* Set weather data
* Set effort data
  * Right now only supports the following (NAS has more on its form):
    * Total Number of Field Counters
    * Total Number of Feeder Counters
    * Max Number of Parties
    * Min Number of Parties
    * Total Hours By Vehicle (assuming car)
    * Total Hours By Foot
    * Total Hours Feeder Watching
    * Total Miles By Vehicle
    * Total Miles By Foot
    * Total Hours Cross Country Skiing
    * Total Miles Cross Country Skiing
  * Also distance is assumed to be in miles
* Enter species counts
  * If there is a problem with a species name, review your CSV file and ensure it is found in the mn-cbc-species.csv file
* Set the total number of species
  * Follows the NAS instructions regarding AOU "real" species vs. "countable" species and generic/"sp." entries
  * Double check this number before final submission
* Logout of the NAS CBC website

### Steps that must be done manually
* Count date, status and compiler info
* Participants list
  * Note about this: it is broken on the NAS website. I believe that there is a global unique constraint on email address,
when it should be unique on email + count circle. Due to that issue, it's not possible to add/edit some participants if they are
already in the system from another count circle. Hopefully Audubon will fix this at some point. Meanwhile, I can't automate this step because
of it. I'd be happy to help NAS with an effort to fix the database and/or backend but until then I'm not going to 
waste time on this section. I manage my participants list separately anyway.
* Flagging high/low/unusual species
* Entering any special aspects
* Add any other effort data not supported by the automation script
* Change distance units if not in miles
* Final data submission


## References
* NAS CBC data entry manual: https://media.audubon.org/2025-12/CBCDataEntryManual_2025.pdf
* NACC (AOU "real") species list is pulled from https://checklist.americanornithology.org/
* MN CBC species list is pulled from https://moumn.org/CBC/birds_summary.php

