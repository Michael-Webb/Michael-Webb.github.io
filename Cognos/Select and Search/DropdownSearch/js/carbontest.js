define([], function () {
  "use strict";

  class CarbonDropdown {
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
      this.sHTML = null;
      this.triggerLabel = "";
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      // Destructure configuration properties with defaults
      const {
        "Parameter Name": paramName,
        "Value Use Column": valueUseCol = 0,
        "Value Display Column": valueDispCol = 1,
      } = oControlHost.configuration;

      // Assign to instance properties for later use
      this.paramName = paramName;
      this.valueUseCol = valueUseCol;
      this.valueDispCol = valueDispCol;

      // Create a promise to load the external stylesheet.
      const cssPromise = new Promise((resolve, reject) => {
        const linkEl = document.createElement("link");
        linkEl.rel = "stylesheet";
        linkEl.href = "https://1.www.s81c.com/common/carbon/web-components/tag/latest/themes.css";
        linkEl.onload = resolve;
        linkEl.onerror = () => reject(new Error("Failed to load stylesheet"));
        document.head.appendChild(linkEl);
      });

      // Create a promise for loading the dropdown module via dynamic import.
      const dropdownModulePromise = import(
        "https://1.www.s81c.com/common/carbon/web-components/tag/v2/latest/dropdown.min.js"
      );

      // Wait for both the stylesheet and the dropdown JS module to load.
      Promise.all([cssPromise, dropdownModulePromise])
        .then(([_, dropdownModule]) => {
          // Both dependencies are loaded. You can now use dropdownModule if needed.
          fnDoneInitializing();
        })
        .catch((error) => console.error("Error loading dependencies:", error));
    }

    /**
     * Receives authored data.
     */
    setData(oControlhost, oDataStore) {
      this.m_oDataStore = oDataStore;
      console.log("SetData: ", this.m_oDataStore);
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

    generateId(baseString) {
      this.uniqueIdCounter++;
      return `${this.instancePrefix}_${baseString}_${this.uniqueIdCounter}`;
    }

    draw(oControlHost) {
      if (!this.instancePrefix) {
        this.instancePrefix = oControlHost.generateUniqueID();
      }

      if (this.m_oDataStore && this.m_oDataStore.rowCount) {
        console.log("Datastore: ", this.m_oDataStore);

        // Create a <style> element for your styles.
        const styleEl = document.createElement("style");
        styleEl.setAttribute("type", "text/css");
        styleEl.textContent = `
            #app {
              font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
              width: 300px;
              margin: 2rem;
            }
            cds-dropdown:not(:defined),
            cds-dropdown-item:not(:defined) {
              visibility: hidden;
            }
          `;

        // Create the main container <div id="app">
        const appDiv = document.createElement("div");
        appDiv.id = "app";

        // Create the dropdown element.
        const dropdownEl = document.createElement("cds-dropdown");
        const dropdownId = `${this.instancePrefix}-cds-dropdown`;
        dropdownEl.setAttribute("id", dropdownId);
        dropdownEl.setAttribute("trigger-content", this.triggerLabel || "Dropdown");

        // Dynamically generate dropdown items from the data store.
        // Assumes that `valueUseCol` and `valueDispCol` are defined in your context.
        for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
          const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
          const mainDisp = this.m_oDataStore.getCellValue(i, valueDispCol);
          // Optionally generate an ID for tracking
          const itemId = this.generateId("item");

          const itemEl = document.createElement("cds-dropdown-item");
          itemEl.setAttribute("value", mainUse);
          // If you want, you can set the id:
          itemEl.setAttribute("id", itemId);
          itemEl.textContent = mainDisp;
          dropdownEl.appendChild(itemEl);
        }

        // Append the dropdown to the main container.
        appDiv.appendChild(dropdownEl);

        // Clear the existing content and add our new elements.
        oControlHost.container.innerHTML = "";
        oControlHost.container.appendChild(styleEl);
        oControlHost.container.appendChild(appDiv);
      }
    }

    show(oControlHost) {}
    hide(oControlHost) {}
    destroy(oControlHost) {}
  }

  return CarbonDropdown;
});
