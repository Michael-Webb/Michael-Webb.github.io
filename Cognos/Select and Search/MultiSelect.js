define(function() { 
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            this._oControlHost = oControlHost;  
            this._container = oControlHost.container;
            this._selectedItems = [];
            this._isOpen = false; 
            fnDoneInitializing();
        }

        draw(oControlHost) {
            console.log("MyDataLoggingControl - Drawing");
            this._container.innerHTML = '';
            this._container.classList.add('custom-dropdown-container');

            const config = oControlHost.configuration;
            this._labelText = config["Label Text"] || "Select Options";

            // Apply container width if configured
            if (config["Container Width"]) {
                this._container.style.width = config["Container Width"];
            }

            const dropdownHeader = document.createElement('div');
            dropdownHeader.classList.add('dropdown-header');
            dropdownHeader.textContent = this._selectedItems.length > 0 
                ? `${this._selectedItems.length} options selected` 
                : this._labelText;
            
            // Apply dropdown width and height if configured
            if (config["Dropdown Width"]) {
                dropdownHeader.style.width = config["Dropdown Width"];
            }
            if (config["Dropdown Height"]) {
                dropdownHeader.style.height = config["Dropdown Height"];
            }

            // Create and append the chevron element
            const chevron = document.createElement('span');
            chevron.classList.add('chevron');
            chevron.innerHTML = this._isOpen ? '&#x25B2;' : '&#x25BC;';
            dropdownHeader.appendChild(chevron);

            dropdownHeader.addEventListener('click', this.toggleDropdown.bind(this));
            this._container.appendChild(dropdownHeader);

            const dropdownListContainer = document.createElement('div');
            dropdownListContainer.classList.add('dropdown-list-container');
            dropdownListContainer.style.display = this._isOpen ? 'block' : 'none';

            // Apply list container width and height if configured
            if (config["List Container Width"]) {
                dropdownListContainer.style.width = config["List Container Width"];
                dropdownListContainer.style.left = 'auto';
                dropdownListContainer.style.right = 'auto';
            }
            if (config["List Container Height"]) {
                dropdownListContainer.style.height = config["List Container Height"];
                dropdownListContainer.style.overflowY = 'auto'; 
            }

            if (!this._groupedData) {
                const messageDiv = document.createElement('div');
                messageDiv.textContent = 'No data available to display.';
                dropdownListContainer.appendChild(messageDiv);
            } else {
                const showGroups = config["Show Groups"] !== undefined ? config["Show Groups"] : true;
                const multiSelectDropdown = document.createElement('div');
                multiSelectDropdown.classList.add('multi-select-dropdown');

                this._groupedData.forEach(groupInfo => {
                    if (showGroups) {
                        const groupDiv = document.createElement('div');
                        groupDiv.classList.add('group');
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
                        multiSelectDropdown.appendChild(groupDiv);
                    } else {
                        groupInfo.items.forEach(item => {
                            const checkboxDiv = document.createElement('div');
                            checkboxDiv.classList.add('checkbox-item', 'no-group');
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
                            multiSelectDropdown.appendChild(checkboxDiv);
                        });
                    }
                });
                dropdownListContainer.appendChild(multiSelectDropdown);
            }

            this._container.appendChild(dropdownListContainer);
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

            const valueColumnIndex = config["Use Value"] - 1;
            const displayColumnIndex = config["Display Value"] - 1;
            const groupColumnIndexConfig = config["Group"];
            const groupColumnIndex = !isNaN(groupColumnIndexConfig) ? parseInt(groupColumnIndexConfig) - 1 : undefined;
            this._parameterName = config["Parameter Name"];

            if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex)) {
                console.warn("MyDataLoggingControl - Invalid column configuration.");
                this._groupedData = null;
                this.draw(oControlHost);
                return;
            }

            const columnCount = oDataStore.columnCount;
            if (valueColumnIndex < 0 || valueColumnIndex >= columnCount ||
                displayColumnIndex < 0 || displayColumnIndex >= columnCount) {
                console.warn("MyDataLoggingControl - Configured column index out of bounds.");
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
                    if (!seenGroups.has("All Items")) {
                        this._groupedData.push({ name: "All Items", items: [] });
                        seenGroups.add("All Items");
                    }
                    const allItemsgroup = this._groupedData.find(group => group.name === "All Items");
                    allItemsgroup.items.push({ value: value, displayValue: displayValue });
                }
            }

            console.log("MyDataLoggingControl - Grouped Data:", this._groupedData);
            this.draw(oControlHost);
        }

        toggleDropdown() {
            this._isOpen = !this._isOpen;
            this.draw(this._oControlHost);
        }

        handleGroupCheckboxChange(groupName, event) {
            const isChecked = event.target.checked;
            const groupDiv = event.target.closest('.group');
            if (groupDiv) {
                const checkboxes = groupDiv.querySelectorAll('.checkbox-item input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    const changeEvent = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(changeEvent);
                });
            }
        }

        handleCheckboxChange(value, displayValue, groupName, event) {
            const isChecked = event.target.checked;
            const itemData = { use: value, display: displayValue, group: groupName };

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

            const dropdownHeader = this._container.querySelector('.dropdown-header');
            if (dropdownHeader) {
                // Only update the text content, preserving the chevron element
                const chevron = dropdownHeader.querySelector('.chevron');
                dropdownHeader.firstChild.textContent = this._selectedItems.length > 0 
                    ? `${this._selectedItems.length} options selected` 
                    : this._labelText;
                // Update chevron orientation
                if (chevron) {
                    chevron.innerHTML = this._isOpen ? '&#x25B2;' : '&#x25BC;';
                }
            }
        }

        destroy(oControlHost) {
            console.log("MyDataLoggingControl - Destroying");
        }
    }

    return MyDataLoggingControl;
});
