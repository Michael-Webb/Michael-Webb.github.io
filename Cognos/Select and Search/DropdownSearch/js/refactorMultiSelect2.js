define(() => {
  "use strict";

  // Utility: Generic debounce function
  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  class CustomControl {
    constructor() {
      this.mainParamValues = [];
      this.groupChildren = {};
      this.isMultiple = false;
      this.autoSubmit = true;
      this.hasGrouping = false;
      this.isCompact = false;
      this.uniqueIdCounter = 0;
      this.instancePrefix = null;

      // IDs for various elements
      this.containerId = null;
      this.dropdownId = null;
      this.headerId = null;
      this.contentId = null;
      this.searchId = null;
      this.advancedBtnId = null;
      this.searchControlsId = null;
      this.applyBtnId = null;
      this.selectAllId = null;
      this.deselectAllId = null;
      this.searchTypeSelectId = null;
      this.searchResultsLiveId = null;

      this.showSelectedId = null;
      this.showingSelectedOnly = false; // Track whether we’re filtering to show only selected items

      // Cached DOM elements
      this.elements = {};

      this.groups = [];
      this.checkboxes = [];
      this.debounceDelay = 100; // milliseconds

      // Initialize properties to store the last filter state.
      this.lastSearchValue = "";
      this.lastSearchType = "";

      // Bound event handler references for cleanup
      this.boundDocumentClickHandler = this.handleDocumentClick.bind(this);
      this.boundDropdownKeydownHandler = this.handleDropdownKeydown.bind(this);
      this.boundCheckboxKeydownHandler = this.handleCheckboxKeydown.bind(this);
    }

    generateId(baseString) {
      this.uniqueIdCounter++;
      return `${this.instancePrefix}_${baseString}_${this.uniqueIdCounter}`;
    }

    /**
     * Initialize the control and extract initial parameter values.
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;

      // Destructure configuration properties with defaults
      const {
        "Parameter Name": paramName,
        "Case Insensitive Search Default": caseInsensitiveDefault = true,
        "Value Use Column": valueUseCol = 0,
        "Value Display Column": valueDispCol = 1,
        "Grouping Parent Name": groupingParamName = "",
        "Group Values": groupVals = false,
        "Parent Value Use Column": groupingValUseCol = 2,
        "Parent Value Display Column": groupingValDispCol = 3,
        "Dropdown Width": dropdownWidth = "250px",
        "Content Width": contentWidth = "250px",
        "Multiple Select": multipleSelect = false,
        AutoSubmit: autoSubmit = true,
        Compact: isCompact = false,
      } = oControlHost.configuration;

      // Assign to instance properties for later use
      this.paramName = paramName;
      this.caseInsensitiveDefault = Boolean(caseInsensitiveDefault);
      this.caseInsensitive = this.caseInsensitiveDefault;
      this.valueUseCol = valueUseCol;
      this.valueDispCol = valueDispCol;
      this.groupingParamName = groupingParamName;
      this.groupVals = groupVals;
      this.groupingValUseCol = groupingValUseCol;
      this.groupingValDispCol = groupingValDispCol;
      this.dropdownWidth = dropdownWidth;
      this.contentWidth = contentWidth;
      this.isMultiple = !!multipleSelect;
      this.autoSubmit = autoSubmit;
      this.isCompact = isCompact;

      // Initialize main parameter values
      this.mainParamValues = [];
      const mainParams = oControlHost.getParameter(this.paramName);
      if (mainParams && Array.isArray(mainParams.values)) {
        mainParams.values.forEach((val) => {
          // Exclude the default checkbox value (e.g., "on")
          if (val.use !== "on") {
            this.mainParamValues.push(val.use);
          }
        });
      }
      console.log("mainParams & mainParamValues", mainParams);

      fnDoneInitializing();
    }

    /**
     * Receives authored data.
     */
    setData(oControlhost, oDataStore) {
      this.m_oDataStore = oDataStore;
      console.log("SetData: ", this.m_oDataStore);
    }

    /**
     * Build the complete HTML template.
     */
    generateTemplateHTML() {
      // Generate unique IDs for all elements.
      this.containerId = this.generateId("container");
      this.dropdownId = this.generateId("dropdown");
      this.headerId = this.generateId("header");
      this.contentId = this.generateId("content");
      this.searchId = this.generateId("search");
      this.advancedBtnId = this.generateId("advancedBtn");
      this.searchControlsId = this.generateId("searchControls");
      this.applyBtnId = this.generateId("applyBtn");
      this.selectAllId = this.generateId("selectAll");
      this.deselectAllId = this.generateId("deselectAll");
      this.searchTypeSelectId = this.generateId("searchTypeSelect");
      this.searchResultsLiveId = this.generateId("searchResultsLive");
      this.showSelectedId = this.generateId("showSelected");

      // Clear any previously stored groups or checkboxes.
      this.groups = [];
      this.checkboxes = [];

      // Determine dropdown CSS class (adding compact style if needed)
      let dropdownClass = "dropdown-container" + (this.isCompact ? " compact" : "");

      // Build HTML parts using helper methods.
      const styleBlock = this.generateStyleBlock(this.dropdownWidth, this.contentWidth);
      const headerHTML = this.generateHeaderHTML();
      const contentHTML = this.generateContentHTML({
        valueUseCol: this.valueUseCol,
        valueDispCol: this.valueDispCol,
        groupingParamName: this.groupingParamName,
        groupVals: this.groupVals,
        groupingValUseCol: this.groupingValUseCol,
        groupingValDispCol: this.groupingValDispCol,
      });
      const footerHTML = this.generateFooterHTML();

      return `
          ${styleBlock}
          <div class="${dropdownClass}" id="${this.dropdownId}">
            ${headerHTML}
            <div class="dropdown-content" id="${this.contentId}" role="dialog" aria-label="Options selection">
              ${contentHTML}
              ${footerHTML}
            </div>
            <div class="sr-only" role="status" aria-live="polite" id="${this.searchResultsLiveId}"></div>
          </div>
        `;
    }

    /**
     * Returns the CSS block. (This remains inline for now.)
     */
    generateStyleBlock(dropdownWidth, contentWidth) {
      return `<style>
          :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --border: #e5e7eb;
            --text: #1f2937;
            --bg-hover: #f9fafb;
            --radius: .5rem;
            --shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px;
            --padding-lg: 0.75rem 1rem;
            --padding-md: 0.5rem 0.75rem;
            --padding-sm: 0.25rem 0.75rem;
            --margin-md: 0.25rem;
          }
          .dropdown-container {
            position: relative;
            width: ${dropdownWidth};
            font-family: system-ui, sans-serif;
          }
          .dropdown-container.compact {
            /* additional compact styles if needed */
          }
          .dropdown-header {
            width: 100%;
            padding: var(--padding-md);
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            background: white;
            color: var(--text);
            cursor: pointer;
            transition: border-color 0.2s;
            box-sizing: border-box;
          }
          .dropdown-header:hover {
            border-color: var(--primary);
          }
          .dropdown-header:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
          .dropdown-content {
            position: absolute;
            top: 100%;
            left: 0;
            width: ${contentWidth};
            background: white;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            box-shadow: var(--shadow);
            z-index: 1000;
            margin-top: 0.5rem;
            display: none;
          }
          .dropdown-content.visible {
            display: block;
          }
          .header {
            border-bottom: 1px solid var(--border);
          }
          .search-container {
            width: 100%;
            padding: var(--padding-lg);
            box-sizing: border-box;
          }
          .search-wrapper {
            position: relative;
            display: inline-block;
            width: 100%;
          }
          .search-input {
            width: 100%;
            padding: 0.5rem 2rem 0.5rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            margin-bottom: var(--margin-md);
            font-size: 0.875rem;
            box-sizing: border-box;
          }
          .search-input:focus {
            outline: none;
            border-color: var(--primary);
          }
          .search-icon {
            position: absolute;
            right: 0.5rem;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 0;
          }
          .header-buttons {
            display: flex;
            align-items: center;
            gap: 0.5rem; /* Adjust spacing as needed */
            margin-top: 0.5rem; /* Optional: adds spacing below the search input */
          }

          .advanced-search {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--primary);
            background: none;
            border: none;
            font-size: 0.875rem;
            cursor: pointer;
            padding: 0.25rem .25rem .25rem 0rem;
          }
          .advanced-search:focus-visible {
            outline: 1px solid var(--primary);
            outline-offset: 2px;
          }
          .search-controls {
            display: none;
            flex-direction: column;
            gap: var(--margin-md);
            margin-top: var(--margin-md);
          }
          .search-controls.expanded {
            display: flex;
          }
          .search-options {
            width: 75%;
          }
          .search-type {
            width: 100%;
            padding: 0.125rem 0.25rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            font-size: 0.875rem;
            outline: none;
          }
          .search-type:focus-visible {
            outline: 1px solid var(--primary);
          }
          .search-type-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: var(--text);
            cursor: pointer;
            border-radius: var(--radius);
          }
          .case-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text);
            cursor: pointer;
            border-radius: var(--radius);
          }
          input[type="checkbox"] {
            margin: 0rem 0.5rem 0rem 0rem;
            flex-shrink: 0;
            transform: translateY(1px);
            vertical-align: middle !important;
          }
          .case-checkbox {
            margin: 0;
          }
          
          .case-checkbox:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
          .group {
            margin-bottom: var(--margin-md);
          }
          .group-header {
            padding: .25rem .75rem .25rem .5rem;
            background: var(--bg-hover);
            font-weight: 500;
            font-size: 0.875rem;
            color: var(--text);
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
            gap: 0.5rem;
          }
          .group-header span {
            display: block;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
            max-width: calc(100% - 120px);
          }
          .group-controls {
            display: flex;
            gap: 0.25rem;
            align-items: center;
            flex-shrink: 0;
            width: 120px;
          }
          .btn {
            padding: 0.375rem 0.5rem;
            border-radius: var(--radius);
            font-size: 0.875rem;
            cursor: pointer;
            white-space: nowrap
          }
          .btn:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
          .btn.primary {
            background: var(--primary);
            color: white;
            border: none;
          }
          .btn.primary:hover {
            background: var(--primary-hover);
          }
          .btn.secondary {
            background: white;
            border: 1px solid var(--border);
            color: var(--text);
          }
          .btn.secondary:hover {
            background: var(--bg-hover);
          }
          .checkbox-item {
            display: flex;
            align-items: center;
            padding:var(--padding-sm);
            cursor: pointer;
            transition: background 0.2s;
          }
          .checkbox-item:hover {
            background: var(--bg-hover);
          }
          .checkbox-item input[type="checkbox"]:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
          }
          .checkbox-item span {
            font-size: 0.875rem;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            min-width: 0;
          }
          .hidden {
            display: none !important;
          }
          .dropdown-footer {
            padding: var(--padding-lg);
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .select-controls {
            display: flex;
            gap: 0.5rem;
          }
          .chevron {
            fill: currentColor;
            transition: transform 0.2s;
          }
          .expanded .chevron {
            transform: rotate(180deg);
          }
          .list {
            max-height: 250px;
            overflow-y: auto;
            overflow-x: hidden;
          }
          .list::-webkit-scrollbar {
            width: 8px;
          }
          .list::-webkit-scrollbar-track {
            background: transparent;
          }
          .list::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .list::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
          }
          .no-options {
            padding: 1rem;
            text-align: center;
            color: #666;
            font-size: 0.875rem;
          }

        </style>`;
    }

    /**
     * Generate the header section.
     */
    generateHeaderHTML() {
      return `
          <button class="dropdown-header" aria-expanded="false" aria-controls="${this.contentId}" aria-haspopup="true" id="${this.headerId}">
            <span>Select Options</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" disabled>
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
        `;
    }

    /**
     * Generate the content section (search area and option list).
     */
    generateContentHTML({
      valueUseCol,
      valueDispCol,
      groupingParamName,
      groupVals,
      groupingValUseCol,
      groupingValDispCol,
    }) {
      const caseInsensitiveChecked = this.caseInsensitiveDefault ? "checked" : "";
      let html = `
          <div class="header">
            <div class="search-container">
              <div class="search-wrapper">
                <input type="text" class="search-input" id="${
                  this.searchId
                }" placeholder="Search options..." aria-label="Search options" />
                <button type="button" class="search-icon" id="searchIcon" aria-label="Search">
                  ${this.getSearchIconSVG(true)}
                </button>
              </div>
              <div class="header-buttons">
                <button class="advanced-search" 
                        aria-expanded="false" 
                        aria-controls="${this.searchControlsId}" 
                        id="${this.advancedBtnId}"
                >
                  <span>
                   Advanced
                   </span>
                  <svg class="chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                </button>
                <button class="btn secondary show-selected-btn" aria-label="Show only selected options" id="${
                  this.showSelectedId
                }">
                  Show Selected
                </button>
              </div>
              <div id="${this.searchControlsId}" class="search-controls">
                <div class="search-options">
                  <label class="search-type-option"><span>Search type:</span></label>
                  <select class="search-type" aria-label="Search type" id="${this.searchTypeSelectId}">
                    <option value="containsAny">Contains any of these keywords</option>
                    <option value="containsAll">Contains all of these keywords</option>
                    <option value="startsWithAny">Starts with any of these keywords</option>
                    <option value="startsWithFirstContainsRest">Starts with first keyword and contains all of the remaining keywords</option>
                  </select>
                </div>
                <label class="case-option">
                  <input type="checkbox" class="case-checkbox" ${caseInsensitiveChecked} />
                  <span>Case insensitive</span>
                </label>
              </div>
            </div>
          </div>
          <div class="list">
        `;

      // Check if the data store is set and has rows.
      if (this.m_oDataStore && this.m_oDataStore.rowCount) {
        console.log("Datastore: ", this.m_oDataStore);

        if (groupVals && groupingParamName !== "") {
          // --- Grouped options ---
          let groups = {};
          for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
            const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
            const mainDisp = this.m_oDataStore.getCellValue(i, valueDispCol);
            const groupUse = this.m_oDataStore.getCellValue(i, groupingValUseCol);
            const groupDisp = this.m_oDataStore.getCellValue(i, groupingValDispCol);
            if (!groups[groupUse]) {
              groups[groupUse] = { display: groupDisp, items: [] };
            }
            groups[groupUse].items.push({ use: mainUse, display: mainDisp });
          }

          for (const groupKey in groups) {
            const group = groups[groupKey];
            const groupId = this.generateId("group");
            const groupHeaderId = this.generateId("groupHeader");
            const groupSelectId = this.generateId("groupSelect");
            const groupDeselectId = this.generateId("groupDeselect");
            const groupItemsId = this.generateId("groupItems");

            html += `
                <div class="group" id="${groupId}">
                  <div class="group-header" id="${groupHeaderId}">
                    <span title="${group.display}">${group.display}</span>
                    ${
                      this.isMultiple
                        ? `<div class="group-controls">
                      <button class="btn secondary group-select" aria-label="Select all items in ${group.display}" id="${groupSelectId}">Select All</button>
                      <button class="btn secondary group-deselect" aria-label="Clear all selections in ${group.display}" id="${groupDeselectId}">Clear</button>
                    </div>`
                        : ""
                    }
                  </div>
                  <div class="group-items" role="group" aria-label="${group.display} options" id="${groupItemsId}">
              `;

            group.items.forEach((item) => {
              const itemId = this.generateId("item");
              html += `
                  <label class="checkbox-item" title="${item.display}">
                    <input type="checkbox" value="${item.use}" aria-label="${item.display}" id="${itemId}" />
                    <span>${item.display}</span>
                  </label>
                `;
            });

            html += `
                  </div>
                </div>
              `;
            this.groups.push({
              groupId,
              groupHeaderId,
              groupSelectId,
              groupDeselectId,
              groupItemsId,
            });
          }
        } else {
          // --- Non-grouped options ---
          for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
            const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
            const mainDisp = this.m_oDataStore.getCellValue(i, valueDispCol);
            const itemId = this.generateId("item");
            html += `
                <label class="checkbox-item" title="${mainDisp}">
                  <input type="checkbox" value="${mainUse}" aria-label="${mainDisp}" id="${itemId}" />
                  <span>${mainDisp}</span>
                </label>
              `;
          }
        }
      } else {
        // Log a warning and show a fallback message.
        console.warn("Data store is not set or has no rows.");
        html += `<p class="no-options">No data available.</p>`;
      }

      html += `</div>`; // Close list.
      return html;
    }

    /**
     * Generate the footer section.
     * For single-selection:
     *   - If autoSubmit is true, no footer is rendered.
     *   - If autoSubmit is false, only the Apply button is rendered.
     * For multiple-selection, the full footer is shown.
     */
    generateFooterHTML() {
      if (!this.isMultiple) {
        if (this.autoSubmit) {
          return ""; // No footer when autoSubmit is enabled for single-selection
        } else {
          return `
            <div class="dropdown-footer">
              <button class="btn primary apply-btn" id="${this.applyBtnId}">Apply</button>
            </div>
          `;
        }
      } else {
        return `
          <div class="dropdown-footer">
            <div class="select-controls">
              <button class="btn secondary select-btn" aria-label="Select all options" id="${this.selectAllId}">Select all</button>
              <button class="btn secondary deselect-btn" aria-label="Clear all selections" id="${this.deselectAllId}">Clear</button>
            </div>
            <button class="btn primary apply-btn" id="${this.applyBtnId}">Apply</button>
          </div>
        `;
      }
    }

    /**
     * Return the proper SVG markup for the search icon.
     * @param {boolean} isEmpty - True if the search input is empty.
     */
    getSearchIconSVG(isEmpty) {
      if (isEmpty) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>`;
      } else {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#808080" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>`;
      }
    }

    /**
     * Cache DOM references and apply event listeners.
     */
    applyEventListeners() {
      const container = this.oControlHost.container;
      // Cache element references.
      this.elements.dropdown = container.querySelector(`#${this.dropdownId}`);
      this.elements.header = container.querySelector(`#${this.headerId}`);
      this.elements.content = container.querySelector(`#${this.contentId}`);
      this.elements.search = container.querySelector(`#${this.searchId}`);
      this.elements.advancedBtn = container.querySelector(`#${this.advancedBtnId}`);
      this.elements.searchControls = container.querySelector(`#${this.searchControlsId}`);
      this.elements.searchTypeSelect = container.querySelector(`#${this.searchTypeSelectId}`);
      this.elements.searchResultsLive = container.querySelector(`#${this.searchResultsLiveId}`);
      this.elements.searchIcon = container.querySelector("#searchIcon");
      this.elements.showSelected = container.querySelector(`#${this.showSelectedId}`);

      // Only expect selectAll and deselectAll (and applyBtn) if they were rendered.
      if (this.isMultiple) {
        this.elements.selectAll = container.querySelector(`#${this.selectAllId}`);
        this.elements.deselectAll = container.querySelector(`#${this.deselectAllId}`);
      }
      if (!this.autoSubmit || this.isMultiple) {
        this.elements.applyBtn = container.querySelector(`#${this.applyBtnId}`);
      }

      // Define the required element keys based on configuration.
      const requiredKeys = [
        "dropdown",
        "header",
        "content",
        "search",
        "advancedBtn",
        "searchControls",
        "searchTypeSelect",
        "searchResultsLive",
        "searchIcon",
        "showSelected",
      ];
      if (this.isMultiple) {
        requiredKeys.push("selectAll", "deselectAll");
      }
      if (!this.autoSubmit || this.isMultiple) {
        requiredKeys.push("applyBtn");
      }

      // Verify that all required elements are present.
      const missingElements = [];
      for (const key of requiredKeys) {
        if (!this.elements[key]) {
          missingElements.push(key);
        }
      }
      if (missingElements.length > 0) {
        console.error("Missing elements: ", missingElements.join(", "));
        return;
      }

      // If the control is set to compact, add the compact class.
      if (this.isCompact) {
        this.elements.dropdown.classList.add("compact");
      }

      // Hide the dropdown content initially.
      this.elements.content.classList.remove("visible");

      // Toggle dropdown when the header is clicked.
      this.elements.header.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = this.elements.content.classList.contains("visible");
        if (isVisible) {
          this.elements.content.classList.remove("visible");
          this.elements.header.setAttribute("aria-expanded", "false");
        } else {
          this.elements.content.classList.add("visible");
          this.elements.header.setAttribute("aria-expanded", "true");
          this.elements.search.focus();
        }
      });

      // Close the dropdown if clicking outside.
      document.addEventListener("click", this.boundDocumentClickHandler);

      // Toggle advanced search controls.
      this.elements.advancedBtn.addEventListener("click", () => {
        const expanded = this.elements.advancedBtn.classList.toggle("expanded");
        this.elements.searchControls.classList.toggle("expanded", expanded);
        this.elements.advancedBtn.setAttribute("aria-expanded", expanded);
      });

      // Handle Escape key within the content.
      this.elements.content.addEventListener("keydown", this.boundDropdownKeydownHandler);

      // Cache the case-insensitive checkbox and set its initial state.
      const caseCheckbox = this.elements.dropdown.querySelector(".case-checkbox");
      if (caseCheckbox) {
        caseCheckbox.checked = this.caseInsensitiveDefault;
        caseCheckbox.addEventListener("change", () => {
          // Update our flag based on user input.
          this.caseInsensitive = caseCheckbox.checked;
          // Optionally, re-run filtering if needed:
          const searchValue = this.elements.search.value.trim();
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          const searchType = this.elements.searchTypeSelect.value;
          this.filterItems(searchTerms, searchType);
        });
      }

      // Use event delegation for keyboard navigation on checkboxes.
      this.elements.dropdown.addEventListener("keydown", this.boundCheckboxKeydownHandler);

      // Attach a debounced input handler to the search input.
      this.elements.search.addEventListener(
        "input",
        debounce(() => {
          this.updateSearchIcon();
          const searchValue = this.elements.search.value.trim();
          const searchType = this.elements.searchTypeSelect.value;
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          this.filterItems(searchTerms, searchType);
        }, this.debounceDelay)
      );

      // Clicking the search icon clears the search if there is text.
      this.elements.searchIcon.addEventListener("click", () => {
        if (this.elements.search.value.trim() !== "") {
          this.elements.search.value = "";
          this.updateSearchIcon();
          this.elements.search.focus();
          this.filterItems([""], this.elements.searchTypeSelect.value);
        }
      });

      // Update the search icon initially.
      this.updateSearchIcon();

      // Update filtering when the search type changes.
      this.elements.searchTypeSelect.addEventListener("change", () => {
        const searchValue = this.elements.search.value;
        const searchTerms = searchValue.split(",").map((term) => term.trim());
        this.filterItems(searchTerms, this.elements.searchTypeSelect.value);
      });

      // Select all and clear all buttons (if they exist).
      if (this.elements.selectAll) {
        this.elements.selectAll.addEventListener("click", () => this.toggleAllItems(true));
      }
      if (this.elements.deselectAll) {
        this.elements.deselectAll.addEventListener("click", () => this.toggleAllItems(false));
      }

      // Attach event listener for the Show Selected button.
      if (this.elements.showSelected) {
        this.elements.showSelected.addEventListener("click", () => this.toggleSelectedFilter());
      }

      // Apply selection button.
      if (this.elements.applyBtn) {
        this.elements.applyBtn.addEventListener("click", () => this.applySelection());
      }

      // Enforce single-selection if not multiple:
      // When any checkbox is changed, if it is now checked then uncheck all others.
      this.elements.dropdown.addEventListener("change", (e) => {
        if (!this.isMultiple && e.target.matches('input[type="checkbox"]')) {
          if (e.target.checked) {
            const checkboxes = this.elements.dropdown.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb) => {
              if (cb !== e.target) {
                cb.checked = false;
              }
            });
          }
        }

        const searchValue = this.elements.search.value.trim();
        const searchTerms = searchValue ? searchValue.split(",").map((term) => term.trim()) : [];
        const searchType = this.elements.searchTypeSelect.value;

        // Only reapply filtering if the search criteria changed
        if (searchValue !== this.lastSearchValue || searchType !== this.lastSearchType) {
          this.lastSearchValue = searchValue;
          this.lastSearchType = searchType;
          if (this.showingSelectedOnly) {
            this.filterItems(searchTerms, searchType);
          }
        }

        this.updateSelectedCount();
      });

      // Delegate group control events.
      this.elements.dropdown.addEventListener("click", (e) => {
        const target = e.target;
        if (target.classList.contains("group-select")) {
          e.stopPropagation();
          const groupElement = target.closest(".group");
          if (groupElement) {
            // Only select checkboxes if their parent item is visible.
            const checkboxes = groupElement.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb) => {
              const item = cb.closest(".checkbox-item");
              // Check if the item is visible (offsetParent is null when display is "none")
              if (item && item.offsetParent !== null) {
                cb.checked = true;
              }
            });
            this.updateSelectedCount();
            this.announceGroupSelection(groupElement, true);
          }
        }
        if (target.classList.contains("group-deselect")) {
          e.stopPropagation();
          const groupElement = target.closest(".group");
          if (groupElement) {
            const checkboxes = groupElement.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((cb) => {
              const item = cb.closest(".checkbox-item");
              if (item && item.offsetParent !== null) {
                cb.checked = false;
              }
            });
            this.updateSelectedCount();
            this.announceGroupSelection(groupElement, false);
            // If "Show Selected" is active, reapply the filter so that unselected items are hidden.
            if (this.showingSelectedOnly) {
              this.applyShowSelectedFilter();
            }
          }
        }
      });
    }

    /**
     * Update the list display by applying the search filter first and then the show-selected filter.
     */
    updateFilteredItems() {
      const list = this.elements.dropdown.querySelector(".list");
      if (!list) {
        console.warn("List element not found.");
        return;
      }

      // Get the current search criteria.
      const searchValue = this.elements.search.value.trim();
      const searchType = this.elements.searchTypeSelect.value;
      const searchTerms = searchValue ? searchValue.split(",").map((term) => term.trim()) : [];

      // Get all checkbox items.
      const items = Array.from(list.querySelectorAll(".checkbox-item"));

      // STEP 1: Apply search filter to all items.
      items.forEach((item) => {
        // Get the display text.
        const labelEl = item.querySelector("span");
        const displayValue = labelEl ? labelEl.textContent : "";
        // Apply case insensitivity if needed.
        const compareValue = this.caseInsensitive ? displayValue.toLowerCase() : displayValue;
        const compareTerms = this.caseInsensitive ? searchTerms.map((t) => t.toLowerCase()) : searchTerms;

        // If there are no search terms, or the item matches the search criteria, mark it as visible.
        const matchesSearch =
          compareTerms.length === 0 || this.determineVisibility(compareValue, compareTerms, searchType);

        if (matchesSearch) {
          // Make the item visible (we may hide it in the next step if necessary).
          item.classList.remove("hidden");
          item.style.display = "flex";
        } else {
          item.classList.add("hidden");
          item.style.display = "none";
        }
      });

      // STEP 2: If "Show Selected" is active, further hide any item that is not selected.
      if (this.showingSelectedOnly) {
        items.forEach((item) => {
          const checkbox = item.querySelector("input[type='checkbox']");
          if (!checkbox.checked) {
            item.classList.add("hidden");
            item.style.display = "none";
          }
        });
      }

      // STEP 3: Update group visibility (hide groups that have no visible items)
      this.hideEmptyGroups(list);

      // STEP 4: Show "no options" message if needed.
      const visibleItems = list.querySelectorAll(".checkbox-item:not(.hidden)");
      if (visibleItems.length === 0) {
        if (!list.querySelector(".no-options")) {
          const messageElem = document.createElement("p");
          messageElem.className = "no-options";
          messageElem.textContent =
            visibleItems.length === 0 && searchTerms.length > 0
              ? "No options match your search."
              : "No Current Selections Made";
          list.appendChild(messageElem);
        }
      } else {
        const messageElem = list.querySelector(".no-options");
        if (messageElem) {
          messageElem.remove();
        }
      }

      // Update the header count
      this.updateSelectedCount();
    }

    /**
     * Close dropdown when clicking outside.
     */
    handleDocumentClick(e) {
      if (!this.elements.dropdown.contains(e.target)) {
        this.elements.content.classList.remove("visible");
        this.elements.header.setAttribute("aria-expanded", "false");
      }
    }

    /**
     * Close the dropdown when Escape is pressed.
     */
    handleDropdownKeydown(e) {
      if (e.key === "Escape") {
        this.elements.content.classList.remove("visible");
        this.elements.header.setAttribute("aria-expanded", "false");
        this.elements.header.focus();
      }
    }

    /**
     * Handle keyboard navigation for checkboxes.
     */
    handleCheckboxKeydown(e) {
      if (e.target.matches('input[type="checkbox"]')) {
        const checkboxes = Array.from(this.elements.dropdown.querySelectorAll('input[type="checkbox"]'));
        const index = checkboxes.indexOf(e.target);
        if (e.key === "ArrowDown" && index < checkboxes.length - 1) {
          e.preventDefault();
          checkboxes[index + 1].focus();
        }
        if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault();
          checkboxes[index - 1].focus();
        }
      }
    }

    /**
     * Update the search icon based on the input content.
     */
    updateSearchIcon() {
      const isEmpty = this.elements.search.value.trim() === "";
      this.elements.searchIcon.innerHTML = this.getSearchIconSVG(isEmpty);
      this.elements.searchIcon.setAttribute("aria-label", isEmpty ? "Search" : "Clear search");
      // Disable the search icon button if the search input is empty.
      this.elements.searchIcon.disabled = isEmpty;
    }

    /**
     * Filter the list items based on the search terms and type.
     */
    filterItems(searchTerms, searchType) {
      const list = this.elements.dropdown.querySelector(".list");
      if (!list) {
        console.warn("List element not found.");
        return;
      }

      searchType = searchType || "containsAny";

      // If the search field is empty, use the appropriate filter:
      if (!Array.isArray(searchTerms) || searchTerms.length === 0 || searchTerms[0] === "") {
        if (this.showingSelectedOnly) {
          this.applyShowSelectedFilter(); // Only show selected items
        } else {
          this.showAllItems(list); // Show all items
        }
        this.updateSelectedCount();
        this.announceSearchResults();
        const existingMsg = list.querySelector(".no-options");
        if (existingMsg) {
          existingMsg.remove();
        }
        return;
      }

      const useCaseInsensitive = this.caseInsensitive;

      const checkboxItems = list.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const label = item.querySelector("span");
        const displayValue = label ? label.textContent : "";
        let compareValue = displayValue;
        let compareTerms = searchTerms;
        if (useCaseInsensitive) {
          compareValue = displayValue.toLowerCase();
          compareTerms = searchTerms.map((term) => term.toLowerCase());
        }

        // Determine if the item matches the search criteria.
        const searchMatch = this.determineVisibility(compareValue, compareTerms, searchType);

        // If the "Show Selected" filter is active, also require the item to be selected.
        const checkbox = item.querySelector("input[type='checkbox']");
        const selectedMatch = !this.showingSelectedOnly || (checkbox && checkbox.checked);

        // Combine the two filters.
        const isVisible = searchMatch && selectedMatch;

        if (isVisible) {
          item.classList.remove("hidden");
          item.style.display = "flex";
        } else {
          item.classList.add("hidden");
          item.style.display = "none";
        }
      });

      // Hide groups that now have no visible items.
      this.hideEmptyGroups(list);

      // If no visible items exist, add a no-options message.
      const visibleItems = list.querySelectorAll(".checkbox-item:not(.hidden)");
      if (visibleItems.length === 0) {
        if (!list.querySelector(".no-options")) {
          const messageElem = document.createElement("p");
          messageElem.className = "no-options";
          messageElem.textContent = "No Options Available";
          list.appendChild(messageElem);
        }
      } else {
        const messageElem = list.querySelector(".no-options");
        if (messageElem) {
          messageElem.remove();
        }
      }

      this.updateSelectedCount();
      this.announceSearchResults();
    }

    /**
     * Show all items in the list.
     */
    showAllItems(list) {
      const checkboxItems = list.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        item.classList.remove("hidden");
        item.style.display = "flex";
      });
      const groups = list.querySelectorAll(".group");
      groups.forEach((group) => (group.style.display = "block"));
    }

    /**
     * Determine whether an item should be visible.
     */
    determineVisibility(compareValue, compareTerms, searchType) {
      switch (searchType) {
        case "containsAny":
          return compareTerms.some((term) => compareValue.includes(term));
        case "containsAll":
          return compareTerms.every((term) => compareValue.includes(term));
        case "startsWithAny":
          return compareTerms.some((term) => compareValue.startsWith(term));
        case "startsWithFirstContainsRest":
          if (compareTerms.length > 0) {
            const startsWithFirst = compareValue.startsWith(compareTerms[0]);
            if (startsWithFirst && compareTerms.length > 1) {
              return compareTerms.slice(1).every((t) => compareValue.includes(t));
            }
            return startsWithFirst;
          }
          return false;
        default:
          return true;
      }
    }

    /**
     * Hide any groups that have no visible items.
     */
    hideEmptyGroups(list) {
      const groups = list.querySelectorAll(".group");
      groups.forEach((group) => {
        const visibleSubItems = group.querySelectorAll(".checkbox-item:not(.hidden)");
        group.style.display = visibleSubItems.length === 0 ? "none" : "block";
      });
    }

    /**
     * Checks if at least one checkbox is selected.
     */
    isInValidState() {
      return this.elements.dropdown.querySelectorAll('.list input[type="checkbox"]:checked').length > 0;
    }

    /**
     * Return the parameters for submission.
     */
    getParameters() {
      const sParamName = this.paramName;
      if (!sParamName) {
        return null;
      }
      const selectedValues = Array.from(
        this.elements.dropdown.querySelectorAll('.list input[type="checkbox"]:checked')
      ).map((cb) => cb.value);

      const params = [
        {
          parameter: sParamName,
          values: selectedValues.map((val) => ({ use: String(val) })),
        },
      ];
      console.log("Parameters to be sent:", JSON.stringify(params));
      return params.length > 0 ? params : null;
    }

    /**
     * Announce the result of a group selection for accessibility.
     */
    announceGroupSelection(group, isSelected) {
      const groupName = group.querySelector(".group-header span").textContent;
      this.elements.searchResultsLive.textContent = `${groupName} ${isSelected ? "selected" : "cleared"}`;
    }

    /**
     * Announce that all items have been selected or cleared.
     */
    announceAllSelection(isSelected) {
      this.elements.searchResultsLive.textContent = `All options ${isSelected ? "selected" : "cleared"}`;
    }

    /**
     * Announce the number of search results.
     */
    announceSearchResults() {
      const visibleCount = this.elements.dropdown.querySelectorAll(".checkbox-item:not(.hidden)").length;
      this.elements.searchResultsLive.textContent = `${visibleCount} options found`;
    }

    /**
     * Update the header text and title based on selected options.
     */
    updateSelectedCount() {
      // Only count checkboxes inside the options list.
      const optionCheckboxes = this.elements.dropdown.querySelectorAll('.list input[type="checkbox"]:checked');
      const count = optionCheckboxes.length;

      const selectedItems = Array.from(optionCheckboxes)
        .map((cb) => {
          // Look for the closest container with the "checkbox-item" class.
          const labelEl = cb.closest(".checkbox-item");
          if (labelEl) {
            // First try to get the text from the <span> element.
            const spanEl = labelEl.querySelector("span");
            if (spanEl && spanEl.textContent.trim() !== "") {
              return spanEl.textContent.trim();
            }
            // Fallback to the label's title attribute.
            return labelEl.getAttribute("title") || "";
          }
          return "";
        })
        .filter((text) => text !== "")
        .join(", ");

      // Update the header text and the tooltip.
      this.elements.header.querySelector("span").textContent = count ? `${count} selected` : "Select Options";
      this.elements.header.title = count ? selectedItems : "Select Options";
      this.oControlHost.valueChanged();
    }

    /**
     * Apply the selection (notify the host control and finish).
     */
    applySelection() {
      this.oControlHost.valueChanged();
      this.oControlHost.finish();
    }

    /**
     * Toggle all visible checkboxes.
     */
    toggleAllItems(checked) {
      const visibleCheckboxes = Array.from(this.elements.dropdown.querySelectorAll('input[type="checkbox"]')).filter(
        (cb) => {
          const checkboxItem = cb.closest(".checkbox-item");
          return checkboxItem && !checkboxItem.classList.contains("hidden") && checkboxItem.style.display !== "none";
        }
      );
      visibleCheckboxes.forEach((cb) => (cb.checked = checked));
      this.updateSelectedCount();
      this.announceAllSelection(checked);
    }
    toggleSelectedFilter() {
      const list = this.elements.dropdown.querySelector(".list");
      if (!list) {
        console.warn("List element not found.");
        return;
      }

      const searchValue = this.elements.search.value.trim();
      const searchType = this.elements.searchTypeSelect.value;

      if (!this.showingSelectedOnly) {
        // Activate "Show Selected" mode.
        this.showingSelectedOnly = true;
        if (searchValue !== "") {
          // Use filterItems so that both search and selection are respected.
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          this.filterItems(searchTerms, searchType);
        } else {
          // No search text—apply selection-only filter.
          this.applyShowSelectedFilter();
        }
        this.elements.showSelected.textContent = "Show All";
        this.elements.showSelected.setAttribute("aria-label", "Show all options");
      } else {
        // Deactivate "Show Selected" mode.
        this.showingSelectedOnly = false;
        if (searchValue !== "") {
          // Re-run the search filter so that unselected items matching the search are shown.
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          this.filterItems(searchTerms, searchType);
        } else {
          // No search text—show all items.
          this.showAllItems(list);
        }
        this.elements.showSelected.textContent = "Show Selected";
        this.elements.showSelected.setAttribute("aria-label", "Show only selected options");
      }

      this.updateSelectedCount();
    }

    applyShowSelectedFilter() {
      const list = this.elements.dropdown.querySelector(".list");
      if (!list) {
        console.warn("List element not found.");
        return;
      }

      // Loop over each checkbox item and show/hide based on whether it's selected.
      const checkboxItems = list.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const checkbox = item.querySelector("input[type='checkbox']");
        if (!checkbox.checked) {
          item.classList.add("hidden");
          item.style.display = "none";
        } else {
          item.classList.remove("hidden");
          item.style.display = "flex";
        }
      });

      // Hide groups that have no visible items.
      this.hideEmptyGroups(list);

      // Check if there are any visible selected items.
      const visibleItems = list.querySelectorAll(".checkbox-item:not(.hidden)");
      if (visibleItems.length === 0) {
        if (!list.querySelector(".no-options")) {
          const messageElem = document.createElement("p");
          messageElem.className = "no-options";
          messageElem.textContent = "No Selections Made";
          list.appendChild(messageElem);
        }
      } else {
        // Remove the no-options message if items are visible.
        const messageElem = list.querySelector(".no-options");
        if (messageElem) {
          messageElem.remove();
        }
      }
    }

    /**
     * Render the control.
     */
    draw(oControlHost) {
      this.oControlHost = oControlHost;
      if (!this.instancePrefix) {
        this.instancePrefix = oControlHost.generateUniqueID();
      }
      this.isMultiple = !!oControlHost.configuration["Multiple Select"];
      this.autoSubmit = oControlHost.configuration["AutoSubmit"] !== false;
      this.hasGrouping = this.groupVals && this.groupingParamName !== "";

      // Generate and set the template HTML.
      oControlHost.container.innerHTML = this.generateTemplateHTML();

      // Apply event listeners.
      this.applyEventListeners();

      // Initialize checkboxes based on the main parameter values.
      const optionCheckboxes = this.elements.dropdown.querySelectorAll(".list input[type='checkbox']");
      optionCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.mainParamValues.includes(checkbox.value);
      });
      // **Update the header to show how many options are currently selected.**
      this.updateSelectedCount();
    }

    /**
     * Cleanup event listeners and references.
     */
    destroy() {
      document.removeEventListener("click", this.boundDocumentClickHandler);
      if (this.elements.dropdown) {
        this.elements.dropdown.removeEventListener("keydown", this.boundCheckboxKeydownHandler);
      }
      if (this.elements.content) {
        this.elements.content.removeEventListener("keydown", this.boundDropdownKeydownHandler);
      }
      // Additional cleanup if needed.
      this.elements = {};
    }
  }

  return CustomControl;
});
