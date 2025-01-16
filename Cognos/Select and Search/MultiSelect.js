define(function() {
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            this._container = oControlHost.container;
            this._selectedItems = []; // Initialize an array to store selected items
            fnDoneInitializing();
        }

        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            // Clear any existing content
            this._container.innerHTML = '';
            this._container.classList.add('custom-dropdown-container'); // Add container class for CSS

            if (!this._groupedData) {
                const messageDiv = document.createElement('div');
                messageDiv.textContent = 'No data available to display.';
                this._container.appendChild(messageDiv);
                return;
            }

            const config = oControlHost.configuration;
            const showGroups = config["Show Groups"] !== undefined ? config["Show Groups"] : true; // Default to true

            const dropdownContainer = document.createElement('div'); // Container for the multi-select
            dropdownContainer.classList.add('multi-select-dropdown');

            this._groupedData.forEach(groupInfo => {
                if (showGroups) {
                    const groupDiv = document.createElement('div');
                    groupDiv.classList.add('group');

                    // Group Level Checkbox
                    const groupCheckboxDiv = document.createElement('div');
                    groupCheckboxDiv.classList.add('group-checkbox-item');
                    const groupCheckboxId = oControlHost.generateUniqueID();
                    const groupCheckbox = document.createElement('input');
                    groupCheckbox.type = 'checkbox';
                    groupCheckbox.id = groupCheckboxId;
                    groupCheckbox.dataset.groupName = groupInfo.name;
                    groupCheckbox.addEventListener('change', this.handleGroupCheckboxChange.bind(this, groupInfo.name));
                    const groupLabel = document.createElement('label');
                    groupLabel.classList.add('group-label');
                    groupLabel.setAttribute('for', groupCheckboxId);
                    groupLabel.textContent = groupInfo.name;
                    groupCheckboxDiv.appendChild(groupCheckbox);
                    groupCheckboxDiv.appendChild(groupLabel);
                    groupDiv.appendChild(groupCheckboxDiv);

                    groupInfo.items.forEach(item => {
                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.classList.add('checkbox-item');
                        const checkboxId = oControlHost.generateUniqueID();
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = item.value;
                        checkbox.id = checkboxId;
                        checkbox.dataset.group = groupInfo.name;
                        checkbox.dataset.displayValue = item.displayValue;
                        checkbox.addEventListener('change', this.handleCheckboxChange.bind(this, item.value, item.displayValue, groupInfo.name));

                        const label = document.createElement('label');
                        label.setAttribute('for', checkboxId);
                        label.textContent = item.displayValue;

                        checkboxDiv.appendChild(checkbox);
                        checkboxDiv.appendChild(label);
                        groupDiv.appendChild(checkboxDiv);
                    });
                    dropdownContainer.appendChild(groupDiv);
                } else {
                    groupInfo.items.forEach(item => {
                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.classList.add('checkbox-item', 'no-group'); // Add 'no-group' class
                        const checkboxId = oControlHost.generateUniqueID();
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = item.value;
                        checkbox.id = checkboxId;
                        checkbox.dataset.group = groupInfo.name;
                        checkbox.dataset.displayValue = item.displayValue;
                        checkbox.addEventListener('change', this.handleCheckboxChange.bind(this, item.value, item.displayValue, groupInfo.name));

                        const label = document.createElement('label');
                        label.setAttribute('for', checkboxId);
                        label.textContent = item.displayValue;

                        checkboxDiv.appendChild(checkbox);
                        checkboxDiv.appendChild(label);
                        dropdownContainer.appendChild(checkboxDiv);
                    });
                }
            });

            this._container.appendChild(dropdownContainer);
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

            const valueColumnIndex = config["Use Value"] - 1; // Changed key
            const displayColumnIndex = config["Display Value"] - 1; // Changed key
            const groupColumnIndexConfig = config["Group"];
            const groupColumnIndex = !isNaN(groupColumnIndexConfig) ? parseInt(groupColumnIndexConfig) - 1 : undefined;
            this._parameterName = config["Parameter Name"]; // Get the parameter name

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration. Ensure 'Use Value' and 'Display Value' are numeric in the configuration.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured 'Use Value' or 'Display Value' index is out of bounds for the Data Store.");
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

        handleGroupCheckboxChange(groupName, event) {
            const isChecked = event.target.checked;
            const groupDiv = event.target.closest('.group');
            if (groupDiv) {
                const checkboxes = groupDiv.querySelectorAll('.checkbox-item input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent); // Trigger the individual checkbox change event
                });
            }
        }

        handleCheckboxChange(value, displayValue, groupName, event) {
            const isChecked = event.target.checked;
            const itemData = { use: value, display: displayValue, group: groupName }; // Changed keys

            if (isChecked) {
                this._selectedItems.push(itemData);
            } else {
                this._selectedItems = this._selectedItems.filter(item => item.use !== value);
            }

            const groupDiv = event.target.closest('.group');
            if (groupDiv) {
                const groupCheckbox = groupDiv.querySelector('.group-checkbox-item input[type="checkbox"]');
                const checkboxes = groupDiv.querySelectorAll('.checkbox-item input[type="checkbox"]');
                const allSubCheckboxesChecked = Array.from(checkboxes).every(cb => cb.checked);
                groupCheckbox.checked = allSubCheckboxesChecked;
            }

            if (this._selectedItems.length >= 0) { // Changed to >= 0 to log on any change
                console.log("Selected Items:", this._selectedItems);
            }
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});