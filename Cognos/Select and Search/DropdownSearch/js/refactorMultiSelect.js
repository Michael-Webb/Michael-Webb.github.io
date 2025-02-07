define(() => {
  "use strict";

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
      this.dropdown = null;
      this.header = null;
      this.content = null;
      this.search = null;
      this.advancedBtn = null;
      this.searchControls = null;
      this.applyBtn = null;
      this.selectAll = null;
      this.deselectAll = null;
      this.searchTypeSelect = null;
      this.searchResultsLive = null;
      this.groups = [];
      this.checkboxes = [];
      this.timeoutId = null;
      this.debounceDelay = 100; // milliseconds
    }
    generateId(baseString) {
      this.uniqueIdCounter++;
      return `${this.instancePrefix}_${baseString}_${this.uniqueIdCounter}`;
    }

    /**
     * Initialize the control. Get the initial parameter values here.
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.mainParamValues = [];
      // Store oControlHost as a class property
      this.oControlHost = oControlHost;
      console.log("initialize", this.oControlHost);

      const mainParams = oControlHost.getParameter(oControlHost.configuration["Parameter Name"]);
      if (mainParams && mainParams.values && Array.isArray(mainParams.values)) {
        mainParams.values.forEach((val) => this.mainParamValues.push(val.use));
      }
      console.log("Initial mainParamValues:", this.mainParamValues);

      this.caseInsensitiveDefault = Boolean(oControlHost.configuration["Case Insensitive Search Default"] ?? true);
      console.log("Initialized case insensitive default:", this.caseInsensitiveDefault);
      this.caseInsensitive = this.caseInsensitiveDefault;

      fnDoneInitializing();
    }

    /**
     * Receives authored data from the data store.
     */
    setData(oControlHost, oDataStore) {
      this.m_oDataStore = oDataStore;
    }

    generateTemplateHTML(oControlHost) {
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
      this.dropdown = null;
      this.header = null;
      this.content = null;
      this.search = null;
      this.advancedBtn = null;
      this.searchControls = null;
      this.applyBtn = null;
      this.selectAll = null;
      this.deselectAll = null;
      this.searchTypeSelect = null;
      this.searchResultsLive = null;
      this.groups = [];
      this.checkboxes = [];

      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const valueDispCol = oControlHost.configuration["Value Display Column"] ?? 1;

      const groupingParamName = oControlHost.configuration["Grouping Parent Name"] ?? "";
      const groupVals = oControlHost.configuration["Group Values"] ?? false;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;
      const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 3;
      // const isCompact = oControlHost.configuration["Compact"] === true;

      const dropdownWidth = oControlHost.configuration["Dropdown Width"] ?? "250px";
      const contentWidth = oControlHost.configuration["Content Width"] ?? "250px";

      let dropdownClass = "dropdown-container";
      /* if (isCompact) {
                 dropdownClass += " compact";
             }*/

      const caseInsensitiveChecked = this.caseInsensitiveDefault ? "checked" : "";

      let sHtml = `
            <style>
                :root {
                    --primary: #2563eb;
                    --primary-hover: #1d4ed8;
                    --border: #e5e7eb;
                    --text: #1f2937;
                    --bg-hover: #f9fafb;
                    --radius: .5rem;
                    --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
                .dropdown-container {
                    --padding-lg: 0.75rem 1rem;
                    --padding-md: 0.5rem 0.75rem;
                    --margin-md: 0.25rem;
                    position: relative; 
                    width: ${dropdownWidth};
                    font-family: system-ui, sans-serif;
                }

                .dropdown-container.compact {
                    --padding-lg: 0.75rem 1rem;
                }

                .dropdown-header {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
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
                    top: 100%
                    left: 0;
                    width: ${contentWidth};
                    background: white;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow);
                    z-index: 1000;
                    display: none;
                    margin-top: 0.5rem;
                }

                .header {
                    border-bottom: 1px solid var(--border);
                }

                .search-container {
                    width: 100%;
                    padding: var(--padding-lg);
                    box-sizing: border-box;
                }

                .search-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;;
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

                .advanced-search {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--primary);
                    background: none;
                    border: none;
                    font-size: 0.875rem;
                    cursor: pointer;
                    padding: 0.25rem 0;
                }

                .advanced-search:focus-visible {
                    outline: 1px solid var(--primary);
                    outline-offset: 2px;
                }

                .search-controls {
                    display: none;
                    flex-direction: column;
                    gap: var(--margin-md);
                    margin-top: var(--margin-sm);
                }

                .search-controls.expanded {
                    display: flex;
                }

                .search-options {
                    width: 75%;
                }

                .search-type {
                    width: 100%;
                    padding:  0.125rem 0.25rem;
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    font-size: 0.875rem;
                    outline:none;
                }

                .search-type:focus-visible {
                    outline: 1px solid var(--primary);
                    border-radius: var(--radius)
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
                .case-checkbox {
                    margin: 0;
                }
                .case-checkbox:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: 2px;
                }
                .group-header {
                    padding: var(--padding-md);
                    background: var(--bg-hover);
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    text-align: left;
                    gap: .5rem;
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
                    align-items: 
                    flex-shrink: 0;
                    width: 120px;
                }
                .group-controls .btn {
                    padding: 0.375rem 0.5rem;
                    font-size: 0.75rem;
                    line-height: 1;
                    height: fit-content;
                }
                .checkbox-item {
                    display: flex;
                    align-items: center;
                    padding: var(--padding-md);
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .checkbox-item:hover {
                    background: var(--bg-hover);
                }
                .checkbox-item input[type="checkbox"] {
                    margin-right: 0.5rem;
                    flex-shrink: 0;
                }
                
                input[type="checkbox"] {
                    margin-bottom: 0rem;
                    margin-top:0rem;
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
                .btn {
                    padding: 0.375rem 0.5rem;
                    border-radius: var(--radius);
                    font-size: 0.875rem;
                    cursor: pointer;
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
                .search-wrapper {
                    position: relative;
                    display: inline-block;
                }

                .search-input {
                    /* Add some right padding so text doesn't flow under the icon */
                    padding-right: 2rem;
                    box-sizing: border-box;
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

            </style>
          
            <div class="${dropdownClass}" id="${this.dropdownId}">
                <button
                    class="dropdown-header"
                    aria-expanded="false"
                    aria-controls="${this.contentId}"
                    aria-haspopup="true" id="${this.headerId}"
                >
                    <span>Select Options</span>
                    <svg
                        class="chevron"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                    >
                        <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                </button>
                <div
                    class="dropdown-content"
                    id="${this.contentId}"
                    role="dialog"
                    aria-label="Options selection"
                >
                    <div class="header">
                        <div class="search-container">
                            <div class="search-wrapper">
                                <input
                                    type="text"
                                    class="search-input"
                                    id="${this.searchId}"
                                    placeholder="Search options..."
                                    aria-label="Search options"
                                />
                                <button type="button" class="search-icon" id="searchIcon" aria-label="Search">
                                    <!-- Placeholder SVG for magnifying glass -->
                                    <svg id="iconSvg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="gray" viewBox="0 0 16 16">
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-.998.998l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zM12 6.5A5.5 5.5 0 1 1 6.5 1 5.5 5.5 0 0 1 12 6.5z"/>
                                    </svg>
                                </button>
                            </div>
                            <button
                                class="advanced-search"
                                aria-expanded="false"
                                aria-controls="${this.searchControlsId}" id="${this.advancedBtnId}"
                            >
                                <span>Advanced</span>
                                <svg
                                    class="chevron"
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    aria-hidden="true"
                                >
                                    <path d="M7 10l5 5 5-5H7z" />
                                </svg>
                            </button>
                            <div id="${this.searchControlsId}" class="search-controls">
                                <div class="search-options">
                                    <label class="search-type-option"
                                        ><span>Search type:</span>
                                    </label>
                                    <select class="search-type" aria-label="Search type"  id="${this.searchTypeSelectId}">
                                        <option value="containsAny">Contains Any</option>
                                        <option value="containsAll">Contains All</option>
                                        <option value="startsWithAny">Starts With Any</option>
                                        <option value="startsWithFirstContainsRest">Starts With First Contains Rest</option>
                                    </select>
                                
                                </div>
                                <label class="case-option">
                                    <input type="checkbox" class="case-checkbox" ${caseInsensitiveChecked} />
                                    <span>Case insensitive</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="list">`;

      if (this.m_oDataStore && this.m_oDataStore.rowCount) {
        let groups = {};
        if (groupVals && groupingParamName !== "") {
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

            sHtml += `
                        <div class="group" id="${groupId}">
                            <div class="group-header"  id="${groupHeaderId}">
                                <span title="${group.display}">${group.display}</span>
                                <div class="group-controls">
                                    <button
                                        class="btn secondary group-select"
                                        aria-label="Select all items in ${group.display}"  id="${groupSelectId}"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        class="btn secondary group-deselect"
                                        aria-label="Clear all selections in ${group.display}"  id="${groupDeselectId}"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div class="group-items" role="group" aria-label="${group.display} options"  id="${groupItemsId}">`;

            group.items.forEach((item) => {
              const itemId = this.generateId("item");
              sHtml += `
                                <label class="checkbox-item" title="${item.display}">
                                    <input type="checkbox" value="${item.use}" aria-label="${item.display}"  id="${itemId}"/>
                                    <span>${item.display}</span>
                                </label>`;
            });

            sHtml += `
                            </div>
                        </div>`;

            this.groups.push({
              groupId: groupId,
              groupHeaderId: groupHeaderId,
              groupSelectId: groupSelectId,
              groupDeselectId: groupDeselectId,
              groupItemsId: groupItemsId,
            });
          }
        }
      }

      sHtml += `
                    </div>
                    <div class="dropdown-footer">
                        <div class="select-controls">
                            <button
                                class="btn secondary select-btn"
                                aria-label="Select all options"  id="${this.selectAllId}"
                            >
                                Select all
                            </button>
                            <button
                                class="btn secondary deselect-btn"
                                aria-label="Clear all selections"  id="${this.deselectAllId}"
                            >
                                Clear
                            </button>
                        </div>
                        <button class="btn primary apply-btn"  id="${this.applyBtnId}">Apply</button>
                    </div>
                </div>
                <div
                    class="sr-only"
                    role="status"
                    aria-live="polite" id="${this.searchResultsLiveId}"
                ></div>
            </div>
            `;

      return sHtml;
    }

    applyEventListeners() {
      console.log("applyEventListeners", this.oControlHost);
      // Use querySelector to select elements
      this.dropdown = this.oControlHost.container.querySelector(`#${this.dropdownId}`);
      this.header = this.oControlHost.container.querySelector(`#${this.headerId}`);
      this.content = this.oControlHost.container.querySelector(`#${this.contentId}`);
      this.search = this.oControlHost.container.querySelector(`#${this.searchId}`);
      this.advancedBtn = this.oControlHost.container.querySelector(`#${this.advancedBtnId}`);
      this.searchControls = this.oControlHost.container.querySelector(`#${this.searchControlsId}`);
      this.applyBtn = this.oControlHost.container.querySelector(`#${this.applyBtnId}`);
      this.selectAll = this.oControlHost.container.querySelector(`#${this.selectAllId}`);
      this.deselectAll = this.oControlHost.container.querySelector(`#${this.deselectAllId}`);
      this.searchTypeSelect = this.oControlHost.container.querySelector(`#${this.searchTypeSelectId}`);
      this.searchResultsLive = this.oControlHost.container.querySelector(`#${this.searchResultsLiveId}`);

      // Ensure all elements exist
      let missingElements = [];
      if (!this.dropdown) missingElements.push(`Dropdown (ID: ${this.dropdownId})`);
      if (!this.header) missingElements.push(`Header (ID: ${this.headerId})`);
      if (!this.content) missingElements.push(`Content (ID: ${this.contentId})`);
      if (!this.search) missingElements.push(`Search (ID: ${this.searchId})`);
      if (!this.advancedBtn) missingElements.push(`Advanced Button (ID: ${this.advancedBtnId})`);
      if (!this.searchControls) missingElements.push(`Search Controls (ID: ${this.searchControlsId})`);
      if (!this.applyBtn) missingElements.push(`Apply Button (ID: ${this.applyBtnId})`);
      if (!this.selectAll) missingElements.push(`Select All (ID: ${this.selectAllId})`);
      if (!this.deselectAll) missingElements.push(`Deselect All (ID: ${this.deselectAllId})`);
      if (!this.searchTypeSelect) missingElements.push(`Search Type Select (ID: ${this.searchTypeSelectId})`);
      if (!this.searchResultsLive) missingElements.push(`Search Results Live (ID: ${this.searchResultsLiveId})`);

      if (missingElements.length > 0) {
        console.error("The following elements are missing:", missingElements.join(", "));
        return;
      }

      if (this.isCompact) {
        this.dropdown.classList.add("compact");
      }
      // Initialize dropdown content display
      this.content.style.display = "none"; // Ensure the dropdown is closed by default

      // Add event listeners for dropdown header
      this.header.addEventListener("click", (e) => {
        e.stopPropagation();
        const isExpanded = this.content.style.display === "block";
        this.content.style.display = isExpanded ? "none" : "block";
        this.header.setAttribute("aria-expanded", !isExpanded);
        if (!isExpanded) {
          this.search.focus();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!this.dropdown.contains(e.target)) {
          this.content.style.display = "none";
          this.header.setAttribute("aria-expanded", "false");
        }
      });

      // Advanced search controls toggle
      this.advancedBtn.addEventListener("click", () => {
        const isExpanded = this.advancedBtn.classList.contains("expanded");
        this.advancedBtn.classList.toggle("expanded");
        this.searchControls.classList.toggle("expanded");
        this.advancedBtn.setAttribute("aria-expanded", !isExpanded);
      });

      // Keyboard navigation for the dropdown content
      this.content.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.content.style.display = "none";
          this.header.setAttribute("aria-expanded", "false");
          this.header.focus();
        }
      });

      // Case insensitive checkbox event handling
      const caseCheckbox = this.dropdown.querySelector(".case-checkbox");
      if (caseCheckbox) {
        caseCheckbox.checked = this.caseInsensitiveDefault;

        caseCheckbox.addEventListener("change", () => {
          this.caseInsensitive = caseCheckbox.checked;
          const searchValue = this.search.value.trim();
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          const searchType = this.searchTypeSelect.value;
          this.filterItems(this.oControlHost, searchTerms, searchType);
        });
      }

      // Make checkboxes keyboard accessible
      this.checkboxes = Array.from(this.dropdown.querySelectorAll('input[type="checkbox"]'));
      this.checkboxes.forEach((checkbox, index) => {
        checkbox.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown" && index < this.checkboxes.length - 1) {
            e.preventDefault();
            this.checkboxes[index + 1].focus();
          }
          if (e.key === "ArrowUp" && index > 0) {
            e.preventDefault();
            this.checkboxes[index - 1].focus();
          }
        });
      });

      // (Re)Ensure the search input exists using querySelector (not querySelectorAll)
      this.search = this.dropdown.querySelector(`#${this.searchId}`);
      if (!this.search) {
        console.error("Search input not found.");
        return;
      }

      // New: Get references to the search icon button and the SVG container.
      this.searchIcon = this.oControlHost.container.querySelector("#searchIcon");
      this.iconSvg = this.oControlHost.container.querySelector("#iconSvg");

      // Define the SVG paths
      const magnifyingGlassSVG = `
          <path d="M11.742 10.344a6.5 6.5 0 1 0-.998.998l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zM12 6.5A5.5 5.5 0 1 1 6.5 1 5.5 5.5 0 0 1 12 6.5z"/>`;
      const clearSVG = `<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>`;

      // Function to update the search icon based on the input value
      const updateSearchIcon = () => {
        if (this.search.value.trim() === "") {
          // Show magnifying glass when empty
          this.iconSvg.innerHTML = magnifyingGlassSVG;
          this.searchIcon.setAttribute("aria-label", "Search");
        } else {
          // Show clear (X) icon when text is present
          this.iconSvg.innerHTML = clearSVG;
          this.searchIcon.setAttribute("aria-label", "Clear search");
        }
      };

      // Add input event listener for search
      this.search.addEventListener("input", () => {
        clearTimeout(this.timeoutId);
        updateSearchIcon();
        this.timeoutId = setTimeout(() => {
          const searchType = this.searchTypeSelect.value;
          const caseInsensitive = this.dropdown.querySelector(".case-checkbox").checked;
          const searchValue = this.search.value.trim();
          const searchTerms = searchValue.split(",").map((term) => term.trim());
          console.log("Filtering items with search terms:", searchTerms);
          this.filterItems(this.oControlHost, searchTerms, searchType, caseInsensitive);
        }, this.debounceDelay);
      });

      // When the icon is clicked, clear the search if text exists.
      this.searchIcon.addEventListener("click", () => {
        if (this.search.value.trim() !== "") {
          this.search.value = "";
          updateSearchIcon();
          this.search.focus();
          // Optionally, trigger filtering again now that search is cleared.
        }
      });

      // Initialize the icon on page load
      updateSearchIcon();

      this.searchTypeSelect.addEventListener("change", () => {
        const searchType = this.searchTypeSelect.value;
        const caseInsensitive = this.dropdown.querySelector(".case-checkbox").checked;
        const searchTerms = this.search.value.split(",").map((term) => term.trim());
        this.filterItems(this.oControlHost, searchTerms, searchType, caseInsensitive);
      });

      this.selectAll.addEventListener("click", () => this.toggleAllItems(this.oControlHost, true));
      this.deselectAll.addEventListener("click", () => this.toggleAllItems(this.oControlHost, false));
      this.applyBtn.addEventListener("click", () => this.applySelection(this.oControlHost));
      this.dropdown.addEventListener("change", () => this.updateSelectedCount(this.oControlHost));

      // Group controls
      const groups = Array.from(this.dropdown.querySelectorAll(".group"));
      groups.forEach((group) => {
        const selectBtn = group.querySelector(".group-select");
        const deselectBtn = group.querySelector(".group-deselect");

        selectBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const checkboxes = group.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => (cb.checked = true));
          this.updateSelectedCount(this.oControlHost);
          this.announceGroupSelection(this.oControlHost, group, true);
        });

        deselectBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const checkboxes = group.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((cb) => (cb.checked = false));
          this.updateSelectedCount(this.oControlHost);
          this.announceGroupSelection(this.oControlHost, group, false);
        });
      });
    }

    /**
     * Draw the control. Use the stored parameter values.
     */
    draw(oControlHost) {
      // Store oControlHost as a class property (if not already done in initialize)
      this.oControlHost = oControlHost;
      console.log("draw", this.oControlHost);

      if (!this.instancePrefix) {
        this.instancePrefix = oControlHost.generateUniqueID();
      }
      this.isMultiple = !!oControlHost.configuration["Multiple Select"];
      this.autoSubmit = oControlHost.configuration["AutoSubmit"] !== false;
      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const valueDispCol = oControlHost.configuration["Value Display Column"] ?? 1;

      const groupingParamName = oControlHost.configuration["Grouping Parent Name"] ?? "";
      const groupVals = oControlHost.configuration["Group Values"] ?? false;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;
      const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 3;

      this.hasGrouping = groupVals && groupingParamName !== "";
      const isCompact = oControlHost.configuration["Compact"] === true; // Read the "Compact" configuration
      this.isCompact = isCompact;
      console.log("isCompact", isCompact);

      // Generate and set the template HTML
      oControlHost.container.innerHTML = this.generateTemplateHTML(oControlHost);

      // Apply event listeners
      this.applyEventListeners();

      // Initialize selected values
      const optionCheckboxes = this.dropdown.querySelectorAll(".list input[type='checkbox']");
      optionCheckboxes.forEach((checkbox) => {
        checkbox.checked = this.mainParamValues.includes(checkbox.value);
      });
    }
    /**
     * The new expected behaviour is pull the values needed by the filterItems()
     */

    filterItems(oControlHost, searchTerms, searchType) {
      const dropdown = document.getElementById(this.dropdownId);
      if (!dropdown) {
        console.warn("Dropdown element not found. Exiting filterItems.");
        return;
      }

      const list = dropdown.querySelector(".list");
      if (!list) {
        console.warn("List element not found. Exiting filterItems.");
        return;
      }

      // Use "containsAny" as the default search type if none is provided.
      searchType = searchType || "containsAny";

      // If searchTerms is empty or its first element is an empty string,
      // show all items and exit early.
      if (!Array.isArray(searchTerms) || searchTerms.length === 0 || searchTerms[0] === "") {
        this.showAllItems(list);
        this.updateSelectedCount(oControlHost);
        this.announceSearchResults(oControlHost);
        return;
      }

      // Determine whether to perform a case insensitive search.
      // Use this.caseInsensitive if it has been set by the user;
      // otherwise fall back to this.caseInsensitiveDefault.
      const useCaseInsensitive =
        typeof this.caseInsensitive !== "undefined" ? this.caseInsensitive : this.caseInsensitiveDefault;

      const checkboxItems = list.querySelectorAll(".checkbox-item");
      checkboxItems.forEach((item) => {
        const label = item.querySelector("span");
        const displayValue = label ? label.textContent : "";
        let compareValue = displayValue;
        let compareTerms = searchTerms;

        // Convert values to lowercase if case-insensitive searching is enabled.
        if (useCaseInsensitive) {
          compareValue = displayValue.toLowerCase();
          compareTerms = searchTerms.map((term) => term.toLowerCase());
        }

        // Determine if the item should be visible based on the search type.
        const isVisible = this.determineVisibility(compareValue, compareTerms, searchType);

        if (isVisible) {
          item.classList.remove("hidden");
          item.style.display = "flex";
        } else {
          item.classList.add("hidden");
          item.style.display = "none";
        }
      });

      // Hide any groups that do not have any visible items.
      this.hideEmptyGroups(list);
      this.updateSelectedCount(oControlHost);
      this.announceSearchResults(oControlHost);
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
      groups.forEach((group) => {
        group.style.display = "block";
      });
    }

    /**
     * Determine if an item should be visible based on the search type.
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
          return true; // Default to visible if search type is unrecognized
      }
    }

    /**
     * Hide groups that have no visible items.
     */
    hideEmptyGroups(list) {
      const groups = list.querySelectorAll(".group");
      groups.forEach((group) => {
        const visibleSubItems = group.querySelectorAll(".checkbox-item:not(.hidden)");
        group.style.display = visibleSubItems.length === 0 ? "none" : "block";
      });
    }
    /**
     * Checks if the control is in a valid state.
     */
    isInValidState(oControlHost) {
      return this.dropdown.querySelectorAll('input[type="checkbox"]:checked').length > 0;
    }

    /**
     * Returns the parameter(s) for submission.
     */
    getParameters(oControlHost) {
      const sParamName = oControlHost.configuration["Parameter Name"];
      let params = [];

      if (!sParamName) {
        return null;
      }

      const selectedValues = Array.from(this.dropdown.querySelectorAll('input[type="checkbox"]:checked')).map(
        (cb) => cb.value
      );

      params.push({
        parameter: sParamName,
        values: selectedValues.map((val) => ({ use: String(val) })),
      });

      console.log("Parameters about to be sent:", JSON.stringify(params));
      return params.length > 0 ? params : null;
    }

    /**
     * Optional destroy method.
     */
    destroy(oControlHost) {
      // Cleanup if necessary.
    }
    /**
     * Announces the group selection to the screen reader.
     */
    announceGroupSelection(oControlHost, group, isSelected) {
      const groupName = group.querySelector(".group-header span").textContent;
      this.searchResultsLive.textContent = `${groupName} ${isSelected ? "selected" : "cleared"}`;
    }

    /**
     * Applies all selection and closes the prompt page.
     */
    applySelection(oControlHost) {
      oControlHost.valueChanged();
      oControlHost.finish();
    }

    /**
     * Toggles all selection.
     */
    /**
     * Toggles all selection.
     */
    toggleAllItems(oControlHost, checked) {
      // Select only the visible checkboxes
      const visibleCheckboxes = Array.from(this.dropdown.querySelectorAll('input[type="checkbox"]')).filter(
        (checkbox) => {
          const checkboxItem = checkbox.closest(".checkbox-item");
          return checkboxItem && !checkboxItem.classList.contains("hidden") && checkboxItem.style.display !== "none";
        }
      );

      visibleCheckboxes.forEach((cb) => (cb.checked = checked));
      this.updateSelectedCount(oControlHost);
      this.announceAllSelection(oControlHost, checked);
    }

    /**
     * Announce that all items are selected.
     */
    announceAllSelection(oControlHost, isSelected) {
      this.searchResultsLive.textContent = `All options ${isSelected ? "selected" : "cleared"}`;
    }

    /**
     * Announces the search results
     */
    announceSearchResults(oControlHost) {
      const visibleCount = this.dropdown.querySelectorAll('.checkbox-item:not([style*="display: none"])').length;
      this.searchResultsLive.textContent = `${visibleCount} options found`;
    }

    /**
     * Updates the selected count.
     */
    updateSelectedCount(oControlHost) {
      // Only count checkboxes that are inside the options list (not in search controls)
      const optionCheckboxes = this.dropdown.querySelectorAll('.list input[type="checkbox"]:checked');
      const count = optionCheckboxes.length;

      const selectedItems = Array.from(optionCheckboxes)
        .map((cb) => {
          const checkboxItem = cb.closest(".checkbox-item");
          return checkboxItem ? checkboxItem.title : null;
        })
        .filter((title) => title !== null)
        .join(", ");

      this.header.querySelector("span").textContent = count ? `${count} selected` : "Select Options";
      this.header.title = count ? selectedItems : "Select Options";
    }
  }

  return CustomControl;
});
//412
