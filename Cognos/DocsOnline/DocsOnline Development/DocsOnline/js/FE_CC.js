define(() => {
  "use strict";
  class AdvancedControl {
    MASK_TYPES = {
      masks: [
        {
          maskName: "FAUPAS",
          urlPath: "fixedassets",
        },
        {
          maskName: "PEUPPE",
          urlPath: "personentity",
        },
        {
          maskName: "GLUPKY",
          urlPath: "generalledger",
        },
        {
          maskName: "POUPPR",
          urlPath: "purchasing",
        },
        {
          maskName: "ARUPRF",
          urlPath: "accountsreceivable",
        },
        {
          maskName: "APOHBTUB",
          urlPath: "accountspayable",
        },
      ],
    };
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
      this.m_DataStores = [];
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

      this.authenticate();
    }

    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    destroy(oControlHost) {}

    /**
     * Creates an object from the
     * @param {*} authDataSet
     */
    getAuthObject() {
      const authDataStore = this.m_DataStores.find((dataStore) => dataStore.name === "Auth");
      if (!authDataStore) {
        throw new Error("Auth data not available");
      }
      let sessionId_ColIndex = authDataStore.getColumnIndex("SessionId");
      let sessionId = authDataStore.getCellValue(0, sessionId_ColIndex);

      let token_ColIndex = authDataStore.getColumnIndex("Token");
      let token = authDataStore.getCellValue(0, token_ColIndex);

      let environment_ColIndex = authDataStore.getColumnIndex("Environment");
      let environment = authDataStore.getCellValue(0, environment_ColIndex);

      let user_ColIndex = authDataStore.getColumnIndex("User");
      let user = authDataStore.getCellValue(0, user_ColIndex);

      let authObject = { sessionId, token, environment, user };
      return authObject;
    }

    async authenticate() {
      try {
        let authObject = this.getAuthObject();

        console.log(authObject);

        // Step 1: Get Cookies
        let getCookies = await this.fetchFromScreen(authObject, "FAUPAS");
        // Step 2: Fetch API token.
        const apiToken = await this.fetchApiToken(authObject);
        authObject.apiToken = apiToken;

        // Step 3: Validate security token.
        const validateToken = await this.validateSecurityToken(authObject);

        // Step 4: Get Session Expiration and log it.
        const sessionExpData = await this.getSessionExpiration(authObject);
      } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
      }
    }

    /**
     * Fetches the API token using the job URL and authentication object.
     *
     * @returns {Promise<string>} A Promise that resolves to the API token string.
     */
    async fetchApiToken(authObject) {
      try {
        const tokenResponse = await fetch(
          `${this.JobUrl}/${authObject.environment}/api/user/apiToken?sessionId=${authObject.sessionId}&authToken=${authObject.token}`,
          {
            headers: {
              accept: "*/*",
              "accept-language": "en-US,en;q=0.9",
              "content-type": "application/x-www-form-urlencoded",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "no-cors",
              "sec-fetch-site": "same-site",
            },
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "cors",
            credentials: "omit",
            "access-control-allow-origin:": "*",
          }
        );

        if (!tokenResponse.ok) {
          throw new Error("API Token fetch failed: " + tokenResponse.status);
        }

        const tokenData = await tokenResponse.json();
        if (!tokenData || !tokenData.apiToken) {
          throw new Error("No API token in response");
        }

        console.log("API Token obtained:", tokenData.apiToken);
        return tokenData.apiToken;
      } catch (error) {
        console.error("Error fetching API token:", error);
        throw error;
      }
    }

    /**
     * Validates the security token via a POST request.
     *
     * @returns {Promise<Response>} A Promise that resolves to the response of the validation.
     */
    async validateSecurityToken(authObject) {
      try {
        const validationResponse = await fetch(
          `${this.JobUrl}/${authObject.environment}/api/User/ValidateSecurityToken`,
          {
            headers: {
              accept: "*/*",
              "accept-language": "en-US,en;q=0.9",
              "content-type": "application/x-www-form-urlencoded",
              Authorization: "Bearer " + authObject.apiToken,
            },
            referrer: this.AppUrl,
            referrerPolicy: "strict-origin-when-cross-origin",
            body:
              "sessionId=" +
              authObject.sessionId +
              "&authToken=" +
              authObject.token +
              "&claims=NameIdentifier&claims=Name&claims=GivenName&claims=Surname",
            method: "POST",
            mode: "cors",
            credentials: "omit",
          }
        );

        if (!validationResponse.ok) {
          throw new Error("Token validation failed: " + validationResponse.status);
        }

        console.log("Token validated for sessionID:", authObject.sessionId);
        return validationResponse;
      } catch (error) {
        console.error("Error validating token:", error);
        throw error;
      }
    }

    /**
     * Fetches session expiration data from the API.
     *
     * @returns {Promise<object>} A Promise that resolves to the session expiration data.
     */
    async getSessionExpiration(authObject) {
      try {
        const response = await fetch(`${this.JobUrl}/${authObject.environment}/api/user/getsessionexpiration`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            Authorization: "FEBearer " + authObject.apiToken,
            "cache-control": "no-cache",
          },
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(`Failed to get session expiration: ${response.status}`);
        }

        const data = await response.json();
        console.log("Session expiration data:", data);

        // Update the cache expiration timestamp every time getSessionExpiration is called.
        // expirationIntervalInMinutes is multiplied by 60000 (ms in a minute) to get the expiration time in milliseconds.
        this.cacheExpirationTimestamp = Date.now() + data.expirationIntervalInMinutes * 60000;
        console.log("Updated cache expiration timestamp:", new Date(this.cacheExpirationTimestamp));

        return data;
      } catch (error) {
        console.error("Error getting session expiration:", error);
        throw error;
      }
    }

    /**
     *
     * @param {*} oDataStore
     */
    setData(oControlHost, oDataStore) {
      this.m_DataStores.push(oDataStore);
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
    async fetchFromScreen(authObj, maskName) {
        // Get the dynamic URL path based on the configured MASK_NAME
        const screenDetails = this._getMaskDetails(maskName);
        const screenUrl = `${this.AppUrl}/${authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.maskName}`;
        console.log(`fetchFromScreen: Fetching screen URL: ${screenUrl}`);
        
        try {
          // Use no-cors as required by your system configuration
          const response = await fetch(screenUrl, {
            headers: {
              "accept": "*/*",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "no-cache",
              "pragma": "no-cache",
              "priority": "u=1, i",
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "same-site",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
            },
            referrer: this.JobUrl,
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "no-cors", // Keep this as required
            credentials: "include", // Essential for cookie handling
          });
          
          console.log("Initial authentication request complete");
          
          // With no-cors, we can't access response properties like .ok or .status
          // So we can't directly verify success here
          
          return response;
        } catch (error) {
          console.error("Error during FAUPAS fetch:", error);
          throw error;
        }
      }
      
      async authenticate() {
        try {
          let authObject = this.getAuthObject();
          this.authObject = authObject;
          console.log(authObject);
      
          // Step 1: Get Cookies - using no-cors mode
          console.log("Step 1: Setting authentication cookies...");
          await this.fetchFromScreen(authObject, "FAUPAS");
          
          // Since we can't check the response with no-cors, 
          // maybe add a small delay to ensure cookies are set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Step 2: Fetch API token - this will verify if cookies were set correctly
          console.log("Step 2: Fetching API token...");
          try {
            const apiToken = await this.fetchApiToken();
            this.authObject.apiToken = apiToken;
            console.log("API Token obtained successfully - cookies are working");
          } catch (error) {
            console.error("Failed to get API token - cookies may not be set correctly:", error);
            throw new Error("Authentication failed at API token stage");
          }
      
          // Step 3: Validate security token
          console.log("Step 3: Validating security token...");
          await this.validateSecurityToken();
      
          // Step 4: Get Session Expiration
          console.log("Step 4: Getting session expiration data...");
          const sessionExpData = await this.getSessionExpiration();
          
          console.log("Authentication completed successfully");
          return this.authObject;
        } catch (error) {
          console.error("Authentication failed:", error);
          throw error;
        }
      }
  }

  return AdvancedControl;
});
// 20250410 948