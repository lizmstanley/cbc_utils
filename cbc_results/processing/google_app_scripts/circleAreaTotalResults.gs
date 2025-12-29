//Calculate full circle totals across set of tabs containing CBC data extracted from submitted count sheets.
//Each tab represents a count sheet submitted for an area.
//This will create a new tab containing the calculated totals for the circle.
function calculateFullCircleTotals(cell) {
  const circleResultsSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  //new tab to contain calculated totals for the full circle (delete if already exists)
  let circleTotalsTab = circleResultsSpreadsheet.getSheetByName("Circle Totals");
  if (circleTotalsTab) {
    circleResultsSpreadsheet.deleteSheet(circleTotalsTab);
  }
  circleTotalsTab = circleResultsSpreadsheet.insertSheet("Circle Totals", circleResultsSpreadsheet.getNumSheets());
  const areaTabs = circleResultsSpreadsheet.getSheets().filter(tab => tab.getName().startsWith("Area "));

  //Hold totals in memory for batch write
  const circleEffortTotalsMap = new Map();
  const circleSpeciesCountsMap = new Map();
  areaTabs.forEach(areaTab => {
    const areaName = areaTab.getName();
    Logger.log(`Calculating circle totals for ${areaName}...`);
    updateCircleEffortTotals(areaTab, circleEffortTotalsMap);
    updateCircleSpeciesCounts(areaTab, circleSpeciesCountsMap);
    Logger.log(`...calculated circle totals for ${areaName}`);
  });
  const circleEffortTotalsBatch = [...circleEffortTotalsMap];
  const circleSpeciesCountsBatch = [...circleSpeciesCountsMap];
  circleTotalsTab.appendRow(["Effort", "Total"]);
  if(circleEffortTotalsBatch.length) {
    circleTotalsTab.getRange(circleTotalsTab.getLastRow() + 1, 1, circleEffortTotalsBatch.length, 2).setValues(circleEffortTotalsBatch);
  }
  circleTotalsTab.insertRowsAfter(circleTotalsTab.getLastRow(), 1);
  circleTotalsTab.insertRowsAfter(circleTotalsTab.getLastRow(), 1);
  circleTotalsTab.appendRow(["Species", "Total"]);
  if(circleSpeciesCountsBatch.length) {
    circleTotalsTab.getRange(circleTotalsTab.getLastRow() + 1, 1, circleSpeciesCountsBatch.length, 2).setValues(circleSpeciesCountsBatch);
  }
  const totalSpeciesIndividuals = circleSpeciesCountsBatch.reduce((totalIndividuals, species) => {
    return totalIndividuals + species[1];
  }, 0);
  circleTotalsTab.insertRowsAfter(circleTotalsTab.getLastRow(), 1);
  circleTotalsTab.insertRowsAfter(circleTotalsTab.getLastRow(), 1);
  circleTotalsTab.appendRow(["Total Individuals", totalSpeciesIndividuals]);
}

function updateCircleEffortTotals(areaTab, circleEffortTotalsMap) {
  //find rows starting with "Total"
  const areaEffortTotalsFinder = areaTab.createTextFinder("^Total ").useRegularExpression(true);
  const areaEffortTotalsRows = areaEffortTotalsFinder.findAll();
  areaEffortTotalsRows.forEach(areaEffortTotalsRow => {
    updateCircleTotalVal(areaEffortTotalsRow.getRow(), areaTab, circleEffortTotalsMap);
  });
}

function updateCircleSpeciesCounts(areaTab, circleSpeciesCountsMap) {
  // Find the row labeled "Species" and then grab all non empty rows after that
  const areaSpeciesSectionFinder = areaTab.createTextFinder("^Species$").useRegularExpression(true);
  const areasSpeciesSectionRow = areaSpeciesSectionFinder.findNext();
  const firstSpeciesRow = areasSpeciesSectionRow.getRow() + 1;
  const lastSpeciesRow = areaTab.getLastRow();
  for (let currentSpeciesRow = firstSpeciesRow; currentSpeciesRow <= lastSpeciesRow; currentSpeciesRow++) {
    updateCircleTotalVal(currentSpeciesRow, areaTab, circleSpeciesCountsMap);
  }
}

function updateCircleTotalVal(areaTotalsRow, areaTab, totalsMap) {
  const areaTotalLabel = areaTab.getRange(areaTotalsRow, 1).getValue();
  if (/(species|sp(\.)?)$/i.test(areaTotalLabel)) {
    Logger.log(`WARN - skipping non specific species name ${areaTotalLabel}`);
    return;
  }
  const areaTotalValue = areaTab.getRange(areaTotalsRow, 2).getValue();
  if (isNaN(areaTotalValue - parseFloat(areaTotalValue))) {
    Logger.log(`WARN - skipping non numeric value ${areaTotalValue} for ${areaTotalLabel}`);
    return;
  }
  // Check totals map to see if we've started calculating this total already
  let currentTotalVal = totalsMap.get(areaTotalLabel);
  if (!currentTotalVal) {
    currentTotalVal = 0;
  }
  totalsMap.set(areaTotalLabel, currentTotalVal + areaTotalValue);
}
