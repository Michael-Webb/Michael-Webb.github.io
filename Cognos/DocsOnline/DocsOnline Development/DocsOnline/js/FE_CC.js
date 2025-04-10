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
        ["App Server Url"]: AppUrl,
        ["Job Server Url"]: JobUrl,
        ["Attachment Container"]: att_container,
        ["Reference ID Column Name"]: refId,
      } = this.oControl.configuration;
      this.AppUrl = this.removeTrailingSlash(AppUrl);
      this.JobUrl = this.removeTrailingSlash(JobUrl);
      this.refID = refId;
      this.att_container = att_container;

      console.log("Configuration", this.oControl.configuration);
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

        console.log(oDataStore)
      // Method below is for a multiple data stores by name to use later in the draw function
      this.m_aDataStore[oDataStore.index] = oDataStore;

      console.log(this.m_oDataStores);

      // Method below is for a single data store to use later in the draw function
      //   this.m_oDataStore = oDataStore;
      //   console.log("DataStore", this.m_oDataStore);
      //   let sessionId_ColIndex = this.m_oDataStore.getColumnIndex("SessionId");
      //   console.log(sessionId_ColIndex);
      //   let sessionId = this.m_oDataStore.getCellValue(0, sessionId_ColIndex);

      //   let token_ColIndex = this.m_oDataStore.getColumnIndex("Token");
      //   let token = this.m_oDataStore.getCellValue(0, token_ColIndex);

      //   let environment_ColIndex = this.m_oDataStore.getColumnIndex("Environment");
      //   let environment = this.m_oDataStore.getCellValue(0, environment_ColIndex);

      //   let user_ColIndex = this.m_oDataStore.getColumnIndex("User");
      //   let user = this.m_oDataStore.getCellValue(0, user_ColIndex);

      //   let authObject = { sessionId, token, environment, user };
      //   this.authObject = authObject;
      //   console.log("authObject: ", authObject);
    }

    _getMaskDetails(maskName) {
      const maskConfig = this.MASK_TYPES.masks.find((mask) => mask.maskName === maskName);
      if (maskConfig) {
        return maskConfig;
      } else {
        // Fallback strategy: Log a warning and use the first mask's path or a hardcoded default.
        const defaultPath = this.MASK_TYPES.masks[0]; // Default to FAUPAS if needed
        console.warn(
          `AdvancedControl:_getUrlPathForMask - Mask name "${maskName}" not found in MASK_TYPES. Using default path '${defaultPath}'.`
        );
        return defaultPath;
      }
    }

    /**
     * Removes a trailing slash from a URL if present.
     *
     * @param {string} url - The URL string to be cleaned.
     * @returns {string} The URL without a trailing slash.
     */
    // Utility method to remove trailing slashes from URLs
    removeTrailingSlash(url) {
      if (url && typeof url === "string" && url.endsWith("/")) {
        return url.slice(0, -1);
      }
      return url;
    }
    /**
     * Fetches the FAUPAS screen in order to capture cookies.
     *
     * @returns {Promise<Response>} The fetch response.
     */
    // async fetchFromScreen() {
    //   // Get the dynamic URL path based on the configured MASK_NAME
    //   const screenDetails = this._getMaskDetails(this.MASK_NAME);
    //   const screenUrl = `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.maskName}`;
    //   if (this.DEBUG_MODE) {
    //     console.log(`fetchFromScreen: Fetching screen URL: ${screenUrl}`); // Debug log
    //   }
    //   try {
    //     const response = await fetch(screenUrl, {
    //       headers: {
    //         priority: "u=0, i",
    //         "sec-fetch-dest": "document",
    //         "sec-fetch-mode": "navigate",
    //         "sec-fetch-site": "same-site",
    //         "sec-fetch-user": "?1",
    //         "upgrade-insecure-requests": "1",
    //       },
    //       referrer: this.JobUrl,
    //       referrerPolicy: "strict-origin-when-cross-origin",
    //       body: null,
    //       method: "GET",
    //       mode: "no-cors",
    //       credentials: "include",
    //     });
    //     if (this.DEBUG_MODE) {
    //       console.log("FAUPAS fetch complete:", response);
    //     }
    //     return response;
    //   } catch (error) {
    //     console.error("Error during FAUPAS fetch:", error);
    //     throw error;
    //   }
    // }
  }

  return AdvancedControl;
});
