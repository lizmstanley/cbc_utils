## Automating CBC Data Entry on the Audubon CBC Website

This directory contains utilities to automate entering Christmas Bird Count (CBC) data on the Audubon CBC website.

## Setup

This project is written in Typescript and runs in Node.js.
Note that I am doing this on Linux, so if you're on Windows or Mac, your specific steps may be slightly different.

1. Clone this project
2. Install NVM (Node Version Manager), see https://github.com/nvm-sh/nvm
   3. Some easier instructions (for Linux/Mac/Windows) here: https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/
3. At a terminal in this project's `cbc-results/data-entry/audubon` directory, execute `nvm install $(cat .nvmrc)` to install the correct Node version
4. `nvm use` to switch to that Node version
5. Run `npm install` to install the project dependencies
6. Copy the sample env file: `cp sample.env .env` 
7. Edit the `.env` file to add your Audubon CBC credentials and the name of your CBC circle (the one you select from the menu on the compiler page.)
8. `npm run build` to compile the Typescript code
9. `npm run start` to run the program