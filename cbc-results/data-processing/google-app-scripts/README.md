## Google Apps Scripts for CBC Data Processing

This directory collection of scripts that can be used to process Christmas Bird Count (CBC) data 
using Google Apps Scripts for Google Sheets. These are run from directly within a Google Sheets document.

The example spreadsheet illustrates how I have structured the count data.

* This spreadsheet lives in Google Sheets - I downloaded it as an XLS file to include in the repository for reference.
* Each tab represents an individual each count sheet that was submitted (either in person or by email.)
  * Most areas consolidate and submit one sheets, but sometimes there are multiple parties who submit separate sheets for the same area, hence the numbering scheme such as 17.1 and 17.2.
* The area count data was extracted from the count sheets
(PDF or jpg files) using Google Gemini AI (similar to ChatGPT). 
  * The extracted data was pasted into the appropriate tab for each area.
  * I checked each result against the actual count sheet and made a few corrects, but for the most part it was very accurate.
  * For the purpose this example, I changed the compiler name and email address to protect privacy.
* The Totals tab was created by using Google Gemini to sum up all of the area tabs. Again, I checked the results against calculated totals from the area tabs.
* The TimeWeather tab was filled in manually, and the fields there reflect what is expected on the Audubon CBC website. 
* CircleTotals were created by running the Google Apps Script circleAreaTotalResults.gs
  * I could use AI to calculate these totals, but I have to check the results anyway, so I might as well do it myself with a script.

The spreadsheet will then be used as input to the Audubon CBC data entry automation script.
