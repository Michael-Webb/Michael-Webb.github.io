define(function () {
  "use strict";
  class MyDataLoggingControl {
    initialize(oControlHost, fnDoneInitializing) {
      console.log("MyDataLoggingControl - Initializing");
      this._oControlHost = oControlHost;
      this._container = oControlHost.container;

      // Store selected items and open state
      if (!this._selectedItems) {
        this._selectedItems = [];
      }
      this._isOpen = false;

      // Default filter settings
      this._currentFilter = {
        terms: [],
        type: "containsAny",
        rawInput: "",
        caseInsensitive: true,
      };

      // Default to true until read from config
      this._multipleSelect = true;

      // Custom counter for generating truly unique IDs for each checkbox
      this._uniqueRowCounter = 0;

      if (!this._initialLoadComplete) {
        this._initialLoadComplete = true;
        const config = oControlHost.configuration;

        // Capture parameter name
        this._parameterName = config["Parameter Name"];
        if (this._parameterName) {
          const initialValues = oControlHost.getParameter(this._parameterName);
          if (initialValues) {
            // If parameter returns an array, use it; otherwise make an array of one
            const params = Array.isArray(initialValues) ? initialValues : [initialValues];
            params.forEach((param) => {
              if (param && param.values && Array.isArray(param.values)) {
                param.values.forEach((item) => {
                  this._selectedItems.push({
                    use: item.use,
                    display: item.display,
                  });
                });
              }
            });
          }
        } else {
          console.warn("MyDataLoggingControl - Parameter Name not configured.");
        }
      }
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

      // Set the container width if provided
      if (config["Container Width"]) {
        this._container.style.width = config["Container Width"];
      }

      // Create the dropdown header
      const dropdownHeader = document.createElement("div");
      dropdownHeader.classList.add("dropdown-header");
      dropdownHeader.setAttribute("role", "button");
      dropdownHeader.setAttribute("tabindex", "0");
      dropdownHeader.setAttribute("aria-expanded", this._isOpen);
      dropdownHeader.setAttribute("aria-controls", "dropdown-list");

      const labelSpan = document.createElement("span");
      if (this._selectedItems.length > 0) {
        if (!multipleSelect) {
          // Show the single selected item's display value
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

      // Add keyboard support for the header
      dropdownHeader.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleDropdown();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!this._isOpen) this.toggleDropdown();
          // Focus on first option if it exists
          const firstOption = this._container.querySelector('[role="option"]');
          if (firstOption) firstOption.focus();
        }
      });

      this._container.appendChild(dropdownHeader);

      // Create an outer container for the dropdown
      const dropdownOuterContainer = document.createElement("div");
      dropdownOuterContainer.classList.add("dropdown-outer-container");
      dropdownOuterContainer.style.display = this._isOpen ? "block" : "none";

      if (this._isOpen) {
        // Build search container, filters, etc.
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

        // Container for primary controls (Options button, Select/Deselect All, etc.)
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

          controlsContainer.appendChild(primaryButtonsContainer);

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
          // Instead of using generateUniqueID, you can do something like:
          const caseCheckboxId = "caseCheckbox_" + Date.now();
          caseCheckbox.id = caseCheckboxId;
          caseCheckbox.checked = this._currentFilter.caseInsensitive !== false;
          caseCheckbox.classList.add("case-checkbox");

          const caseLabel = document.createElement("label");
          caseLabel.setAttribute("for", caseCheckboxId);
          caseLabel.textContent = "Case Insensitive";
          caseLabel.classList.add("case-label");

          caseSensitivityContainer.appendChild(caseCheckbox);
          caseSensitivityContainer.appendChild(caseLabel);
          optionsContainer.appendChild(caseSensitivityContainer);

          // Toggle for advanced options
          optionsToggle.addEventListener("click", () => {
            const isHidden = optionsContainer.style.display === "none";
            optionsContainer.style.display = isHidden ? "flex" : "none";
            optionsToggle.classList.toggle("active");
          });

          controlsContainer.appendChild(optionsContainer);

          // Filter option events
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
          // No multi-select; just add the empty container to keep layout
          controlsContainer.appendChild(primaryButtonsContainer);
        }

        searchContainer.appendChild(controlsContainer);
        dropdownOuterContainer.appendChild(searchContainer);

        // Search input events
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
      dropdownListContainer.setAttribute("id", "dropdown-list");
      dropdownListContainer.setAttribute("role", "listbox");
      if (this._multipleSelect) {
        dropdownListContainer.setAttribute("aria-multiselectable", "true");
      }

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

        // Build grouped or non-grouped UI
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
              // For each row, generate a truly unique ID
              this._uniqueRowCounter++;
              const checkboxId = `myCheckbox_${this._uniqueRowCounter}_${Date.now()}`;

              const checkboxDiv = document.createElement("div");
              checkboxDiv.classList.add("checkbox-item");
              checkboxDiv.dataset.itemValue = item.value;
              checkboxDiv.setAttribute("role", "option");
              checkboxDiv.setAttribute("tabindex", "-1");

              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = item.value;
              checkbox.id = checkboxId;
              checkbox.dataset.group = groupInfo.name;
              checkbox.dataset.displayValue = item.displayValue;

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.displayValue;
              label.title = item.displayValue;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              groupDiv.appendChild(checkboxDiv);

              checkboxDiv.setAttribute("aria-selected", checkbox.checked);

              // Click on the row toggles the correct checkbox
              checkboxDiv.addEventListener("click", (event) => {
                if (event.target.tagName.toLowerCase() !== 'input') {
                  checkbox.click();
                  event.stopPropagation();
                }
              });

              checkbox.addEventListener("change", (event) => {
                checkboxDiv.setAttribute("aria-selected", checkbox.checked);
                this.handleCheckboxChange(item.value, item.displayValue, groupInfo.name, event);
              });

              // Keyboard navigation
              checkboxDiv.addEventListener("keydown", (e) => {
                const allOptions = Array.from(this._container.querySelectorAll('[role="option"]:not(.hidden)'));
                let currentIndex = allOptions.indexOf(checkboxDiv);

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = allOptions[currentIndex + 1] || allOptions[0];
                  next.focus();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = allOptions[currentIndex - 1] || allOptions[allOptions.length - 1];
                  prev.focus();
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  checkbox.checked = !checkbox.checked;
                  const changeEvent = new Event("change", { bubbles: true });
                  checkbox.dispatchEvent(changeEvent);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  this._isOpen = false;
                  this.draw(this._oControlHost);
                  dropdownHeader.focus();
                }
              });
            });

            multiSelectDropdown.appendChild(groupDiv);
          } else {
            // Non-grouped items
            groupInfo.items.forEach((item) => {
              this._uniqueRowCounter++;
              const checkboxId = `myCheckbox_${this._uniqueRowCounter}_${Date.now()}`;

              const checkboxDiv = document.createElement("div");
              checkboxDiv.classList.add("checkbox-item", "no-group");
              checkboxDiv.dataset.itemValue = item.value;
              checkboxDiv.setAttribute("role", "option");
              checkboxDiv.setAttribute("tabindex", "-1");

              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = item.value;
              checkbox.id = checkboxId;
              checkbox.dataset.group = groupInfo.name;
              checkbox.dataset.displayValue = item.displayValue;

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.displayValue;
              label.title = item.displayValue;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              multiSelectDropdown.appendChild(checkboxDiv);

              checkboxDiv.setAttribute("aria-selected", checkbox.checked);

              checkboxDiv.addEventListener("click", (event) => {
                if (event.target.tagName.toLowerCase() !== 'input') {
                  checkbox.click();
                  event.stopPropagation();
                }
              });

              checkbox.addEventListener("change", (event) => {
                checkboxDiv.setAttribute("aria-selected", checkbox.checked);
                this.handleCheckboxChange(item.value, item.displayValue, groupInfo.name, event);
              });

              checkboxDiv.addEventListener("keydown", (e) => {
                const allOptions = Array.from(this._container.querySelectorAll('[role="option"]:not(.hidden)'));
                let currentIndex = allOptions.indexOf(checkboxDiv);

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = allOptions[currentIndex + 1] || allOptions[0];
                  next.focus();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = allOptions[currentIndex - 1] || allOptions[allOptions.length - 1];
                  prev.focus();
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  checkbox.checked = !checkbox.checked;
                  const changeEvent = new Event("change", { bubbles: true });
                  checkbox.dispatchEvent(changeEvent);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  this._isOpen = false;
                  this.draw(this._oControlHost);
                  dropdownHeader.focus();
                }
              });
            });
          }
        });

        dropdownListContainer.appendChild(multiSelectDropdown);

        // Apply initial selected values from _selectedItems
        const checkboxes = dropdownListContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
          if (this._selectedItems.some((item) => item.use === checkbox.value)) {
            checkbox.checked = true;
            const parentOption = checkbox.closest("[role='option']");
            if (parentOption) {
              parentOption.setAttribute("aria-selected", true);
            }
          }
        });
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

        if (
          groupColumnIndex !== undefined &&
          groupColumnIndex >= 0 &&
          groupColumnIndex < columnCount
        ) {
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
      const dropdownHeader = this._container.querySelector(".dropdown-header");
      if (dropdownHeader) {
        dropdownHeader.setAttribute("aria-expanded", this._isOpen.toString());
      }
      this.draw(this._oControlHost);

      // Manage outside click listener
      if (this._isOpen) {
        this._handleOutsideClickBound = this.handleOutsideClick.bind(this);
        document.addEventListener("click", this._handleOutsideClickBound);
      } else if (this._handleOutsideClickBound) {
        document.removeEventListener("click", this._handleOutsideClickBound);
      }
    }

    handleKeyboardNavigation(event) {
      if (!this._isOpen) return;

      const focusableElements = this._container.querySelectorAll('input[type="text"], button, select, .checkbox-item');
      if (focusableElements.length === 0) return;

      let focusIndex = Array.from(focusableElements).findIndex((el) => el === document.activeElement);
      if (focusIndex === -1) {
        focusIndex = 0;
        focusableElements[focusIndex].focus();
      }

      switch (event.key) {
        case "Tab":
          if (event.shiftKey) {
            focusIndex = (focusIndex - 1 + focusableElements.length) % focusableElements.length;
          } else {
            focusIndex = (focusIndex + 1) % focusableElements.length;
          }
          focusableElements[focusIndex].focus();
          event.preventDefault();
          break;
        case "ArrowUp":
          focusIndex = (focusIndex - 1 + focusableElements.length) % focusableElements.length;
          focusableElements[focusIndex].focus();
          event.preventDefault();
          break;
        case "ArrowDown":
          focusIndex = (focusIndex + 1) % focusableElements.length;
          focusableElements[focusIndex].focus();
          event.preventDefault();
          break;
        case "Enter":
          if (document.activeElement.classList.contains("checkbox-item")) {
            document.activeElement.querySelector('input[type="checkbox"]').click();
          }
          event.preventDefault();
          break;
        case "Space":
          if (document.activeElement.classList.contains("checkbox-item")) {
            document.activeElement.querySelector('input[type="checkbox"]').click();
          }
          event.preventDefault();
          break;
        case "Escape":
          this.toggleDropdown();
          event.preventDefault();
          break;
      }
    }

    handleOutsideClick(event) {
      if (!this._container.contains(event.target)) {
        this._isOpen = false;
        const dropdownHeader = this._container.querySelector(".dropdown-header");
        if (dropdownHeader) {
          dropdownHeader.setAttribute("aria-expanded", this._isOpen.toString());
        }
        this.draw(this._oControlHost);
        document.removeEventListener("click", this._handleOutsideClickBound);
      }
    }

    parseSearchTerms(rawInput) {
      if (!rawInput) return [];

      // Convert any ", " to ","
      const normalizedInput = rawInput.replace(/, /g, ",");
      let terms = normalizedInput
        .split(",")
        .map((term) => term.trim())
        .filter((term) => term.length > 0);

      if (this._currentFilter.caseInsensitive !== false) {
        terms = terms.map((term) => term.toLowerCase());
      }
      return terms;
    }

    applyFilter() {
      if (!this._isOpen) return;

      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const searchTerms = this._currentFilter.terms;
      const searchType = this._currentFilter.type || "containsAny";

      const checkboxItems = dropdownListContainer.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const label = item.querySelector("label");
        const displayValue = label ? label.textContent : "";

        let compareValue;
        let compareTerms;
        if (this._currentFilter.caseInsensitive !== false) {
          compareValue = displayValue.toLowerCase();
          compareTerms = searchTerms.map((term) => term.toLowerCase());
        } else {
          compareValue = displayValue;
          compareTerms = searchTerms;
        }

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

      // Hide entire group if it has no visible items
      const groups = dropdownListContainer.querySelectorAll(".group");
      groups.forEach((group) => {
        const visibleSubItems = group.querySelectorAll(".checkbox-item:not(.hidden)");
        group.style.display = visibleSubItems.length === 0 ? "none" : "";
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

        groupSelectButton.disabled = visibleCheckboxes.length === 0;
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
      if (!this._multipleSelect) return;
      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const visibleCheckboxes = dropdownListContainer.querySelectorAll(
        '.checkbox-item:not(.hidden) input[type="checkbox"]'
      );
      if (visibleCheckboxes.length === 0) return;

      const anyUnchecked = Array.from(visibleCheckboxes).some((cb) => !cb.checked);
      if (anyUnchecked) {
        // Select all visible
        visibleCheckboxes.forEach((cb) => {
          if (!cb.checked) {
            cb.checked = true;
            const itemData = { use: cb.value, display: cb.dataset.displayValue, group: cb.dataset.group };
            if (!this._selectedItems.some((item) => item.use === itemData.use)) {
              this._selectedItems.push(itemData);
            }
          }
        });
      } else {
        // Deselect all visible
        visibleCheckboxes.forEach((cb) => {
          if (cb.checked) {
            cb.checked = false;
            const itemData = { use: cb.value, display: cb.dataset.displayValue, group: cb.dataset.group };
            this._selectedItems = this._selectedItems.filter((item) => item.use !== itemData.use);
          }
        });
      }
      this.updateDeselectButtonStates();
      this._oControlHost.valueChanged();
    }

    selectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return;
      const visibleCheckboxes = groupDiv.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
      visibleCheckboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
          checkbox.checked = true;
          this.handleCheckboxChange(checkbox.value, checkbox.dataset.displayValue, groupName, { target: checkbox });
        }
      });
    }

    deselectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return;
      const checkboxes = groupDiv.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
          checkbox.checked = false;
          const itemData = { use: checkbox.value, display: checkbox.dataset.displayValue, group: groupName };
          this._selectedItems = this._selectedItems.filter((item) => item.use !== itemData.use);
        }
      });
      this.updateDeselectButtonStates();
      this._oControlHost.valueChanged();
    }

    handleCheckboxChange(value, displayValue, groupName, event) {
      const isChecked = event.target.checked;
      const itemData = { use: value, display: displayValue, group: groupName };

      if (isChecked) {
        if (!this._multipleSelect) {
          // Single-select: uncheck everything else
          const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
          if (dropdownListContainer) {
            const checkboxes = dropdownListContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb) => {
              if (cb !== event.target && cb.checked) {
                cb.checked = false;
                this._selectedItems = this._selectedItems.filter((item) => item.use !== cb.value);
              }
            });
          }
          // Add the new selection
          this._selectedItems = [itemData];
        } else {
          // Multi-select: just add this item
          if (!this._selectedItems.some((item) => item.use === value)) {
            this._selectedItems.push(itemData);
          }
        }
      } else {
        if (!this._multipleSelect) {
          // Single-select: removing the one choice empties selection
          this._selectedItems = [];
        } else {
          // Multi-select: remove from selection
          this._selectedItems = this._selectedItems.filter((item) => item.use !== value);
        }
      }

      // Update header text
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
      this._oControlHost.valueChanged();
    }

    getParameters(oControlHost) {
      if (!this._parameterName) {
        console.warn("MyDataLoggingControl - Parameter Name not configured.");
        return null;
      }
      const paramTest = oControlHost.getParameter(this._parameterName);
      console.log("paramTest", paramTest);

      const parameterValues = this._selectedItems.map((item) => ({
        use: item.use,
        display: item.display,
      }));
      console.log("parameterValues: ", parameterValues);

      return [
        {
          parameter: this._parameterName,
          values: parameterValues,
        },
      ];
    }

    destroy(oControlHost) {
      console.log("MyDataLoggingControl - Destroying");
      // Remove keyboard event if it was added
      this._container.removeEventListener("keydown", this.handleKeyboardNavigation.bind(this));
    }
  }

  return MyDataLoggingControl;
});
