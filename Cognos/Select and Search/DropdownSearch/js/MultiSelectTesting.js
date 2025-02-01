define([], function () {
  "use strict";

  class MyDataLoggingControl {
    constructor() {
      // Counter used to generate unique IDs.
      this._uniqueRowCounter = 0;

      // Bound methods for global event listeners.
      this._handleOutsideClickBound = this.handleOutsideClick.bind(this);
      // If you ever add a keyboard handler on a persistent element, store its bound reference.
      this._handleKeyboardNavigationBound = this.handleKeyboardNavigation.bind(this);

      // Initialize state properties.
      this._selectedItems = [];
      this._isOpen = false;
      this._initialLoadComplete = false;
      this._currentFilter = {
        terms: [],
        type: "containsAny",
        rawInput: "",
        caseInsensitive: true,
      };
      // Default to multi-select (may be changed by configuration)
      this._multipleSelect = true;
    }

    // Helper method to load CSS if not already loaded.
    loadCss() {
      if (!document.getElementById("myDataLoggingControl-css")) {
        var cssUrl = Application.GlassContext.gateway + "/v1/ext/Select_and_Search/css/multiselect.css";
        var link = document.createElement("link");
        link.id = "myDataLoggingControl-css"; // Unique ID to prevent duplicates.
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = cssUrl;
        link.onload = function () {
          console.log("CSS loaded successfully.");
        };
        link.onerror = function () {
          console.error("Error loading CSS:", cssUrl);
        };
        document.getElementsByTagName("head")[0].appendChild(link);
      }
    }

    initialize(oControlHost, fnDoneInitializing) {
      console.log("MyDataLoggingControl - Initializing");
      // Load the CSS file (only once) during initialization.
      this.loadCss();

      this._oControlHost = oControlHost;
      this._container = oControlHost.container;

      // Load initial selected items only once
      if (!this._initialLoadComplete) {
        this._initialLoadComplete = true;
        const config = oControlHost.configuration;

        // Capture parameter name and load any preset selections
        this._parameterName = config["Parameter Name"];
        if (this._parameterName) {
          const initialValues = oControlHost.getParameter(this._parameterName);
          if (initialValues) {
            const params = Array.isArray(initialValues) ? initialValues : [initialValues];
            params.forEach((param) => {
              if (param && param.values && Array.isArray(param.values)) {
                param.values.forEach((item) => {
                  // Standardize selected item objects to always use keys: use, display, group (group is optional)
                  this._selectedItems.push({
                    use: item.use,
                    display: item.display,
                    group: item.group || null,
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
       // Load the CSS file (only once) during initialization.
       this.loadCss();
      // Clear container (removing old event listeners on inner elements)
      this._container.innerHTML = "";
      this._container.classList.add("custom-dropdown-container");

      const config = oControlHost.configuration;
      this._labelText = config["Label Text"] || "Select Options";

      // Determine multi-select setting from config
      this._multipleSelect = config["Multiple Select"] !== false;

      // Set container width if configured
      if (config["Container Width"]) {
        this._container.style.width = config["Container Width"];
      }

      // ******************
      // Create Dropdown Header
      // ******************
      const dropdownHeader = document.createElement("div");
      dropdownHeader.classList.add("dropdown-header");
      dropdownHeader.setAttribute("role", "button");
      dropdownHeader.setAttribute("tabindex", "0");
      dropdownHeader.setAttribute("aria-expanded", this._isOpen);
      dropdownHeader.setAttribute("aria-controls", "dropdown-list");

      const labelSpan = document.createElement("span");
      if (this._selectedItems.length > 0) {
        if (!this._multipleSelect) {
          // Single select: show the selected item's display value
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

      // Instead of inline binding, create a bound function for toggling.
      dropdownHeader.addEventListener("click", this.toggleDropdown.bind(this));

      // Keyboard support for header – using an inline arrow function here is acceptable
      dropdownHeader.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleDropdown();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!this._isOpen) this.toggleDropdown();
          const firstOption = this._container.querySelector('[role="option"]');
          if (firstOption) firstOption.focus();
        }
      });
      this._container.appendChild(dropdownHeader);

      // ******************
      // Create Outer Dropdown Container
      // ******************
      const dropdownOuterContainer = document.createElement("div");
      dropdownOuterContainer.classList.add("dropdown-outer-container");
      dropdownOuterContainer.style.display = this._isOpen ? "block" : "none";

      // Only build the search container and controls if the dropdown is open.
      if (this._isOpen) {
        // Build Search Container
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

        // Create clear button and magnifier icons
        const clearButton = document.createElement("span");
        clearButton.classList.add("clear-button");
        clearButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" 
                stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
        // Initially hide clear button if there is no input.
        clearButton.style.display = searchInput.value.length > 0 ? "block" : "none";
        searchInputContainer.appendChild(clearButton);

        const magnifier = document.createElement("span");
        magnifier.classList.add("magnifier");
        magnifier.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" 
                stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
        magnifier.style.display = searchInput.value.length > 0 ? "none" : "block";
        searchInputContainer.appendChild(magnifier);

        searchContainer.appendChild(searchInputContainer);

        // Controls container – different for multi-select vs. single-select.
        const controlsContainer = document.createElement("div");
        controlsContainer.classList.add("search-controls");

        // Primary buttons container for multi-select
        const primaryButtonsContainer = document.createElement("div");
        primaryButtonsContainer.classList.add("primary-buttons-container");

        if (this._multipleSelect) {
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

          // Options container that holds additional filtering controls.
          const optionsContainer = document.createElement("div");
          optionsContainer.classList.add("options-container");
          optionsContainer.style.display = "none";

          // Search type selector
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
          // Set current filter type if available.
          searchType.value = this._currentFilter.type || "containsAny";
          optionsContainer.appendChild(searchType);

          // Case sensitivity container with checkbox
          const caseSensitivityContainer = document.createElement("div");
          caseSensitivityContainer.classList.add("case-sensitivity-container");

          const caseCheckboxId = `caseCheckbox_${Date.now()}`;
          const caseCheckbox = document.createElement("input");
          caseCheckbox.type = "checkbox";
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

          // Toggle the options container on button click.
          optionsToggle.addEventListener("click", () => {
            const isHidden = optionsContainer.style.display === "none";
            optionsContainer.style.display = isHidden ? "flex" : "none";
            optionsToggle.classList.toggle("active");
          });
          controlsContainer.appendChild(optionsContainer);

          // Listen for changes on search type and case sensitivity.
          searchType.addEventListener("change", (e) => {
            this._currentFilter.type = e.target.value;
            this.applyFilter();
          });

          caseCheckbox.addEventListener("change", (e) => {
            this._currentFilter.caseInsensitive = e.target.checked;
            this.applyFilter();
          });

          // Toggle all filtered checkboxes when filterButton is clicked.
          filterButton.addEventListener("click", () => {
            this.toggleSelectDeselectFiltered();
          });
        } else {
          // For single-select, you might include additional controls if needed.
          controlsContainer.appendChild(primaryButtonsContainer);
        }
        searchContainer.appendChild(controlsContainer);
        dropdownOuterContainer.appendChild(searchContainer);

        // ******************
        // Search input events
        // ******************
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
          this._currentFilter.rawInput = "";
          this._currentFilter.terms = [];
          this.applyFilter();
          clearButton.style.display = "none";
          magnifier.style.display = "block";
        });
      } // end if _isOpen

      // ******************
      // Create Dropdown List Container
      // ******************
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

      // If no data has been loaded, show a message.
      if (!this._groupedData) {
        const messageDiv = document.createElement("div");
        messageDiv.textContent = "No data available to display.";
        dropdownListContainer.appendChild(messageDiv);
      } else {
        const showGroups = config["Show Groups"] !== undefined ? config["Show Groups"] : true;
        const multiSelectDropdown = document.createElement("div");
        multiSelectDropdown.classList.add("multi-select-dropdown");

        // Build groups or flat list based on the configuration.
        this._groupedData.forEach((groupInfo) => {
          if (showGroups) {
            // Create group container
            const groupDiv = document.createElement("div");
            groupDiv.classList.add("group");

            const groupHeaderDiv = document.createElement("div");
            groupHeaderDiv.classList.add("group-header");
            groupHeaderDiv.style.backgroundColor = config["Group Color"] || "#f0f0f0";

            const groupLabel = document.createElement("span");
            groupLabel.classList.add("group-label");
            groupLabel.textContent = groupInfo.name;
            groupLabel.title = groupInfo.name;
            groupHeaderDiv.appendChild(groupLabel);

            if (this._multipleSelect) {
              // Create select/deselect buttons for the group.
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

            // Create checkbox items for each item in the group.
            groupInfo.items.forEach((item) => {
              const checkboxId = `myCheckbox_${++this._uniqueRowCounter}`;
              const checkboxDiv = document.createElement("div");
              checkboxDiv.classList.add("checkbox-item");
              checkboxDiv.dataset.itemValue = item.value;
              checkboxDiv.setAttribute("role", "option");
              checkboxDiv.setAttribute("tabindex", "-1");

              // Create the checkbox input element.
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = item.value;
              checkbox.id = checkboxId;
              checkbox.dataset.group = groupInfo.name;
              // Use consistent data attribute: "display" for the display text.
              checkbox.dataset.display = item.display;

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.display;
              label.title = item.display;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              groupDiv.appendChild(checkboxDiv);

              // Set ARIA state based on checkbox checked status.
              checkboxDiv.setAttribute("aria-selected", checkbox.checked);

              // When clicking on the row (but not directly on the input/label) toggle the checkbox.
              checkboxDiv.addEventListener("click", (event) => {
                const tag = event.target.tagName.toLowerCase();
                if (tag === "input" || tag === "label") return;
                checkbox.checked = !checkbox.checked;
                const changeEvent = new Event("change", { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
              });

              // Listen for changes on the checkbox.
              checkbox.addEventListener("change", (event) => {
                checkboxDiv.setAttribute("aria-selected", checkbox.checked);
                // Pass the consistent property names to the handler.
                this.handleCheckboxChange(item.value, item.display, groupInfo.name, event);
              });

              // Keyboard navigation for the checkbox item.
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
            // If not using groups, add items flat.
            groupInfo.items.forEach((item) => {
              const checkboxId = `myCheckbox_${++this._uniqueRowCounter}`;
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
              checkbox.dataset.display = item.display;

              const label = document.createElement("label");
              label.setAttribute("for", checkboxId);
              label.textContent = item.display;
              label.title = item.display;

              checkboxDiv.appendChild(checkbox);
              checkboxDiv.appendChild(label);
              multiSelectDropdown.appendChild(checkboxDiv);

              checkboxDiv.setAttribute("aria-selected", checkbox.checked);

              checkboxDiv.addEventListener("click", (event) => {
                const tag = event.target.tagName.toLowerCase();
                if (tag === "input" || tag === "label") return;
                checkbox.checked = !checkbox.checked;
                const changeEvent = new Event("change", { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
              });

              checkbox.addEventListener("change", (event) => {
                checkboxDiv.setAttribute("aria-selected", checkbox.checked);
                this.handleCheckboxChange(item.value, item.display, groupInfo.name, event);
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

        // After building the list, update the initial checked state based on _selectedItems.
        const checkboxes = dropdownListContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((cb) => {
          if (this._selectedItems.some((item) => item.use === cb.value)) {
            cb.checked = true;
            const parentOption = cb.closest("[role='option']");
            if (parentOption) {
              parentOption.setAttribute("aria-selected", true);
            }
          }
        });
      } // end else (if there is grouped data)

      dropdownOuterContainer.appendChild(dropdownListContainer);
      this._container.appendChild(dropdownOuterContainer);

      // When open, reapply filtering and update group button states.
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
        const groupName = groupingValue || (groupColumnIndex !== undefined ? "Ungrouped" : "All Items");

        if (groupColumnIndex !== undefined && groupColumnIndex >= 0 && groupColumnIndex < columnCount) {
          if (!seenGroups.has(groupName)) {
            this._groupedData.push({ name: groupName, items: [] });
            seenGroups.add(groupName);
          }
          const currentGroup = this._groupedData.find((group) => group.name === groupName);
          currentGroup.items.push({ value: value, display: displayValue });
        } else {
          if (!seenGroups.has("All Items")) {
            this._groupedData.push({ name: "All Items", items: [] });
            seenGroups.add("All Items");
          }
          const allItemsGroup = this._groupedData.find((group) => group.name === "All Items");
          allItemsGroup.items.push({ value: value, display: displayValue });
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

      // Manage the document-level click listener for closing the dropdown.
      if (this._isOpen) {
        document.addEventListener("click", this._handleOutsideClickBound);
      } else {
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
        case " ":
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
      // Normalize commas with or without spaces.
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

      // Loop through each checkbox item and determine its visibility.
      const checkboxItems = dropdownListContainer.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const label = item.querySelector("label");
        const displayValue = label ? label.textContent : "";
        let compareValue = displayValue;
        let compareTerms = searchTerms;

        if (this._currentFilter.caseInsensitive !== false) {
          compareValue = displayValue.toLowerCase();
          compareTerms = searchTerms.map((term) => term.toLowerCase());
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
                  isVisible = compareTerms.slice(1).every((t) => compareValue.includes(t));
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

      // Hide entire groups that have no visible items.
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
        if (groupSelectButton) {
          groupSelectButton.disabled = visibleCheckboxes.length === 0;
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
      if (!this._multipleSelect) return;
      const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
      if (!dropdownListContainer) return;

      const visibleCheckboxes = dropdownListContainer.querySelectorAll(
        '.checkbox-item:not(.hidden) input[type="checkbox"]'
      );
      if (visibleCheckboxes.length === 0) return;

      // Determine if at least one is unchecked.
      const anyUnchecked = Array.from(visibleCheckboxes).some((cb) => !cb.checked);
      visibleCheckboxes.forEach((cb) => {
        // Only update if necessary, and dispatch a change event so that state stays in sync.
        if (anyUnchecked && !cb.checked) {
          cb.checked = true;
          const changeEvent = new Event("change", { bubbles: true });
          cb.dispatchEvent(changeEvent);
        } else if (!anyUnchecked && cb.checked) {
          cb.checked = false;
          const changeEvent = new Event("change", { bubbles: true });
          cb.dispatchEvent(changeEvent);
        }
      });
      this.updateDeselectButtonStates();
      this._oControlHost.valueChanged();
    }

    selectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return;
      const visibleCheckboxes = groupDiv.querySelectorAll('.checkbox-item:not(.hidden) input[type="checkbox"]');
      visibleCheckboxes.forEach((checkbox) => {
        if (!checkbox.checked) {
          checkbox.checked = true;
          const changeEvent = new Event("change", { bubbles: true });
          checkbox.dispatchEvent(changeEvent);
        }
      });
    }

    deselectAllInGroup(groupName, groupDiv) {
      if (!this._multipleSelect) return;
      const checkboxes = groupDiv.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
          checkbox.checked = false;
          const changeEvent = new Event("change", { bubbles: true });
          checkbox.dispatchEvent(changeEvent);
        }
      });
      this.updateDeselectButtonStates();
      this._oControlHost.valueChanged();
    }

    handleCheckboxChange(value, display, groupName, event) {
      const isChecked = event.target.checked;
      const itemData = { use: value, display: display, group: groupName };

      if (isChecked) {
        if (!this._multipleSelect) {
          // Single-select: uncheck any other checked boxes.
          const dropdownListContainer = this._container.querySelector(".dropdown-list-container");
          if (dropdownListContainer) {
            const checkboxes = dropdownListContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb) => {
              if (cb !== event.target && cb.checked) {
                cb.checked = false;
                this._selectedItems = this._selectedItems.filter((itm) => itm.use !== cb.value);
              }
            });
          }
          // Now set this as the only selection.
          this._selectedItems = [itemData];
        } else {
          // Multi-select: add the item if not already present.
          if (!this._selectedItems.some((itm) => itm.use === value)) {
            this._selectedItems.push(itemData);
          }
        }
      } else {
        if (!this._multipleSelect) {
          this._selectedItems = [];
        } else {
          this._selectedItems = this._selectedItems.filter((itm) => itm.use !== value);
        }
      }

      // Update the header text.
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
      const parameterValues = this._selectedItems.map((item) => ({
        use: item.use,
        display: item.display,
      }));
      return [
        {
          parameter: this._parameterName,
          values: parameterValues,
        },
      ];
    }

    destroy(oControlHost) {
      console.log("MyDataLoggingControl - Destroying");
      // Remove any document-level event listeners using the stored bound functions.
      document.removeEventListener("click", this._handleOutsideClickBound);
      // If you ever attached a persistent keyboard handler, remove it using its stored bound reference.
      if (this._container) {
        this._container.removeEventListener("keydown", this._handleKeyboardNavigationBound);
      }
    }
  }

  return MyDataLoggingControl;
});
