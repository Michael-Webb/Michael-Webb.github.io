define(function() {
    'use strict';

    class MyDataLoggingControl {
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
         * Draws the control. In this case, we don't need to render anything, just log data.
         * @param {ControlHost} oControlHost The control host interface.
         */
        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            // No UI to render for this component.
        }

        /**
         * Called when data is available for the control.
         * @param {ControlHost} oControlHost The control host interface.
         * @param {DataStore} oDataStore The data store associated with the control.
         */
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

            console.log("MyDataLoggingControl - Logging data from Data Store:");

            for (let i = 0; i < rowCount; i++) {
                const valueColumn = oDataStore.getCellValue(i, 0);
                const displayValueColumn = oDataStore.getCellValue(i, 1);
                const sortValueColumn = oDataStore.getCellValue(i, 2);
                const groupingValueColumn = oDataStore.getCellValue(i, 3);

                console.log(`Row ${i + 1}:`);
                console.log(`  Value: ${valueColumn}`);
                console.log(`  Display Value: ${displayValueColumn}`);
                console.log(`  Sort Value: ${sortValueColumn}`);
                console.log(`  Grouping Value: ${groupingValueColumn}`);
            }
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