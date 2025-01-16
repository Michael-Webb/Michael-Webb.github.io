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
            console.log("DataStore: ",oDataStore)
            const config = oControlHost.configuration;
            if (!config) {
                console.warn("MyDataLoggingControl - No configuration provided.");
                return;
            }

            const valueColumnIndex = config["Value"] - 1;
            const displayColumnIndex = config["Display"] - 1;
            // Removing sortConfigString
            const groupColumnIndex = config["Group"] - 1;

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex) || isNaN(groupColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration. Ensure 'Value Column', 'Display Column', and 'Group Column' are numeric in the configuration.");
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount ||
                groupColumnIndex < 0 || groupColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured column index is out of bounds for the Data Store.");
                return;
            }

            const rowCount = oDataStore.rowCount;

            console.log("MyDataLoggingControl - Initial Data Structure:");
            const dataStructure = [];
            for (let i = 0; i < rowCount; i++) {
                const rowData = {
                    value: oDataStore.getCellValue(i, valueColumnIndex),
                    displayValue: oDataStore.getCellValue(i, displayColumnIndex),
                    groupingValue: oDataStore.getCellValue(i, groupColumnIndex),
                    originalRowIndex: i // Keep track of the original row index if needed
                };
                dataStructure.push(rowData);
            }
            console.log(dataStructure);
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});