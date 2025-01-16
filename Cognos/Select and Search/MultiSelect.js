define(function() {
    'use strict';

    class MyDataLoggingControl {
        constructor() {
            this.dataStore = null; // Store the DataStore here
        }

        /**
         * Initializes the custom control.
         * @param {ControlHost} oControlHost The control host interface.
         * @param {function} fnDoneInitializing Callback to signal initialization completion.
         */
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            fnDoneInitializing();
        }

        /**
         * Draws the control and performs the data logging.
         * @param {ControlHost} oControlHost The control host interface.
         */
        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");

            if (!this.dataStore) {
                console.warn("MyDataLoggingControl - No data store available during draw.");
                oControlHost.container.innerHTML = "No data available."; // Optionally display a message
                return;
            }

            const rowCount = this.dataStore.rowCount;
            const columnCount = this.dataStore.columnCount;

            if (columnCount < 4) {
                console.warn(`MyDataLoggingControl - Data store has less than 4 columns (${columnCount}). Cannot log requested columns.`);
                oControlHost.container.innerHTML = "Insufficient columns in data."; // Optionally display a message
                return;
            }

            console.log("MyDataLoggingControl - Logging data from Data Store (during draw):");

            let logContent = "<div>Data Logged:</div><ul>"; // Optional: display in the control

            for (let i = 0; i < rowCount; i++) {
                const valueColumn = this.dataStore.getCellValue(i, 0);
                const displayValueColumn = this.dataStore.getCellValue(i, 1);
                const sortValueColumn = this.dataStore.getCellValue(i, 2);
                const groupingValueColumn = this.dataStore.getCellValue(i, 3);

                console.log(`Row ${i + 1}:`);
                console.log(`  Value: ${valueColumn}`);
                console.log(`  Display Value: ${displayValueColumn}`);
                console.log(`  Sort Value: ${sortValueColumn}`);
                console.log(`  Grouping Value: ${groupingValueColumn}`);

                logContent += `<li>Row ${i + 1}: Value: ${valueColumn}, Display: ${displayValueColumn}, Sort: ${sortValueColumn}, Group: ${groupingValueColumn}</li>`; // Optional: display in the control
            }
            logContent += "</ul>"; // Optional: display in the control

            // Optional: Display the log in the custom control's container
            oControlHost.container.innerHTML = logContent;
        }

        /**
         * Called when data is available for the control.
         * @param {ControlHost} oControlHost The control host interface.
         * @param {DataStore} oDataStore The data store associated with the control.
         */
        setData(oControlHost, oDataStore) {
            console.log("MyDataLoggingControl - Received Data");
            this.dataStore = oDataStore; // Store the DataStore
        }

        /**
         * Called when the control is being destroyed.
         * @param {ControlHost} oControlHost The control host interface.
         */
        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});