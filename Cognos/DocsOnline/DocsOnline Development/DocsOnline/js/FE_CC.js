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
      this.oControl = oControlHost;
      const {
        ["Attachment Container"]: att_container,
        ["Reference ID"]: JobUrl,
        ["Modal Label"]: ModalLabel,
      } = this.oControl.configuration;

      let refID = oControlHost.configuration["ID Reference"];
      this.refID = refID;
      console.log("Asset ID: ", refID);
      fnDoneInitializing();
    }

    /*
     *Draw the control. This method is optional if the control has no UI.
     */
    draw(oControlHost) {
      oControlHost.container.innerHTML = "Hello world";
      let listControl = oControlHost.page.getControlByName("Asset List").element;

      let listEl = oControlHost.page.getControlByName("Asset List").element;
      console.log("List Control", listControl);
      console.log("List Element", listEl);
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
      console.log("DataStore", this.m_oDataStore);
      let sessionId_ColIndex = this.m_oDataStore.getColumnIndex("SessionId");
      console.log(sessionId_ColIndex)
      let sessionId = this.m_oDataStore.getCellValue(0, sessionId_ColIndex);

      let token_ColIndex = this.m_oDataStore.getColumnIndex("Token");
      let token = this.m_oDataStore.getCellValue(0, token_ColIndex);

      let environment_ColIndex = this.m_oDataStore.getColumnIndex("Environment");
      let environment = this.m_oDataStore.getCellValue(0, environment_ColIndex);

      let user_ColIndex = this.m_oDataStore.getColumnIndex("User");
      let user = this.m_oDataStore.getCell(0, user_ColIndex);

        let authObject = {sessionId,token,environment,user}
      console.log("authObject: ",authObject);
    }
  }

  return AdvancedControl;
});
