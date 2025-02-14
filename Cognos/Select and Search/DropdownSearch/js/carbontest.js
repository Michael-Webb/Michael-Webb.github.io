define([], function () {
  "use strict";
  class CarbonDropdown {
    /*
     * Initialize the control. This method is optional. If this method is implemented, fnDoneInitializing must be called when done initializing, or a Promise must be returned.
     * Parameters: oControlHost, fnDoneInitializing
     * Returns: (Type: Promise) An optional promise that will be waited on instead fo calling fnDoneInitializing(). Since Version 6
     *
     */
    initialize(oControlHost, fnDoneInitializing) {
      require([
        "https://1.www.s81c.com/common/carbon/web-components/tag/v2/latest/dropdown.min.js",
      ], this.dependenciesLoaded.bind(this, fnDoneInitializing));
    }

    dependenciesLoaded(fnDoneInitializing, oModule) {
      fnDoneInitializing();
    }

    /*
     *Draw the control. This method is optional if the control has no UI.
     */
    draw(oControlHost) {
      oControlHost.container.setAttribute(
        "style",
        `#app {
        font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
        width: 300px;
        margin: 2rem;
      }

      cds-dropdown:not(:defined),
      cds-dropdown-item:not(:defined) {
        visibility: hidden;
      }`
      );
      sHTML = `<div id="app">
      <cds-dropdown trigger-content="Select an item">
        <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
        <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
        <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
        <cds-dropdown-item value="dea">Option 4</cds-dropdown-item>
        <cds-dropdown-item value="router">Option 5</cds-dropdown-item>
      </cds-dropdown>
    </div>`;

      oControlHost.container.innerHTML = sHTML;
    }
    /*
     * Called when the control is being shown (displayed). This method is optional.
     */
    show(oControlHost) {}
    /*
     * Called when the control is being hidden (not displayed). This method is optional.
     * Parameters: oControlHost
     *
     */
    hide(oControlHost) {}

    /*
     * The valid state of the control. This method is optional. This is used to determine things like enabling "Next" and "Finish" prompt buttons.
     * Parameters: oControlHost
     */
    // isInValidState(oControlHost) {
    //   return this.m_sel.selectedIndex > 0;
    // }
    // /**
    //  * getParameters(oControlHost) → (nullable) {Array.<Parameter>|Array.<RangeParameter>}
    //  * Called by the ControlHost to get the current values to use for parameters fulfilled by the control. This method is optional.
    //  * @param {*} oControlHost
    //  * @returns An array of parameters.
    //  *
    //  */
    // getParameters(oControlHost) {
    //   if (this.m_sel.selectedIndex < 1) {
    //     return null;
    //   }
    //   const { value } = this.m_sel.options[this.m_sel.selectedIndex];
    //   return [
    //     {
    //       parameter: "parameter1",
    //       values: [{ use: value }],
    //     },
    //   ];
    // }
    // /*
    //  * Called to pass authored data into the control. This method is optional.
    //  * Parameters: oControlHost, oDataStore
    //  * Returns:
    //  */
    // setData(oControlHost, oDataStore) {
    //   // Method below is for a single data store to use later in the draw function
    //   this.m_oDataStore = oDataStore;

    //   // Method below is for a multiple data stores to use later in the draw function
    //   this.m_aDataStore[oDataStore.index] = oDataStore;

    //   // Method below is for a multiple data stores by name to use later in the draw function
    //   this.m_oDataStores[oDataStore.name] = oDataStore;
    // }

    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    destroy(oControlHost) {}
  }

  return AdvancedControl;
});
