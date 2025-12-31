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

It's error prone and time consuming. I have gotten to the point of being so annoyed by it all, 
that I am going to automate the whole thing to make my life easier, and if you are reading this, hopefully yours too.

Since here in MN not only do we have to enter data into the Audubon CBC website, but  also into the Missouri Ornithologists' Union (MOU) website, 
I plan to implement Puppeteer for both. Neither site provides an API or a way to upload CSV files, so scraping the website is a workaround 
to automate the data entry process. Both sites are rather dated, and unsophisticated in their auth/security (thankfully) which makes this somewhat
easy to do. 

These tools are written in Typescript and run on Node.js. The main reason for that is to use Puppeteer, which is a well known web scraping library. 
This way we can programmatically access the websites, login, and enter data.

## Setup

This project is written in Typescript and runs in Node.js.
Note that I am doing this on Linux, so if you're on Windows or Mac, your specific steps may be slightly different.

1. Clone this project
2. Install NVM (Node Version Manager), see https://github.com/nvm-sh/nvm
   3. Some easier instructions (for Linux/Mac/Windows) here: https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/
3. At a terminal in this (`cbc-results/data-entry`) directory, execute `nvm install $(cat .nvmrc)` to install the correct Node version
4. `nvm use` to switch to that Node version
5. Run `npm install` to install the project dependencies
6. Copy the sample env file: `cp sample.env .env` 
7. Edit the `.env` file to add your Audubon CBC credentials and the name of your CBC circle (the one you select from the menu on the compiler page.)
8. `npm run build` to compile the Typescript code
9. `npm run start-aububon` to run the Audubon CBC data entry script

## Next steps

* Finish the Aububon CBC data entry automation.
* Add the ability to read from a CSV file with the CBC data to be entered.
* Implement MOU data entry automation, similar to the Audubon one.
  * There will probably be some amount of code reorganization as I work through the MOU implementation.
* Add some example CSV files.
* Wrap the Nodejs code in a Python wheel for easier execution.  