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

            const rowCount = oDataStore.rowCount;
            const columnCount = oDataStore.columnCount;

            if (columnCount < 4) {
                console.warn(`MyDataLoggingControl - Data store has less than 4 columns (${columnCount}). Cannot log requested columns.`);
                return;
            }

            console.log("MyDataLoggingControl - Logging data structure from Data Store:");

            const dataStructure = [];

            for (let i = 0; i < rowCount; i++) {
                const rowData = {
                    value: oDataStore.getCellValue(i, 0),
                    displayValue: oDataStore.getCellValue(i, 1),
                    sortValue: oDataStore.getCellValue(i, 2),
                    groupingValue: oDataStore.getCellValue(i, 3)
                };
                dataStructure.push(rowData);
            }

            console.log(dataStructure); // Logs the array of objects
            // Alternatively, for a tabular view in the console:
            // console.table(dataStructure);
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});