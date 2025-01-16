define(function() {
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            fnDoneInitializing();
        }

        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            // No UI to render.
        }

        setData(oControlHost, oDataStore) {
            console.log("MyDataLoggingControl - Received Data");

            if (!oDataStore) {
                console.warn("MyDataLoggingControl - No data store provided.");
                return;
            }
            console.log("Data Store Object",oDataStore)

            const config = oControlHost.configuration;
            if (!config) {
                console.warn("MyDataLoggingControl - No configuration provided.");
                return;
            }

            const valueColumnIndex = config["Value Column"] - 1;
            const displayColumnIndex = config["Display Column"] - 1;
            const sortColumnIndex = config["Sort Column"] - 1;
            const groupColumnIndex = config["Group Column"] - 1;
            const sortNumeric = config["Sort Numeric"];
            const sortOrder = config["Sort Order"];

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex) || isNaN(sortColumnIndex) || isNaN(groupColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration. Ensure 'Value Column', 'Display Column', 'Sort Column', and 'Group Column' are numeric in the configuration.");
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount ||
                sortColumnIndex < 0 || sortColumnIndex >= columnCount ||
                groupColumnIndex < 0 || groupColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured column index is out of bounds for the Data Store.");
                return;
            }

            const rowCount = oDataStore.rowCount;

            console.log("MyDataLoggingControl - Logging data structure from Data Store (configured columns):");

            const dataStructure = [];

            for (let i = 0; i < rowCount; i++) {
                const rowData = {
                    value: oDataStore.getCellValue(i, valueColumnIndex),
                    displayValue: oDataStore.getCellValue(i, displayColumnIndex),
                    sortValue: oDataStore.getCellValue(i, sortColumnIndex),
                    groupingValue: oDataStore.getCellValue(i, groupColumnIndex)
                };
                dataStructure.push(rowData);
            }

            // Sort the data structure
            if (sortColumnIndex >= 0) {
                const sortKey = "sortValue"; // The property in the rowData to sort by
                const isNumericSort = sortNumeric === true;
                const isDescending = sortOrder === "Descending";

                dataStructure.sort((a, b) => {
                    const valueA = a[sortKey];
                    const valueB = b[sortKey];
                    let comparisonResult = 0;

                    if (isNumericSort) {
                        const numA = Number(valueA);
                        const numB = Number(valueB);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            comparisonResult = numA - numB;
                        } else {
                            comparisonResult = String(valueA).localeCompare(String(valueB));
                        }
                    } else {
                        comparisonResult = String(valueA).localeCompare(String(valueB));
                    }

                    return isDescending ? comparisonResult * -1 : comparisonResult;
                });
            }

            console.log(dataStructure);
            // Alternatively, for a tabular view:
            // console.table(dataStructure);
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});