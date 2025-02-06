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
            this.compactCheckboxId = null;
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
            this.compactCheckbox = null;
            this.searchTypeSelect = null;
            this.searchResultsLive = null;
            this.groups = [];
            this.checkboxes = [];

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

            const mainParams = oControlHost.getParameter(oControlHost.configuration["Parameter Name"]);
            if (mainParams && mainParams.values && Array.isArray(mainParams.values)) {
                mainParams.values.forEach((val) => this.mainParamValues.push(val.use));
            }
            console.log("Initial mainParamValues:", this.mainParamValues);

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
            this.compactCheckboxId = this.generateId("compactCheckbox");
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
            this.compactCheckbox = null;
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

            let dropdownClass = "dropdown-container";
            /* if (isCompact) {
                 dropdownClass += " compact";
             }*/

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
                    --margin-md: 0.5rem;
                    position: relative;
                    width: 250px;
                    font-family: system-ui, sans-serif;
                }

                .dropdown-container.compact {
                    --padding-lg: 0.75rem 1rem;
                    --padding-md: 0.5rem 0.75rem;
                    --margin-md: 0.25rem;
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
                    top: calc(100% + 0.5rem);
                    left: 0;
                    width: 300px;
                    background: white;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow);
                    z-index: 1000;
                    display: none;
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
                   display: none;
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
                            <input
                                type="text"
                                class="search-input"
                                placeholder="Search options..."
                                aria-label="Search options" id="${this.searchId}"
                            />
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
                                        <option value="any">Contains Any</option>
                                        <option value="all">Contains All</option>
                                        <option value="startsWithAny">Starts With Any</option>
                                        <option value="startsWithFirstContainsRest">Starts With First Contains Rest</option>
                                    </select>
                                
                                </div>
                                <label class="case-option">
                                    <input type="checkbox" class="case-checkbox" checked />
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

                group.items.forEach(item => {
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


        applyEventListeners(oControlHost) {
            this.dropdown = document.getElementById(this.dropdownId);
            this.header = document.getElementById(this.headerId);
            this.content = document.getElementById(this.contentId);
            this.search = document.getElementById(this.searchId);
            this.advancedBtn = document.getElementById(this.advancedBtnId);
            this.searchControls = document.getElementById(this.searchControlsId);
            this.applyBtn = document.getElementById(this.applyBtnId);
            this.selectAll = document.getElementById(this.selectAllId);
            this.deselectAll = document.getElementById(this.deselectAllId);
            this.compactCheckbox = document.getElementById(this.compactCheckboxId);
            this.searchTypeSelect = document.getElementById(this.searchTypeSelectId);
            this.searchResultsLive = document.getElementById(this.searchResultsLiveId);
            this.groups = [];
            this.checkboxes = [];

            if (this.isCompact) {
                this.dropdown.classList.add("compact")
            }
            // Event listeners
            this.header.addEventListener("click", () => {
                const isExpanded = this.content.style.display === "block";
                this.content.style.display = isExpanded ? "none" : "block";
                this.header.setAttribute("aria-expanded", !isExpanded);
                if (!isExpanded) {
                    this.search.focus();
                }
            });

            document.addEventListener("click", (e) => {
                if (!this.dropdown.contains(e.target)) {
                    this.content.style.display = "none";
                    this.header.setAttribute("aria-expanded", "false");
                }
            });

            this.advancedBtn.addEventListener("click", () => {
                const isExpanded = this.advancedBtn.classList.contains("expanded");
                this.advancedBtn.classList.toggle("expanded");
                this.searchControls.classList.toggle("expanded");
                this.advancedBtn.setAttribute("aria-expanded", !isExpanded);
            });

            // Keyboard navigation
            this.content.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    this.content.style.display = "none";
                    this.header.setAttribute("aria-expanded", "false");
                    this.header.focus();
                }
            });

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

 this.search.addEventListener("input", () => {
            clearTimeout(timeoutId); // Clear any previous timeout
            timeoutId = setTimeout(() => {
                const searchType = this.searchTypeSelect.value;
                const caseInsensitive = document.querySelector(".case-checkbox").checked; // Use document.querySelector to find the element
                let searchValue = this.search.value;
                const searchTerms = searchValue.split(",").map((term) => term.trim());
                // Set a new timeout
                this.filterItems(oControlHost, searchTerms, searchType, caseInsensitive); // Call filterItems after the delay
            }, debounceDelay);
        });

    this.searchTypeSelect.addEventListener("change",() => {
            const searchType = this.searchTypeSelect.value;
            const caseInsensitive = document.querySelector(".case-checkbox").checked; // Use document.querySelector to find the element
            let searchValue = this.search.value;
            const searchTerms = searchValue.split(",").map((term) => term.trim());
             this.filterItems(oControlHost, searchTerms, searchType, caseInsensitive);
        });

            this.selectAll.addEventListener("click", () => this.toggleAllItems(oControlHost, true));
            this.deselectAll.addEventListener("click",() => this.toggleAllItems(oControlHost, false));
            this.applyBtn.addEventListener("click", () =>  this.applySelection(oControlHost));
            this.dropdown.addEventListener("change",() => this.updateSelectedCount(oControlHost));



            // Group controls
            const groups = Array.from(this.dropdown.querySelectorAll(".group"));
            groups.forEach((group) => {
                const selectBtn = group.querySelector(".group-select");
                const deselectBtn = group.querySelector(".group-deselect");

                selectBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach((cb) => (cb.checked = true));
                    this.updateSelectedCount(oControlHost);
                    this.announceGroupSelection(oControlHost, group, true);
                });

                deselectBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const checkboxes = group.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach((cb) => (cb.checked = false));
                    this.updateSelectedCount(oControlHost);
                    this.announceGroupSelection(oControlHost, group, false);
                });
            });

            // Debouncing Implementation
            let timeoutId;
            const debounceDelay = 100; // milliseconds

           
        }

        /**
         * Draw the control. Use the stored parameter values.
         */
        draw(oControlHost) {
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

            oControlHost.container.innerHTML = this.generateTemplateHTML(oControlHost);

            this.applyEventListeners(oControlHost);
            //Initialize selected values
            this.checkboxes.forEach((checkbox) => {
                checkbox.checked = this.mainParamValues.includes(checkbox.value);
            });
        }
      /**
       * The new expected behaviour is pull the values needed by the filterItems()
       */

    filterItems(oControlHost, searchTerms, searchType, caseInsensitive) {
        const dropdown = document.getElementById(this.dropdownId);
        if (!dropdown) return;

        const list = dropdown.querySelector(".list");
        if (!list) return;


        // Default search type to "containsAny" if not provided
        searchType = searchType || "containsAny";
        caseInsensitive = caseInsensitive !== false;
         // Check if searchTerms is not an array or is empty
        if (!Array.isArray(searchTerms)) {
            console.warn("searchTerms is not an array. Exiting filterItems.");
            return;
        }

        // Check if searchTerms is not an array or is empty
        if (searchTerms.length === 0) {
            console.warn("searchTerm array is empty. Exiting filterItems.");
             // Show all items again when search term is empty.
            const checkboxItems = list.querySelectorAll(".checkbox-item");
            checkboxItems.forEach((item) => {
                item.classList.remove("hidden");
                item.style.display = "flex";
            });

             // Hide entire groups that have no visible items.
            const groups = list.querySelectorAll(".group");
            groups.forEach((group) => {
                group.style.display = "block";
            });

            this.updateSelectedCount(oControlHost);
            this.announceSearchResults(oControlHost);
            return;
        }
        // Loop through each checkbox item and determine its visibility.
        const checkboxItems = list.querySelectorAll(".checkbox-item");
        checkboxItems.forEach((item) => {
            const label = item.querySelector("span"); //select span instead of label
            const displayValue = label ? label.textContent : "";
            let compareValue = displayValue;
            let compareTerms = searchTerms;

            if (caseInsensitive) {
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
                item.style.display = "flex"; // Ensure item is visible
            } else {
                item.classList.add("hidden");
                item.style.display = "none"; // Hide item
            }
        });

        // Hide entire groups that have no visible items.
        const groups = list.querySelectorAll(".group");
        groups.forEach((group) => {
            const visibleSubItems = group.querySelectorAll(".checkbox-item:not(.hidden)");
            group.style.display = visibleSubItems.length === 0 ? "none" : "block";
        });

        this.updateSelectedCount(oControlHost);
        this.announceSearchResults(oControlHost);
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

        const selectedValues = Array.from(
            this.dropdown.querySelectorAll('input[type="checkbox"]:checked'),
        ).map((cb) => cb.value);

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
}

return CustomControl;
});
//152