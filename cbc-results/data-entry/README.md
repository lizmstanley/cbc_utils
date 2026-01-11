## Entering CBC Data

### Intro, aka Liz's mini-rant about current state of CBC data entry

This is to help automate the data entry for the [Audubon Christmas Bird Count (CBC)](https://www.audubon.org/community-science/christmas-bird-count).
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

Since here in MN not only do we have to enter data into the [Audubon CBC website](https://netapp.audubon.org/aap/application/cbc), but also into the [Minnesota Ornithologists' Union (MOU) website](https://moumn.org/CBC/), 
I plan to implement Puppeteer for both. Neither site provides an API or a way to upload CSV files, so scraping the website is a workaround 
to automate the data entry process. Both sites are rather dated, and unsophisticated in their auth/security (thankfully) which makes this somewhat
easy to do. 

These tools are written in TypeScript and run on Node.js. The main reason for that is to use [Puppeteer](https://pptr.dev/), which is a well known web scraping library. 
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
7. Edit the `.env` file to update any general environment variables you want to set, if you want to change from the defaults.
   For example, you can change the name of the CSV file that contains your CBC results data
8. For Audubon CBC data entry:
   1. In the `data-entry/audubon` directory, copy the sample .env file: `cp sample.audubon.env .audubon.env`
   1. Edit `.audubon.env` file to add your Audubon CBC credentials and the name of your CBC circle (the one you select from the menu on the compiler page.)
9. For MOU CBC data entry:
   1. In the `data-entry/mou` directory, copy the sample .env file: `cp sample.mou.env .mou.env`
   1. Edit `.mou.env` add your MOU CBC credentials and the count year.
8. `npm run build` to compile the Typescript code
9. `npm run start-aububon` to run the Audubon CBC data entry script
10. `npm run start-mou` to run the MOU CBC data entry script
11. At any time, if needed, you can run `npm run load-db` to reload the database from the CSV files

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
  * The file needs to be saved in `data-entry/csv-data-files`
  * The default file name is `cbc-results.csv`, but you can change that by setting the `RESULTS_CSV_FILE` environment variable in the `data-entry/.env` file.

The tables in the database are:
* `mn_cbc_species` - list of MN CBC species (csv already included in this project)
* `aou_real_species` - list of NACC (AOU "real") species (csv already included in this project)
* `cbc_results` - the CBC data for your count circle (this is the only file you need to provide)
* `data_load_status` - tracks when the data was last loaded 

The data will be loaded automatically when you run either of the data entry scripts (Audubon or MOU).
To force reload of all existing data from the CSV files into the database, set FORCE_DATA_LOAD=true to in the `data-entry/.env` file.
This will drop all tables and reload from the CSV files on the next run. Set back to false after that.
Alternatively, you can run `npm run load-db` to reload the data at any time, which will force a reload. For example, if you make some corrections to your result csv file,
you would want to reload the database before running the data entry scripts again.

The cbc-results.csv can be generated from a spreadsheet or other tool. It must be structured as described below.
There are 4 comma separated entries on each line.  Each line is of the form:
result_type, result_name,result_qualifier,result_value. For example:

```
Type,Name,Qualifier,Value
Time,Start,AM,08:00
Time,End,PM,5:00
Weather,Temperature,Min,10
Weather,Temperature,Max,20
Weather,Temperature,Unit,Fahrenheit
Effort,Counters,Field,63
Effort,Counters,Feeder,4
Effort,Parties,Min,33
Effort,Parties,Max,33
Effort,Hours,Vehicle,71.28
Effort,Hours,Foot,67.398
Species,Count,Wild Turkey,64
Species,Count,Bald Eagle,165
Species,Count,Red-tailed Hawk,30
Species,Count,Red-bellied Woodpecker,77
Species,Count,Downy Woodpecker,126
Species,Count,Gadwall,cw
```

There is a full example (data I actually used from my count circle
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
  * If there is a problem with a species name, review your CSV file and ensure it is found in the [list of MN CBC species](csv-data-files/mn-cbc-species.csv), which is loaded into the database cross-referenced during data entry
    * A future improvement would be to allow the user to provide a file for their state/province's species list
* Set the total number of species
  * Follows the NAS instructions regarding AOU "real" species vs. "countable" species and generic/"sp." entries by cross-referencing with the [NACC species list](csv-data-files/NACC_list_species.csv) that was loaded into the database
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

## MOU Data Entry

### Automated steps
* Login to MOU CBC website
* Navigate to your CBC circle's data entry page
* Set weather data
  * This differs from the NAS website. MOU has different fields and not all are supported yet
* Set effort data
* Enter species counts
  * If there is a problem with a species name, review your CSV file and ensure it is found in the [list of MN CBC species](csv-data-files/mn-cbc-species.csv), which is loaded into the database cross-referenced during data entry
 * Logout of the MOU CBC website

### Steps that must be done manually
* Does not enter additional comments/documentation about species
* Final data submission

### Future improvements
* Cross check MN expected species list for the count circle to call out any species that need documentation. 
  * This list is found by selecting the count circle at https://moumn.org/CBC/locations_map.php, then clicking on "Expected Species List" link.
  * Our official guidance on this is: 
  >Everything on the top list will not need to be documented.
On the bottom list in red or with an asterix will need to be documented. Those in blue probably don't have to be documented. Not on the list, expect to document it.
  * Could probably automate pulling this data into the db for that, which would be much faster.
  * Can also check the same page where data is being entered - occasional and rare species are indicated by the background color of the species name table cell.


## References
* NAS CBC data entry manual: https://media.audubon.org/2025-12/CBCDataEntryManual_2025.pdf
* NACC (AOU "real") species list is pulled from https://checklist.americanornithology.org/
* MN CBC species list is pulled from https://moumn.org/CBC/birds_summary.php

