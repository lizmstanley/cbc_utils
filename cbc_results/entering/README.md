## Entering CBC Data

This directory contains utilities to automate entering Christmas Bird Count (CBC) data.

Since here in MN not only do we have to enter data into the Audubon CBC website, but  also into the Missouri Ornithologists' Union (MOU) website, 
I plan to implement Puppeteer for both. Neither site provides an API or a way to upload CSV files, so scraping the website is a workaround 
to automate the data entry process. Both sites are rather dated, and unsophisticated in their auth/security (thankfully) which makes this somewhat
easy to do. 

## Next steps

* Finish the Aububon CBC data entry automation.
* Add the ability to read from a CSV file with the CBC data to be entered.
* Implement MOU data entry automation, similar to the Audubon one.
* Add some example CSV files.
* Wrap the Nodejs code in a Python wheel for easier execution.  