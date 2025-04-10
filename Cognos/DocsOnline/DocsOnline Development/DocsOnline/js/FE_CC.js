define(() => {
  "use strict";
  class AdvancedControl {
    /*
     * Initialize the control. This method is optional. If this method is implemented, fnDoneInitializing must be called when done initializing, or a Promise must be returned.
     * Parameters: oControlHost, fnDoneInitializing
     * Returns: (Type: Promise) An optional promise that will be waited on instead fo calling fnDoneInitializing(). Since Version 6
     *
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.refID = oControlHost.configuration["ID Reference"];
      
      console.log("Asset ID: ",refID);
      fnDoneInitializing();
    }

    /*
     *Draw the control. This method is optional if the control has no UI.
     */
    draw(oControlHost) {
      oControlHost.container.innerHTML = "Hello world";
      let listEl = oControlHost.page.getControlByName( "Asset List" )
      console.log("listControl",listEl)
    }

    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    destroy(oControlHost) {}

    /*
     * Called to pass authored data into the control. This method is optional.
     * Parameters: oControlHost, oDataStore
     * Returns:
     */
    setData(oControlHost, oDataStore) {
      // Method below is for a single data store to use later in the draw function
      this.m_oDataStore = oDataStore;
      console.log("DataStore",this.m_oDataStore)
    }
  }

  return AdvancedControl;
});
