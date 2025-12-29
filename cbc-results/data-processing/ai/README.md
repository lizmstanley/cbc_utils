## 2025 Bloomington CBC: Liz’s process using AI to extract count data from 27 count sheets

This is my first experiment with using AI to help compile this data. I’m using Google Gemini because I manage everything in the count with Google (sheets, sites, group mailing list, etc.) It was quite accurate in extracting count data from the sheets, whether sent as an image or a PDF, even when there was extraneous info on the sheet. The goal here is to improve accuracy which is very difficult to do when I have to hand transcribe these. And also save me time when there are so many results to process. Having gone through this, I can definitely say it was a huge time saver. As always with AI, make sure to check results! It’s a tool that is most effectively used by people who know what they are doing in the first place, not just blindly accepting whatever it tells you.
Below are the steps I have used, with pretty accurate results. I will add examples and more documentation.

1. Accept only digital or physical copies of the count sheet. Do not accept results as the body of an email, an eBird checklist, wrong count sheet etc. Everything needs to be submitted on the required sheet. If a physical sheet was submitted, take a picture and upload it yourself. I think I have beat this drum enough where almost everyone is quite cooperative at this point.
1. Upload to Google Drive under CBC Results > 2025 > Count Sheets
1. Rename with format “Area [number] - [submitter name]”.pdf (or jpg.) It’s easier to track who sent what this way, and line back it up with my main area assignment spreadsheet.
1. Update your extremely organized main spreadsheet to indicate that results have been received (I added a checkbox for that).
1. Email anyone who hasn’t submitted
1. Email submitters with follow up questions if needed
1. Add any notes/comments/reminders for myself, that I may need to note for next year’s count.
1. Create a new Google sheet for area results, with a separate tab for each area count result submitted.
1. Name the tabs according to the area: Area 1, Area 2, etc.
1. If more than one sheet for area use decimals like Area 17.1, Area 17.2
1. Start a new chat in Google Gemini. Then for each count sheet:
1. Drop the form (image/pdf) into the chat
1. The initial prompt: “extract the data from the table in this image to a csv, include both the header information and the species table in the csv. separate the different total hours and total miles into their own rows. Display the complete result here in csv that I can copy into google sheets”
1. Because people won’t follow directions no many how many times they are told, you may also need to prompt things like “ensure the total hour values are represented as decimal values”
1. Edit out other clutter that people always put on the sheets (like whether something was flyover/juvenile, etc, or guestimates (things like “possible”, ~, +/-)  even though they are instructed just to put a number for the species count. And make a note to remind people not to do that. JUST A NUMBER.
1. Gemini seemed to have no problem with species counts which had math (example: 2+1 as the value instead of just 3) even though people were instructed NOT to put math on the sheets. So that probably doesn’t need to be edited out, but deserves a light hand slap.
1. Copy paste the Gemini output into the Area tab in the result sheet.
1. It will be copied as text, but when you paste in the sheet, there will be a small popup that allows you to separate the results into columns. Do that.
1. With the actual submitted count sheet file open, go over the results by comparing them with the original count sheet, to ensure they are correct. 99% of them are correct, but there will be a few things that need to be adjusted.
1. During this process, go ahead and email the submitter with any follow up questions, it’s easier while going through it and things are top of mind.
1. Assuming the output has been satisfactory, just repeat the process in the same chat. Prompt “process this form the same way as the previous”, or “another form” and drop the next one into the chat box. Don’t merge any results at this point, because each individual extraction needs to be checked for accuracy. Sometimes it will be a wrong number, missing a species, or it will add a species. But it’s actually quite rare for that to happen - the extraction is impressively accurate.
1. When done with all of the areas, export the entire Google sheet to an excel file, which will be downloaded. Gemini didn’t do a good job accessing the Google sheet directly, so it was easier to just upload this file in a separate chat for the totals and summary.
1. Prompt with “In the uploaded spreadsheet,  calculate the sums of all of the numeric data in the existing tabs. Break it down by taking the sum of each of the total number of area participants, area parties, each total hours row and total miles row, and each of the individual species counts. Output the results as csv in the same format seen in these sheets. Display the complete result here in csv that I can copy into google sheets”.
1. Copy paste that into a new Google sheet for the result totals. Be sure to select “split text into columns”.
1. In Gemini, prompt “Summarize some fun facts from the total results, and highlights from each area”. Copy paste those into the sheet.
1. Prompt with “write a 2 paragraph summary of the count, suitable for publication in the mrvac trumpeter newsletter. also mention the weather conditions during the count, held on dec 20, 2025 in bloomington mn.” 
1. If that result is too goofy (which it was): "make it more factual and less AI sounding”
1. Continue to prompt as needed, for example: “be sure to emphasize how windy it was that day. Also round all of the decimals to the nearest whole number”
1. Edit the result as needed.
1. The results can be checked by doing some calculations in the result spreadsheet, and/or writing some scripts to compare the total values that Gemini output, against calculated totals from the area results sheet. This can be done in Google Apps Script directly on the spreadsheet. For example I wrote a script which goes through all of the tabs in the area results spreadsheet, look for the cell that has “Total Hours by Vehicle” and take the total sum across all areas. Does it match what Gemini said?
