define(function() { 
    'use strict';

    class MyDataLoggingControl {
        initialize(oControlHost, fnDoneInitializing) {
            console.log("MyDataLoggingControl - Initializing");
            this._oControlHost = oControlHost;  
            this._container = oControlHost.container;
            this._selectedItems = [];
            this._isOpen = false; 
            this._currentFilter = {
                terms: [],
                type: 'contains' // Default search type
            };
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
            // Create a span for the label text
            const labelSpan = document.createElement('span');
            labelSpan.textContent = this._selectedItems.length > 0 
                ? `${this._selectedItems.length} options selected` 
                : this._labelText;
            dropdownHeader.appendChild(labelSpan);
            
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

            if (this._isOpen) {
                // Add search container when dropdown is open
                const searchContainer = document.createElement('div');
                searchContainer.classList.add('search-container');

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.classList.add('search-input');
                searchInput.placeholder = 'Search...';
                searchInput.value = this._currentFilter.rawInput || '';
                searchContainer.appendChild(searchInput);

                const searchType = document.createElement('select');
                searchType.classList.add('search-type');

                const optionStartsWith = document.createElement('option');
                optionStartsWith.value = 'startsWith';
                optionStartsWith.textContent = 'Starts with';
                searchType.appendChild(optionStartsWith);

                const optionContains = document.createElement('option');
                optionContains.value = 'contains';
                optionContains.textContent = 'Contains';
                searchType.appendChild(optionContains);

                searchType.value = this._currentFilter.type || 'contains';
                searchContainer.appendChild(searchType);

                const filterButton = document.createElement('button');
                filterButton.type = 'button';
                filterButton.classList.add('filter-button');
                filterButton.textContent = 'Select/Deselect All';
                searchContainer.appendChild(filterButton);

                // Event listener for search input
                searchInput.addEventListener('input', (e) => {
                    const rawInput = e.target.value;
                    this._currentFilter.rawInput = rawInput;
                    this._currentFilter.terms = this.parseSearchTerms(rawInput);
                    this.applyFilter();
                });

                // Event listener for search type change
                searchType.addEventListener('change', (e) => {
                    this._currentFilter.type = e.target.value;
                    this.applyFilter();
                });

                // Event listener for filter button
                filterButton.addEventListener('click', () => {
                    this.toggleSelectDeselectFiltered();
                });

                dropdownListContainer.appendChild(searchContainer);
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
                            checkboxDiv.dataset.itemValue = item.value; // For filtering

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
                            checkboxDiv.dataset.itemValue = item.value; // For filtering

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

            // Apply current filter if any
            if (this._isOpen) {
                this.applyFilter();
            }
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

        parseSearchTerms(rawInput) {
            if (!rawInput) return [];
            return rawInput.split(',')
                           .map(term => term.trim().toLowerCase())
                           .filter(term => term.length > 0);
        }

        applyFilter() {
            if (!this._isOpen) return;

            const config = this._oControlHost.configuration;
            const dropdownListContainer = this._container.querySelector('.dropdown-list-container');
            if (!dropdownListContainer) return;

            const searchTerms = this._currentFilter.terms;
            const searchType = this._currentFilter.type || 'contains';

            const checkboxItems = dropdownListContainer.querySelectorAll('.checkbox-item');
            checkboxItems.forEach(item => {
                const displayValue = item.dataset.displayValue.toLowerCase();
                let isVisible = true;

                if (searchTerms.length > 0) {
                    isVisible = searchTerms.some(term => {
                        if (searchType === 'startsWith') {
                            return displayValue.startsWith(term);
                        } else { // 'contains'
                            return displayValue.includes(term);
                        }
                    });
                }

                if (isVisible) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                    // Optionally, deselect hidden items
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.checked) {
                        checkbox.checked = false;
                        this.handleCheckboxChange(checkbox.value, checkbox.dataset.displayValue, checkbox.dataset.group, { target: checkbox });
                    }
                }
            });

            // Optionally, update group checkbox states based on visible items
            this.updateGroupCheckboxStates();
        }

        updateGroupCheckboxStates() {
            const config = this._oControlHost.configuration;
            const dropdownListContainer = this._container.querySelector('.dropdown-list-container');
            if (!dropdownListContainer) return;

            const groups = dropdownListContainer.querySelectorAll('.group');
            groups.forEach(group => {
                const groupCheckbox = group.querySelector('.group-checkbox-item input[type="checkbox"]');
                const visibleCheckboxes = group.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
                if (visibleCheckboxes.length === 0) {
                    groupCheckbox.checked = false;
                    groupCheckbox.indeterminate = false;
                } else {
                    const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
                    const someChecked = Array.from(visibleCheckboxes).some(cb => cb.checked);
                    groupCheckbox.checked = allChecked;
                    groupCheckbox.indeterminate = !allChecked && someChecked;
                }
            });
        }

        toggleSelectDeselectFiltered() {
            const config = this._oControlHost.configuration;
            const dropdownListContainer = this._container.querySelector('.dropdown-list-container');
            if (!dropdownListContainer) return;

            const visibleCheckboxes = dropdownListContainer.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
            if (visibleCheckboxes.length === 0) return;

            // Determine if any visible checkbox is unchecked
            const anyUnchecked = Array.from(visible_checkbox).some(cb => !cb.checked);

            if (anyUnchecked) {
                // Select all visible checkboxes
                visible_checkbox.forEach(cb => {
                    if (!cb.checked) {
                        cb.checked = true;
                        this.handleCheckboxChange(cb.value, cb.dataset.displayValue, cb.dataset.group, { target: cb });
                    }
                });
            } else {
                // Deselect all visible checkboxes
                visible_checkbox.forEach(cb => {
                    if (cb.checked) {
                        cb.checked = false;
                        this.handleCheckboxChange(cb.value, cb.dataset.displayValue, cb.dataset.group, { target: cb });
                    }
                });
            }
        }

        handleGroupCheckboxChange(groupName, event) {
            const isChecked = event.target.checked;
            const groupDiv = event.target.closest('.group');
            if (groupDiv) {
                const checkboxes = groupDiv.querySelectorAll('.checkbox-item input[type="checkbox"]:not(.hidden)');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                    this.handleCheckboxChange(checkbox.value, checkbox.dataset.displayValue, groupName, { target: checkbox });
                });
            }
        }

        handleCheckboxChange(value, displayValue, groupName, event) {
            const isChecked = event.target.checked;
            const itemData = { use: value, display: displayValue, group: groupName };

            if (isChecked) {
                // Avoid duplicates
                if (!this._selectedItems.some(item => item.use === value)) {
                    this._selectedItems.push(itemData);
                }
            } else {
                this._selectedItems = this._selectedItems.filter(item => item.use !== value);
            }

            // Update group checkbox state
            const groupDiv = event.target.closest('.group');
            if (groupDiv) {
                const groupCheckbox = groupDiv.querySelector('.group-checkbox-item input[type="checkbox"]');
                const checkboxes = groupDiv.querySelectorAll('.checkbox-item input[type="checkbox"]:not(.hidden)');
                const allSubCheckboxesChecked = Array.from(checkboxes).every(cb => cb.checked);
                const someSubCheckboxesChecked = Array.from(checkboxes).some(cb => cb.checked);
                groupCheckbox.checked = allSubCheckboxesChecked;
                groupCheckbox.indeterminate = !allSubCheckboxesChecked && someSubCheckboxesChecked;
            }

            // Update the dropdown header text
            const dropdownHeader = this._container.querySelector('.dropdown-header');
            if (dropdownHeader) {
                const labelSpan = dropdownHeader.querySelector('span');
                labelSpan.textContent = this._selectedItems.length > 0 
                    ? `${this._selectedItems.length} options selected` 
                    : this._labelText;

                // Update chevron orientation
                const chevron = dropdownHeader.querySelector('.chevron');
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
