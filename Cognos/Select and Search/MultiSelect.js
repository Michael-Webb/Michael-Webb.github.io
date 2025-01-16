define(function() {
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            this._container = oControlHost.container;
            fnDoneInitializing();
        }

        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            // Clear any existing content
            this._container.innerHTML = '';

            if (!this._groupedData) {
                const messageDiv = document.createElement('div');
                messageDiv.textContent = 'No data available to display.';
                this._container.appendChild(messageDiv);
                return;
            }

            const config = oControlHost.configuration;
            const showGroups = config["Show Groups"] !== undefined ? config["Show Groups"] : true; // Default to true

            const selectElement = document.createElement('select');

            if (showGroups) {
                for (const group in this._groupedData) {
                    const optgroupElement = document.createElement('optgroup');
                    optgroupElement.label = group;

                    this._groupedData[group].forEach(item => {
                        const optionElement = document.createElement('option');
                        optionElement.value = item.value;
                        optionElement.textContent = item.displayValue;
                        optgroupElement.appendChild(optionElement);
                    });

                    selectElement.appendChild(optgroupElement);
                }
            } else {
                for (const group in this._groupedData) {
                    this._groupedData[group].forEach(item => {
                        const optionElement = document.createElement('option');
                        optionElement.value = item.value;
                        optionElement.textContent = item.displayValue;
                        selectElement.appendChild(optionElement);
                    });
                }
            }

            this._container.appendChild(selectElement);
        }

        setData(oControlHost, oDataStore) {
            console.log("MyDataLoggingControl - Received Data");

            if (!oDataStore) {
                console.warn("MyDataLoggingControl - No data store provided.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const config = oControlHost.configuration;
            if (!config) {
                console.warn("MyDataLoggingControl - No configuration provided.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const valueColumnIndex = config["Value"] - 1;
            const displayColumnIndex = config["Display"] - 1;
            const groupColumnIndexConfig = config["Group"];
            const groupColumnIndex = !isNaN(groupColumnIndexConfig) ? parseInt(groupColumnIndexConfig) - 1 : undefined;

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration. Ensure 'Value Column' and 'Display Column' are numeric in the configuration.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured 'Value Column' or 'Display Column' index is out of bounds for the Data Store.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const rowCount = oDataStore.rowCount;

            console.log("MyDataLoggingControl - Processing Data for Dropdown");
            const dataStructure = [];
            for (let i = 0; i < rowCount; i++) {
                const rowData = {
                    value: oDataStore.getCellValue(i, valueColumnIndex),
                    displayValue: oDataStore.getCellValue(i, displayColumnIndex),
                    groupingValue: groupColumnIndex !== undefined ? oDataStore.getCellValue(i, groupColumnIndex) : null
                };
                dataStructure.push(rowData);
            }
            console.log("MyDataLoggingControl - Data Structure:", dataStructure);

            // Group the data by groupingValue only if groupColumnIndex is valid
            if (groupColumnIndex !== undefined && groupColumnIndex >= 0 && groupColumnIndex < columnCount) {
                console.log("MyDataLoggingControl - Grouping data.");
                this._groupedData = dataStructure.reduce((acc, current) => {
                    const group = current.groupingValue || "Ungrouped"; // Default group name
                    if (!acc[group]) {
                        acc[group] = [];
                    }
                    acc[group].push(current);
                    return acc;
                }, {});
            } else {
                console.log("MyDataLoggingControl - No valid Group Column configured. Displaying all items.");
                this._groupedData = {
                    "All Items": dataStructure // Display all items under a single group
                };
            }

            console.log("MyDataLoggingControl - Grouped Data:", this._groupedData);

            this.draw(oControlHost); // Redraw the control to display the dropdown
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});