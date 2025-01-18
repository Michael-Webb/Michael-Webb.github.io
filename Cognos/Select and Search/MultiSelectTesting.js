define(function () {
  "use strict";

  class MyDataLoggingControl {
    initialize(oControlHost, fnDoneInitializing) {
      console.log("MyDataLoggingControl - Initializing");
      this._oControlHost = oControlHost;
      this._container = oControlHost.container;
      this._selectedItems = [];
      this._isOpen = false;
      this._currentFilter = {
        terms: [],
        type: "containsAny",
        rawInput: "",
        caseInsensitive: true,
      };
      this._multipleSelect = true; // Default to true until read from config

      const config = oControlHost.configuration;
      this._parameterName = config["Parameter Name"]; // Capture parameter name
      if (this._parameterName) {
        const initialValues = oControlHost.getParameter(this._parameterName);
        if (initialValues && initialValues.length > 0) {
          // Check if the parameter is a range parameter.
          if (initialValues[0].start) {
            this._selectedItems = initialValues.map((range) => ({
              use: range.start.use,
              display: range.start.display,
            }));
          } else {
            // Handle a normal parameter.
            this._selectedItems = initialValues.flatMap((param) => {
              if (param.values && param.values.length > 0) {
                return param.values.map((item) => ({
                  use: item.use,
                  display: item.display,
                }));
              }
              return [];
            });
            console.log("Initialized Items", this._selectedItems);
          }
        }
      } else {
        console.warn("MyDataLoggingControl - Parameter Name not configured.");
      }

      this.draw(oControlHost);
      fnDoneInitializing();
    }

    draw(oControlHost) {
      console.log("MyDataLoggingControl - Drawing");
      this._container.innerHTML = "";
      this._container.classList.add("custom-dropdown-container");

      const config = oControlHost.configuration;
      this._labelText = config["Label Text"] || "Select Options";

      // Determine if multiple selection is enabled; default to true
      const multipleSelect = config["Multiple Select"] !== false;
      this._multipleSelect = multipleSelect;

      if (config["Container Width"]) {
        this._container.style.width = config["Container Width"];
      }

      // Create dropdown header
      const dropdownHeader = document.createElement("div");
      dropdownHeader.classList.add("dropdown-header");

      const labelSpan = document.createElement("span");
      if (this._selectedItems.length > 0) {
        if (!multipleSelect) {
          // Single-select: Show the selected item's display value
          labelSpan.textContent = this._selectedItems[0].display;
        } else {
          labelSpan.textContent = `${this._selectedItems.length} options selected`;
        }
      } else {
        labelSpan.textContent = this._labelText;
      }
      dropdownHeader.appendChild(labelSpan);

      if (config["Dropdown Width"]) {
        dropdownHeader.style.width = config["Dropdown Width"];
      }
      if (config["Dropdown Height"]) {
        dropdownHeader.style.height = config["Dropdown Height"];
      }

      const chevron = document.createElement("span");
      chevron.classList.add("chevron");
      chevron.innerHTML = this._isOpen ? "▲" : "▼";
      dropdownHeader.appendChild(chevron);

      dropdownHeader.addEventListener("click", this.toggleDropdown.bind(this));
      this._container.appendChild(dropdownHeader);

      // Create outer container
      const dropdownOuterContainer = document.createElement("div");
      dropdownOuterContainer.classList.add("dropdown-outer-container");
      dropdownOuterContainer.style.display = this._isOpen ? "block" : "none";

      if (this._isOpen) {
        // Create search container
        const searchContainer = document.createElement("div");
        searchContainer.classList.add("search-container");

        const searchInputContainer = document.createElement("div");
        searchInputContainer.classList.add("search-input-container");

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.classList.add("search-input");
        searchInput.placeholder = "Search...";
        searchInput.value = this._currentFilter.rawInput || "";
        searchInputContainer.appendChild(searchInput);

        const clearButton = document.createElement("span");
        clearButton.classList.add("clear-button");
        clearButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" 
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
        searchInputContainer.appendChild(clearButton);

        const magnifier = document.createElement("span");
        magnifier.classList.add("magnifier");
        magnifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" 
            stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
        searchInputContainer.appendChild(magnifier);

        searchContainer.appendChild(searchInputContainer);

        // Create controls container with two sections
        const controlsContainer = document.createElement("div");
        controlsContainer.classList.add("search-controls");

        // Create primary buttons container for top row
        const primaryButtonsContainer = document.createElement("div");
        primaryButtonsContainer.classList.add("primary-buttons-container");

        if (multipleSelect) {
          const optionsToggle = document.createElement("button");
          optionsToggle.type = "button";
          optionsToggle.classList.add("options-toggle");
          optionsToggle.textContent = "Options";

          const filterButton = document.createElement("button");
          filterButton.type = "button";
          filterButton.classList.add("filter-button");
          filterButton.textContent = "Select/Deselect All";

          primaryButtonsContainer.appendChild(optionsToggle);
          primaryButtonsContainer.appendChild(filterButton);

          // Add primary buttons to their container
          controlsContainer.appendChild(primaryButtonsContainer);

          // Create toggle button and options section container if needed
          const optionsContainer = document.createElement("div");
          optionsContainer.classList.add("options-container");
          optionsContainer.style.display = "none";
          const searchType = document.createElement("select");
          searchType.classList.add("search-type");

          const options = [
            { value: "containsAny", text: "Contains any of these keywords", default: true },
            { value: "containsAll", text: "Contains all of these keywords" },
            { value: "startsWithAny", text: "Starts with any of these keywords" },
            { value: "startsWithFirstContainsRest", text: "Starts with first, contains rest" },
          ];

          options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            if (option.default) optionElement.selected = true;
            searchType.appendChild(optionElement);
          });

          searchType.value = this._currentFilter.type || "containsAny";
          optionsContainer.appendChild(searchType);

          const caseSensitivityContainer = document.createElement("div");
          caseSensitivityContainer.classList.add("case-sensitivity-container");

          const caseCheckbox = document.createElement("input");
          caseCheckbox.type = "checkbox";
          caseCheckbox.id = oControlHost.generateUniqueID();
          caseCheckbox.checked = this._currentFilter.caseInsensitive !== false;
          caseCheckbox.classList.add("case-checkbox");

          const caseLabel = document.createElement("label");
          caseLabel.setAttribute("for", caseCheckbox.id);
          caseLabel.textContent = "Case Insensitive";
          caseLabel.classList.add("case-label");

          caseSensitivityContainer.appendChild(caseCheckbox);
          caseSensitivityContainer.appendChild(caseLabel);
          optionsContainer.appendChild(caseSensitivityContainer);

          // Add toggle functionality
          optionsToggle.addEventListener("click", () => {
            const isHidden = optionsContainer.style.display === "none";
            optionsContainer.style.display = isHidden ? "flex" : "none";
            optionsToggle.classList.toggle("active");
          });

          controlsContainer.appendChild(optionsContainer);

          // Attach event listeners for search type and case sensitivity
          searchType.addEventListener("change", (e) => {
            this._currentFilter.type = e.target.value;
            this.applyFilter();
          });

          caseCheckbox.addEventListener("change", (e) => {
            this._currentFilter.caseInsensitive = e.target.checked;
            this.applyFilter();
          });

          filterButton.addEventListener("click", () => {
            this.toggleSelectDeselectFiltered();
          });
        } else {
          // If not multiple select, just append the controls container without buttons
          controlsContainer.appendChild(primaryButtonsContainer);
        }

        searchContainer.appendChild(controlsContainer);
        dropdownOuterContainer.appendChild(searchContainer);

        // Set up search event listeners
        searchInput.addEventListener("input", (e) => {
          const rawInput = e.target.value;
          this._currentFilter.rawInput = rawInput;
          this._currentFilter.terms = this.parseSearchTerms(rawInput);
          this.applyFilter();

          if (rawInput.length > 0) {
            clearButton.style.display = "block";
            magnifier.style.display = "none";
          } else {
            clearButton.style.display = "none";
            magnifier.style.display = "block";
          }
        });

        clearButton.addEventListener("click", () => {
          searchInput.value = "";
          const rawInput = "";
          this._currentFilter.rawInput = rawInput;
          this._currentFilter.terms = [];
          this.applyFilter();
          clearButton.style.display = "none";
          magnifier.style.display = "block";
        });
      }

      // Create scrollable list container
      const dropdownListContainer = document.createElement("div");
      dropdownListContainer.classList.add("dropdown-list-container");

      if (config["List Container Width"]) {
        dropdownListContainer.style.width = config["List Container Width"];
        dropdownListContainer.style.left = "auto";
        dropdownListContainer.style.right = "auto";
      }
      if (config["List Container Height"]) {
        dropdownListContainer.style.height = config["List Container Height"];
      }

      if (!this._groupedData) {
        const messageDiv = document.createElement("div");
        messageDiv.textContent = "No data available to display.";
        dropdownListContainer.appendChild(messageDiv);
      } else {
        const showGroups = config["Show Groups"] !== undefined ? config["Show Groups"] : true;
        const multiSelectDropdown = document.createElement("div");
        multiSelectDropdown.classList.add("multi-select-dropdown");

        this._groupedData.forEach((groupInfo) => {
          if (showGroups) {
            const groupDiv = document.createElement("div");
            groupDiv.classList.add("group");

            const groupHeaderDiv = document.createElement("div");
            groupHeaderDiv.classList.add("group-header");

            const groupColor = config["Group Color"] || "#f0f0f0";
            groupHeaderDiv.style.backgroundColor = groupColor;

            const groupLabel = document.createElement("span");
            groupLabel.classList.add("group-label");
            groupLabel.textContent = groupInfo.name;
            groupLabel.title = groupInfo.name;
            groupHeaderDiv.appendChild(groupLabel);

            if (multipleSelect) {
              const buttonContainer = document.createElement("div");
              buttonContainer.classList.add("group-buttons");

              const selectButton = document.createElement("button");
              selectButton.type = "button";
              selectButton.classList.add("group-select-button");
              selectButton.textContent = "Select All";
              selectButton.addEventListener("click", () => {
                this.selectAllInGroup(groupInfo.name, groupDiv);
              });

              const deselectButton = document.createElement("button");
              deselectButton.type = "button";
              deselectButton.classList.add("group-deselect-button");
              deselectButton.textContent = "Deselect All";
              deselectButton.disabled = true;
              deselectButton.addEventListener("click", () => {
                this.deselectAllInGroup(groupInfo.name, groupDiv);
              });

              buttonContainer.appendChild(selectButton);
              buttonContainer.appendChild(deselectButton);
              groupHeaderDiv.appendChild(buttonContainer);
            }

            groupDiv.appendChild(groupHeaderDiv);

            groupInfo.items.forEach((item) => {
              const checkboxDiv = document.createElement("div");
              checkboxDiv.classList.add("checkbox-item");
              checkboxDiv.dataset.itemValue = item.value;

              const checkboxId = oControlHost.generateUniqueID();
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = item.value;
              checkbox.id = checkboxId;
              checkbox.dataset.group = groupInfo.name;
              checkbox.dataset.displayValue = item.displayValue;
              checkbox.addEventListener(
                "change",
                this.handleCheckboxChange.bind(this, item.value, item.displayValue, groupInfo.name)
              );

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.displayValue;
              label.title = item.displayValue;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              groupDiv.appendChild(checkboxDiv);
            });

            multiSelectDropdown.appendChild(groupDiv);
          } else {
            groupInfo.items.forEach((item) => {
              const checkboxDiv = document.createElement("div");
              checkboxDiv.classList.add("checkbox-item", "no-group");
              checkboxDiv.dataset.itemValue = item.value;

              const checkboxId = oControlHost.generateUniqueID();
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = item.value;
              checkbox.id = checkboxId;
              checkbox.dataset.group = groupInfo.name;
              checkbox.dataset.displayValue = item.displayValue;
              checkbox.addEventListener(
                "change",
                this.handleCheckboxChange.bind(this, item.value, item.displayValue, groupInfo.name)
              );

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.displayValue;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              multiSelectDropdown.appendChild(checkboxDiv);
            });
          }
        });
        dropdownListContainer.appendChild(multiSelectDropdown);
      }

      dropdownOuterContainer.appendChild(dropdownListContainer);
      this._container.appendChild(dropdownOuterContainer);

      if (this._isOpen) {
        this.applyFilter();
        this.updateDeselectButtonStates();
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

      if (isNaN(valueColumnIndex) || isNaN(displayColumnIndex)) {
        console.warn("MyDataLoggingControl - Invalid column configuration.");
        this._groupedData = null;
        this.draw(oControlHost);
        return;
      }

      const columnCount = oDataStore.columnCount;
      if (
        valueColumnIndex < 0 ||
        valueColumnIndex >= columnCount ||
        displayColumnIndex < 0 ||
        displayColumnIndex >= columnCount
      ) {
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
          const currentGroup = this._groupedData.find((group) => group.name === groupName);
          currentGroup.items.push({ value: value, displayValue: displayValue });
        } else {
          if (!seenGroups.has("All Items")) {
            this._groupedData.push({ name: "All Items", items: [] });
            seenGroups.add("All Items");
          }
          const allItemsgroup = this._groupedData.find((group) => group.name === "All Items");
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

      const normalizedInput = rawInput.replace(/, /g, ",");

      return normalizedInput
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter((term) => term.length > 0);
    }

    applyFilter() {
      if (!this._isOpen) return;

      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const searchTerms = this._currentFilter.terms;
      const searchType = this._currentFilter.type || "containsAny";
      const isCaseInsensitive = this._currentFilter.caseInsensitive !== false;

      const checkboxItems = dropdownListContainer.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const label = item.querySelector("label");
        const displayValue = label ? label.textContent : "";
        const compareValue = isCaseInsensitive ? displayValue.toLowerCase() : displayValue;
        const compareTerms = isCaseInsensitive ? searchTerms : searchTerms.map((term) => term.toLowerCase());

        let isVisible = true;
        if (searchTerms.length > 0) {
          switch (searchType) {
            case "containsAny":
              isVisible = compareTerms.some((term) => compareValue.includes(term));
              break;
            case "containsAll":
              isVisible = compareTerms.every((term) => compareValue.includes(term));
              break;
            case "startsWithAny":
              isVisible = compareTerms.some((term) => compareValue.startsWith(term));
              break;
            case "startsWithFirstContainsRest":
              if (compareTerms.length > 0) {
                isVisible = compareValue.startsWith(compareTerms[0]);
                if (isVisible && compareTerms.length > 1) {
                  isVisible = compareTerms.slice(1).every((term) => compareValue.includes(term));
                }
              }
              break;
          }
        }

        if (isVisible) {
          item.classList.remove("hidden");
        } else {
          item.classList.add("hidden");
        }
      });

      const groups = dropdownListContainer.querySelectorAll(".group");
      groups.forEach((group) => {
        const visibleSubItems = group.querySelectorAll(".checkbox-item:not(.hidden)");
        if (visibleSubItems.length === 0) {
          group.classList.add("hidden");
        } else {
          group.classList.remove("hidden");
        }
      });

      this.updateGroupCheckboxStates();
    }

    updateGroupCheckboxStates() {
      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const groups = dropdownListContainer.querySelectorAll(".group");
      groups.forEach((group) => {
        if (group.classList.contains("hidden")) return;

        const visibleCheckboxes = group.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
        const groupSelectButton = group.querySelector(".group-select-button");
        if (!groupSelectButton) return;

        if (visibleCheckboxes.length === 0) {
          groupSelectButton.disabled = true;
        } else {
          groupSelectButton.disabled = false;
        }
      });
    }

    updateDeselectButtonStates() {
      const groups = this._container.querySelectorAll(".group");
      groups.forEach((group) => {
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');
        const hasSelectedItems = Array.from(checkboxes).some((cb) => cb.checked);

        const deselectButton = group.querySelector(".group-deselect-button");
        if (deselectButton) {
          deselectButton.disabled = !hasSelectedItems;
        }
      });
    }

    toggleSelectDeselectFiltered() {
      if (!this._multipleSelect) return; // Disable in single-select mode

      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const visibleCheckboxes = dropdownListContainer.querySelectorAll(
        '.checkbox-item:not(.hidden) input[type="checkbox"]'
      );
      if (visibleCheckboxes.length === 0) return;

      const anyUnchecked = Array.from(visibleCheckboxes).some((cb) => !cb.checked);

      if (anyUnchecked) {
        visibleCheckboxes.forEach((cb) => {
          if (!cb.checked) {
            cb.checked = true;
            this.handleCheckboxChange(cb.value, cb.dataset.displayValue, cb.dataset.group, { target: cb });
          }
        });
      } else {
        visibleCheckboxes.forEach((cb) => {
          if (cb.checked) {
            cb.checked = false;
            this.handleCheckboxChange(cb.value, cb.dataset.displayValue, cb.dataset.group, { target: cb });
          }
        });
      }
    }

    selectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return; // Disable in single-select mode

      const visibleCheckboxes = groupDiv.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
      visibleCheckboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
          checkbox.checked = true;
          this.handleCheckboxChange(checkbox.value, checkbox.dataset.displayValue, groupName, { target: checkbox });
        }
      });
    }

    deselectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return; // Disable in single-select mode

      const checkboxes = groupDiv.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
          checkbox.checked = false;
          this.handleCheckboxChange(checkbox.value, checkbox.dataset.displayValue, groupName, { target: checkbox });
        }
      });
    }

    handleCheckboxChange(value, displayValue, groupName, event) {
      const isChecked = event.target.checked;

      // If single select and a new checkbox is being checked, uncheck others
      if (!this._multipleSelect && isChecked) {
        this._selectedItems.forEach((item) => {
          if (item.use !== value) {
            const otherCheckbox = this._container.querySelector(`input[type="checkbox"][value="${item.use}"]`);
            if (otherCheckbox) {
              otherCheckbox.checked = false;
            }
          }
        });
        // Clear previous selections except current one
        this._selectedItems = this._selectedItems.filter((item) => item.use === value);
      }

      const itemData = { use: value, display: displayValue, group: groupName };

      if (isChecked) {
        if (!this._selectedItems.some((item) => item.use === value)) {
          this._selectedItems.push(itemData);
        }
      } else {
        this._selectedItems = this._selectedItems.filter((item) => item.use !== value);
      }

      const dropdownHeader = this._container.querySelector(".dropdown-header");
      if (dropdownHeader) {
        const labelSpan = dropdownHeader.querySelector("span");
        if (!this._multipleSelect && this._selectedItems.length > 0) {
          labelSpan.textContent = this._selectedItems[0].display;
        } else {
          labelSpan.textContent =
            this._selectedItems.length > 0 ? `${this._selectedItems.length} options selected` : this._labelText;
        }

        const chevron = dropdownHeader.querySelector(".chevron");
        if (chevron) {
          chevron.innerHTML = this._isOpen ? "▲" : "▼";
        }
      }

      this.updateDeselectButtonStates();
      this._oControlHost.valueChanged(); // Notify Cognos of a change
    }

    // Add getParameters method
    getParameters(oControlHost) {
      if (!this._parameterName) {
        console.warn("MyDataLoggingControl - Parameter Name not configured.");
        return null;
      }

      if (this._selectedItems.length === 0) {
        return null;
      }

      const parameterValues = this._selectedItems.map((item) => ({ use: item.use, display: item.display }));
      return [{ parameter: this._parameterName, values: parameterValues }];
    }

    destroy(oControlHost) {
      console.log("MyDataLoggingControl - Destroying");
    }
  }

  return MyDataLoggingControl;
});
