## CBC Utils

I'm the coordinator for the [Bloomington, MN Christmas Bird Count (CBC)](https://www.bloomingtoncbc.org/). This project is a collection of utilities to help with the CBC.

I have a bunch of things scattered about at the moment, and I'm working to organize them and build up a comprehensive set of tools. My motivation
for doing this is that my count circle is very complex, containing 24 areas over which I have to manage 50+ participants, and compile data from a few
dozen count sheets, then enter all of that info into two different websites (Audubon and MOU). I'm trying to make this process easier for myself, and less
error-prone. Maybe this will help other circle coordinators as well.

I manage everything in Google, because it includes all of the tools which makes it much more convenient to manage. This includes:

* Gmail - separate email account for the count (bloomingtonmncbc@gmail.com)
  * Can also use aliases such as bloomingtonmncbc+signup@gmail.com to capture new participant signups
* Google Groups - mailing list for the group. All participants must be members of the group to receive emails.
* Google Forms - new participant signup form, and previous count participant registration form
* Google Sites - website for the count circle (https://www.bloomingtoncbc.org/)
* Google Sheets - main data management for participants, area assignments, count results, etc.
* Google Maps - mapping the count circle areas, and overlay eBird hotpots/recent sightings within the count circle
* Google App Scripts - to help automate some tasks within Google Sheets and Gmail
* Google Drive - to store count sheets and other documents
* Google Gemini - AI tool (similar to ChatGPT) to help extract data from count sheets, and generate summaries

Mainly what's here right now is:

1. Mapping utilities to pull recent eBird sightings within the count circle, and generate CSV/KML files that can be imported into Google Maps.
1. AI utilities to help extract data from submitted count sheets, created CSVs from that, and generate summaries.
1. Google Apps Scripts to help process CBC data in Google Sheets (checking results from AI transcribed totals).
1. Scripts to help automate data entry into the Audubon CBC website, leveraging Puppeteer to automate web browser actions.
2. Scripts to help with participant management, and documentation/examples of my process and tools I use for that.

This is still very much a work in progress. I will add more documentation and examples as I get time.
