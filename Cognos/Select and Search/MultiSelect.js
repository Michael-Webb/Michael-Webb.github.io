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

            this._groupedData.forEach(groupInfo => {
                if (showGroups) {
                    const optgroupElement = document.createElement('optgroup');
                    optgroupElement.label = groupInfo.name;

                    groupInfo.items.forEach(item => {
                        const optionElement = document.createElement('option');
                        optionElement.value = item.value;
                        optionElement.textContent = item.displayValue;
                        optgroupElement.appendChild(optionElement);
                    });

                    selectElement.appendChild(optgroupElement);
                } else {
                    groupInfo.items.forEach(item => {
                        const optionElement = document.createElement('option');
                        optionElement.value = item.value;
                        optionElement.textContent = item.displayValue;
                        selectElement.appendChild(optionElement);
                    });
                }
            });

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
            this._groupedData = [];
            const seenGroups = new Set();

            for (let i = 0; i < rowCount; i++) {
                const value = oDataStore.getCellValue(i, valueColumnIndex);
                const displayValue = oDataStore.getCellValue(i, displayColumnIndex);
                const groupingValue = groupColumnIndex !== undefined ? oDataStore.getCellValue(i, groupColumnIndex) : null;
                const groupName = groupingValue || "Ungrouped";

                if (groupColumnIndex !== undefined && groupColumnIndex >= 0 && groupColumnIndex < columnCount) {
                    if (!seenGroups.has(groupName)) {
                        this._groupedData.push({ name: groupName, items: [] });
                        seenGroups.add(groupName);
                    }
                    const currentGroup = this._groupedData.find(group => group.name === groupName);
                    currentGroup.items.push({ value: value, displayValue: displayValue });
                } else {
                    // If no valid group column, treat all items as in a single "All Items" group, preserving order
                    if (!seenGroups.has("All Items")) {
                        this._groupedData.push({ name: "All Items", items: [] });
                        seenGroups.add("All Items");
                    }
                    const allItemsgroup = this._groupedData.find(group => group.name === "All Items");
                    allItemsgroup.items.push({ value: value, displayValue: displayValue });
                }
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