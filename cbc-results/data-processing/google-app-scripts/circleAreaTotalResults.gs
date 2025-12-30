//Calculate full circle totals across set of tabs containing CBC data extracted from submitted count sheets.
//It will also separate out count week birds.
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
  const possibleCountWeekSpeciesSet = new Set();
  areaTabs.forEach(areaTab => {
    const areaName = areaTab.getName();
    Logger.log(`Calculating circle totals for ${areaName}...`);
    updateCircleEffortTotals(areaTab, circleEffortTotalsMap);
    updateCircleSpeciesCounts(areaTab, circleSpeciesCountsMap, possibleCountWeekSpeciesSet);
    Logger.log(`...calculated circle totals for ${areaName}`);
  });
  checkCountWeek(circleSpeciesCountsMap, possibleCountWeekSpeciesSet);
  const circleEffortTotalsBatch = [...circleEffortTotalsMap];
  circleEffortTotalsBatch.forEach(effort => effort.unshift("Effort"));
  const circleSpeciesCountsBatch = [...circleSpeciesCountsMap];
  circleSpeciesCountsBatch.forEach(species => species.unshift("Species"));
  if (circleEffortTotalsBatch.length) {
    circleTotalsTab.getRange(circleTotalsTab.getLastRow() + 1, 1, circleEffortTotalsBatch.length, 3).setValues(circleEffortTotalsBatch);
  }
  if (circleSpeciesCountsBatch.length) {
    circleTotalsTab.getRange(circleTotalsTab.getLastRow() + 1, 1, circleSpeciesCountsBatch.length, 3).setValues(circleSpeciesCountsBatch);
  }
  // calculate total number of species and individuals (not including count week birds)
  const totalNumberOfSpecies = circleSpeciesCountsBatch.filter(species => species[2] !== "cw").length;
  circleTotalsTab.appendRow(["Species", "Total Species", totalNumberOfSpecies]);
  const totalSpeciesIndividuals = circleSpeciesCountsBatch.reduce((totalIndividuals, species) => {
    return totalIndividuals + (species[2] !== "cw" ? species[2] : 0);
  }, 0);
  circleTotalsTab.appendRow(["Species", "Total Individuals", totalSpeciesIndividuals]);

}

function updateCircleEffortTotals(areaTab, circleEffortTotalsMap) {
  //find rows starting with "Total"
  const areaEffortTotalsFinder = areaTab.createTextFinder("^Total ").useRegularExpression(true);
  const areaEffortTotalsRows = areaEffortTotalsFinder.findAll();
  areaEffortTotalsRows.forEach(areaEffortTotalsRow => {
    updateCircleTotalVal(areaEffortTotalsRow.getRow(), areaTab, circleEffortTotalsMap);
  });
}

function updateCircleSpeciesCounts(areaTab, circleSpeciesCountsMap, possibleCountWeekSpeciesSet) {
  // Find the row labeled "Species" and then grab all non empty rows after that
  const areaSpeciesSectionFinder = areaTab.createTextFinder("^Species$").useRegularExpression(true);
  const areasSpeciesSectionRow = areaSpeciesSectionFinder.findNext();
  const firstSpeciesRow = areasSpeciesSectionRow.getRow() + 1;
  const lastSpeciesRow = areaTab.getLastRow();
  for (let currentSpeciesRow = firstSpeciesRow; currentSpeciesRow <= lastSpeciesRow; currentSpeciesRow++) {
    updateCircleTotalVal(currentSpeciesRow, areaTab, circleSpeciesCountsMap, possibleCountWeekSpeciesSet);
  }
}

function updateCircleTotalVal(areaTotalsRow, areaTab, totalsMap, possibleCountWeekSet = null) {
  const areaTotalLabel = areaTab.getRange(areaTotalsRow, 1).getValue();
  if (/(species|sp(\.)?)$/i.test(areaTotalLabel)) {
    Logger.log(`WARN - skipping non specific species name ${areaTotalLabel}`);
    return;
  }
  let areaTotalValue = areaTab.getRange(areaTotalsRow, 2).getValue();
  if (isNaN(areaTotalValue - parseFloat(areaTotalValue))) {
    areaTotalValue = areaTotalValue.trim();
    if (areaTotalValue.length === 0) {
      areaTotalValue = 0;
    } else {
      if (possibleCountWeekSet !== null && /cw/i.test(areaTotalValue)) {
        possibleCountWeekSet.add(areaTotalLabel);
        Logger.log(`Added possible count week bird ${areaTotalLabel}`);
        return;
      }
      Logger.log(`WARN - skipping non numeric value ${areaTotalValue} for ${areaTotalLabel}`);
      return;
    }
  }
  // Check totals map to see if we've started calculating this total already
  let currentTotalVal = totalsMap.get(areaTotalLabel);
  if (!currentTotalVal) {
    currentTotalVal = 0;
  }
  totalsMap.set(areaTotalLabel, currentTotalVal + areaTotalValue);
}

// Check if any possible count week entries don't exist in the calculated totals, if so
/// it's a count week bird
function checkCountWeek(totalsMap, possibleCountWeekSet) {
  possibleCountWeekSet.forEach((species) => {
    if (!totalsMap.get(species)) {
      totalsMap.set(species, "cw");
    }
  })
}