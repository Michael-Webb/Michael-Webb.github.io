define(() => {
  "use strict";
  class AdvancedControl {
    constructor() {
      this.attachmentDefinitions = [];
      this.currentAttachments = [];
      this.pendingAttachments = [];
      this.datasources = [];
      this.isLoading = false;
      this.screenData = {};
    }

    initialize(oControlHost, fnDoneInitializing) {
      console.log("Initiallize START");
      this.oControl = oControlHost;
      const {
        ["App Server Url"]: AppUrl,
        ["Job Server Url"]: JobUrl,
        ["Attachment ID Column Label"]: ATT_ID_COL_NM,
        ["List Name"]: LIST_NAME,
        ["Span Name"]: SPAN_NAME,
        ["Font Size"]: FONT_SIZE,
        ["Lazy Loading"]: IS_LAZY_LOADED,
        ["Direct Url"]: URL_TYPE,
        ["Icon Dimensions"]: ICON_DIMENSIONS,
        ["Modal Label"]: MODAL_LABEL,
      } = this.oControl.configuration;

      this.AppUrl = this.removeTrailingSlash(AppUrl);
      this.JobUrl = this.removeTrailingSlash(JobUrl);
      this.ATT_ID_COL_NM = ATT_ID_COL_NM;
      this.SPAN_NAME = SPAN_NAME;
      this.MODAL_LABEL = MODAL_LABEL || "Attachments For ID: ";
      this.IS_LAZY_LOADED = IS_LAZY_LOADED !== false;
      this.ICON_DIMENSIONS = ICON_DIMENSIONS || "16px";
      this.FONT_SIZE = FONT_SIZE || "1em";
      this.LIST_NAME = LIST_NAME || "List1";
      this.URL_TYPE = URL_TYPE;
      this.m_DataStore;
      console.log("Configuration", this.oControl.configuration);

      //   // Store datasources from the control host if available
      //   if (oControlHost.datasources) {
      //     this.datasources = oControlHost.datasources;
      //   }
      fnDoneInitializing();
      console.log("Initiallize End");
    }

    async draw(oControlHost) {
      try {
        this.oControl = oControlHost;
        oControlHost.loadingText = "Loading Docs Online...";
        this.drawID = this.oControl.generateUniqueID();

        // Check configuration parameters
        const missingParams = [];
        if (!this.AppUrl) missingParams.push("App Server Url");
        if (!this.JobUrl) missingParams.push("Job Server Url");
        if (!this.ATT_ID_COL_NM) missingParams.push("Attachment ID Column Name");

        if (missingParams.length > 0) {
          let description = `Missing required configuration parameters: ${missingParams.join(", ")}`;
          throw new scriptableReportError("AdvancedControl", "draw", description);
        }

        // Set processing flag
        this.processingInProgress = false;

        // Get authentication - will use cached token if available
        const authObject = await this.authenticate();

        // Store the API token as an instance property so it can be accessed by other methods
        this.apiToken = authObject.apiToken;
        this.authObj = authObject; // Make sure you store the entire auth object

        console.log(`Draw ID: ${this.drawID} - Authentication successful, API token acquired`);
        console.log(`Draw ID: ${this.drawID} - Auth object environment: ${this.authObj.environment}`);
      
    
    } catch (error) {
        console.warn(error);
      }
    }
    /**
     *
     * @param {*} oDataStore
     */
    setData(oControlHost, oDataStore) {
      this.m_DataStore = oDataStore;
    }

    destroy() {
      this.clearCache;
    }

    processUrl() {
      const path = window.location.href;
      const parts = this.removeTrailingSlash(path).split("/");

      // Set mask (last path segment)
      this.screenData.mask = parts[parts.length - 1];
      const queryStringIndex = this.screenData.mask.indexOf("?");
      if (queryStringIndex != -1) {
        this.screenData.mask = this.screenData.mask.substring(0, queryStringIndex);
      }
      this.screenData.mask = this.screenData.mask.toUpperCase();

      // Set subsystem (second-to-last path segment)
      this.screenData.subsystem = parts[parts.length - 2];

      // Configure base path
      this.screenData.basePath = "";
      // Append the application name if hosted in IIS
      if (parts.length > 5) {
        const appName = parts[parts.length - 5];
        if (parts[2] != appName) {
          this.screenData.basePath += "/" + appName;
        }
      }
      console.log("BASE PATH IS ", this.screenData.basePath);

      // Parse out the runtime mask
      const runtimeMaskRegExp = new RegExp(/(RuntimeMask=)(.+?)(&|$)/gi).exec(parts[parts.length - 1]);
      if (runtimeMaskRegExp) {
        this.screenData.runtimeMask = runtimeMaskRegExp[2].toUpperCase();
      }
      if (!this.screenData.runtimeMask) {
        this.screenData.runtimeMask = this.screenData.mask;
      }

      console.log("IN THE UISCREENS CUSTOM", parts);

      return this.screenData;
    }

    /**
     * Fetches the FAUPAS screen in order to capture cookies.
     *
     * @returns {Promise<Response>} The fetch response.
     */
    async fetchFromScreen(authObj, maskName) {
      // Get the dynamic URL path based on the configured MASK_NAME
      const screenDetails = this.findMaskObject(maskName);
      const screenUrl = `${this.AppUrl}/${authObj.environment}-UI/ui/uiscreens/${screenDetails.module}/${screenDetails.mask}`;
      console.log(`fetchFromScreen: Fetching screen URL: ${screenUrl}`);

      try {
        // Use no-cors as required by your system configuration
        const response = await fetch(screenUrl, {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
            priority: "u=1, i",
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
        return response;
      } catch (error) {
        console.error("Error during FAUPAS fetch:", error);
        throw error;
      }
    }
    /**
     * Creates an object from the
     * @param {*} authDataSet
     */
    getAuthObject() {
      const auth = this.m_DataStore;
      if (!auth) {
        throw new Error("Auth data not available");
      }
      let sessionId_ColIndex = auth.getColumnIndex("SessionId");
      let sessionId = auth.getCellValue(0, sessionId_ColIndex);

      let token_ColIndex = auth.getColumnIndex("Token");
      let token = auth.getCellValue(0, token_ColIndex);

      let environment_ColIndex = auth.getColumnIndex("Environment");
      let environment = auth.getCellValue(0, environment_ColIndex);

      let user_ColIndex = auth.getColumnIndex("User");
      let user = auth.getCellValue(0, user_ColIndex);

      let authObject = { sessionId, token, environment, user };
      return authObject;
    }
    async authenticate() {
      try {
        let authObject = this.getAuthObject();
        console.log(authObject);

        // Check if API token exists in session storage and is not expired
        const cachedAuthKey = this.generateCacheKey("auth_token", authObject);
        const cachedAuth = this.getFromSessionStorage(cachedAuthKey, true);

        if (cachedAuth && cachedAuth.expiration > Date.now()) {
          console.log("Using cached authentication from session storage");
          authObject.apiToken = cachedAuth.apiToken;
          return authObject;
        }

        // If not cached or expired, proceed with authentication
        // Step 1: Get Cookies
        let getCookies = await this.fetchFromScreen(authObject, "FAUPAS");

        // Step 2: Fetch API token.
        const apiToken = await this.fetchApiToken(authObject);
        authObject.apiToken = apiToken;

        // Step 3: Validate security token.
        const validateToken = await this.validateSecurityToken(authObject);

        // Step 4: Get Session Expiration
        const sessionExpData = await this.getSessionExpiration(authObject);

        // Cache the token with expiration time (from session expiration data)
        const expirationTime = Date.now() + sessionExpData.expirationIntervalInMinutes * 60000;
        this.saveToSessionStorage(
          cachedAuthKey,
          {
            apiToken,
            expiration: expirationTime,
          },
          true
        );

        return authObject;
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
          `${this.JobUrl}/${authObject.environment}/api/user/apiToken?sessionId=${encodeURIComponent(
            authObject.sessionId
          )}&authToken=${encodeURIComponent(authObject.token)}`,
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
              encodeURIComponent(authObject.sessionId) +
              "&authToken=" +
              encodeURIComponent(authObject.token) +
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
     * Fetches BT20 models for a given mask string.
     * @param {string} maskString - The mask string used for the fetch configuration.
     * @returns {Promise<object|null>} The JSON response from the API, or null on error.
     */
    async getBT20Models(maskString, btModels, authObject) {
      // Generate cache key including the mask and models
      const modelIdsKey = btModels.sort().join("_");
      const cacheKey = this.generateCacheKey(`bt20models_${maskString}_${modelIdsKey}`, authObject);

      // Check for cached data
      const cachedModels = this.getFromSessionStorage(cacheKey, true);
      if (cachedModels) {
        console.log(`Using cached BT20 models for ${maskString}`);
        return cachedModels;
      }

      const btModelObject = {
        dataObjects: btModels.map((item) => ({ progID: item })),
      };
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return;
      }

      // The main URL is already provided; build the referrer URL using the helper function.
      const url = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.bt20models.mainUrl}`;
      const refUrl = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.bt20models.referrerUrl}${fetchObj.path}`;
      console.log("BT20Url", url, refUrl);

      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            glledger: "GL",
            jlledger: "--",
            mask: fetchObj.mask,
            pragma: "no-cache",
            priority: "u=1, i",
            runtimemask: fetchObj.mask,
          },
          referrer: refUrl,
          referrerPolicy: "strict-origin-when-cross-origin",
          method: "POST",
          mode: "cors",
          credentials: "include",
          body: JSON.stringify(btModelObject),
        });

        if (!response.ok) {
          console.error(response.status, await response.text());
          return null;
        }

        const data = await response.json();
        console.log(data);

        // Extract all @object values from the response
        const extractObjectValues = (obj) => {
          let results = [];

          if (!obj || typeof obj !== "object") return results;

          // Check if this object has @object property
          if (obj["@object"]) {
            results.push(obj["@object"]);
          }

          // Recursively search through all object properties
          for (const key in obj) {
            if (typeof obj[key] === "object") {
              results = results.concat(extractObjectValues(obj[key]));
            }
          }

          return results;
        };

        const extractedValues = extractObjectValues(data);

        // Cache the extracted values
        this.saveToSessionStorage(cacheKey, extractedValues, true);

        return extractedValues;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    }

    async getAttachDef(maskString, btModels, authObject) {
      // Generate cache key based on mask and BT models
      const modelIdsKey = btModels.sort().join("_");
      const cacheKey = this.generateCacheKey(`attachDef_${maskString}_${modelIdsKey}`, authObject);

      // Check for cached data
      const cachedAttachDef = this.getFromSessionStorage(cacheKey, true);
      if (cachedAttachDef) {
        console.log(`Using cached attachment definitions for ${maskString}`);
        return cachedAttachDef;
      }

      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return;
      }
      const url = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.attachDef.mainUrl}`;
      const refUrl = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.attachDef.referrerUrl}${fetchObj.path}`;
      console.log("getAttachDef", url, refUrl);

      const attachDefParams = `progIds=${btModels.join(",")}`;
      try {
        const response = await fetch(`${url}?${attachDefParams}`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            pragma: "no-cache",
            mask: fetchObj.mask,
          },
          referrer: refUrl,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) {
          console.error(response.status, await response.text());
          return null;
        }

        const data = await response.json();

        // Cache the attachment definitions
        this.saveToSessionStorage(cacheKey, data, true);

        return data;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    }

    /**
     * Finds the mask object corresponding to the provided mask string.
     * @param {string} maskString - The mask string to find.
     * @returns {object|null} The mask object with properties, or null if not found.
     */
    findMaskObject(maskString) {
      const foundMask = this.ALL_MASKS.masks.find((item) => item.mask === maskString);
      if (foundMask) {
        return {
          mask: foundMask.mask,
          path: `${foundMask.module}/${foundMask.mask}`,
          itemID: foundMask.itemID,
          name: foundMask.name,
        };
      } else {
        console.error("Mask not found:", maskString);
        return null;
      }
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
    removeTrailingSlash(url) {
      if (!url || typeof url !== "string") {
        return url;
      }

      return url.replace(/\/+$/, "");
    }
    /**
     * Loads and processes attachment definitions
     * @param {Array} attachDefs The attachment definitions to process
     * @returns {boolean} Whether any valid attachment definitions were loaded
     */
    loadAttachmentDefinitions(attachDefs) {
      if (!attachDefs) {
        return false;
      }

      this.attachmentDefinitions = [];

      for (const attachDef of attachDefs) {
        // Find matching datasource
        const ds = this.datasources.find((ds) => ds.entityType === attachDef.entityType);
        if (!ds) {
          continue; // Skip invalid attachment definition
        }

        // Map column names to property names
        for (const col of attachDef.columns) {
          for (const key in ds.properties) {
            const propCol = ds.properties[key].dbColumn;
            if (propCol && propCol.toUpperCase() === col.column) {
              col.columnProperty = key;
            }
          }
        }

        // Add to definitions
        this.attachmentDefinitions.push(attachDef);
      }

      return this.attachmentDefinitions.length > 0;
    }

    /**
     * Fetches attachments for the current record
     * @param {string} entityType The entity type to fetch attachments for
     * @param {Object} recordData The current record data
     * @returns {Promise} Promise resolving to the fetched attachments
     */
    async fetchAttachments(entityType, recordData) {
      this.isLoading = true;

      return this.fetchAttachmentsFromServer(recordData, entityType)
        .then((attachments) => {
          // Store the attachments for this entity type
          this.currentAttachments = attachments || [];
          this.isLoading = false;
          return this.currentAttachments;
        })
        .catch((error) => {
          console.error(`Failed to fetch attachments for ${entityType}: ${error}`);
          this.isLoading = false;
          return [];
        });
    }

    /**
     * Fetches pending attachments
     * @returns {Promise} Promise resolving to the fetched pending attachments
     */
    async fetchPendingAttachments() {
      return this.fetchPendingAttachmentsFromServer()
        .then((pendingAttachments) => {
          this.pendingAttachments = pendingAttachments.map((attachment) => {
            return {
              ...attachment,
              pendingAction: "New", // Default action
            };
          });
          return this.pendingAttachments;
        })
        .catch((error) => {
          console.error(`Failed to fetch pending attachments: ${error}`);
          return [];
        });
    }

    /**
     * Finds an attachment definition by ID
     * @param {string} attachId The attachment definition ID
     * @returns {Object|undefined} The found attachment definition or undefined
     */
    findAttachmentDefinition(attachId) {
      return this.attachmentDefinitions.find((def) => def.id === attachId);
    }

    /**
     * Fetches attachments from server
     * @param {Object} recordData The record data
     * @param {string} entityType The entity type
     * @returns {Promise} Promise resolving to the fetched attachments
     */
    async fetchAttachmentsFromServer(recordData, entityType) {
      // Implement actual server call here
      return fetch(`/api/attachments?entityType=${entityType}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordData),
      })
        .then((response) => response.json())
        .catch((error) => {
          console.error("Error fetching attachments:", error);
          return [];
        });
    }

    /**
     * Fetches pending attachments from server
     * @returns {Promise} Promise resolving to the fetched pending attachments
     */
    async fetchPendingAttachmentsFromServer() {
      // Implement actual server call here
      return fetch("/api/pendingAttachments")
        .then((response) => response.json())
        .catch((error) => {
          console.error("Error fetching pending attachments:", error);
          return [];
        });
    }
    /**
     * Gets a value from session storage with optional JSON parsing
     * @param {string} key - Storage key
     * @param {boolean} parseJson - Whether to parse stored value as JSON
     * @returns {any} The stored value or null if not found
     */
    getFromSessionStorage(key, parseJson = false) {
      try {
        const value = sessionStorage.getItem(key);
        if (value === null) return null;
        return parseJson ? JSON.parse(value) : value;
      } catch (error) {
        console.warn(`Error retrieving ${key} from session storage:`, error);
        return null;
      }
    }

    /**
     * Saves a value to session storage with optional JSON stringification
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     * @param {boolean} stringify - Whether to stringify the value
     */
    saveToSessionStorage(key, value, stringify = false) {
      try {
        const valueToStore = stringify ? JSON.stringify(value) : value;
        sessionStorage.setItem(key, valueToStore);
      } catch (error) {
        console.warn(`Error saving ${key} to session storage:`, error);
      }
    }

    /**
     * Generates a unique cache key for the current environment
     * @param {string} prefix - Key prefix
     * @param {object} authObject - Authentication object with environment
     * @returns {string} The cache key
     */
    generateCacheKey(prefix, authObject) {
      return `${prefix}_${authObject.environment}`;
    }

    /**
     * Clears cached data from session storage
     */
    clearCache() {
      try {
        // Clear any cached data specific to this instance
        if (this.authObj && this.authObj.environment) {
          // Find and remove all cache keys related to this environment
          const keysToRemove = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.includes(this.authObj.environment)) {
              keysToRemove.push(key);
            }
          }

          // Remove the collected keys
          keysToRemove.forEach((key) => sessionStorage.removeItem(key));
          console.log(`Draw ID: ${this.drawID} - Cleared ${keysToRemove.length} cached items from session storage`);
        }
      } catch (error) {
        console.error(`Error clearing cache: ${error}`);
      }
    }

    ALL_MASKS = {
      masks: [
        {
          mask: "APOHBTUB",
          module: "accountspayable",
          name: "BatchId",
          key: "BatchId",
          itemID: "RE031665",
        },
        {
          mask: "FAUPAS",
          module: "fixedassets",
          name: "Faid",
          key: "Faid",
          itemID: "130013048",
        },
        {
          mask: "GLUPKY",
          module: "generalledger",
          name: "Key",
          key: "Key",
          itemID: "190010",
        },
        {
          mask: "PEUPPE",
          module: "personentity",
          name: "BatchId",
          key: "BatchId",
        },
        {
          mask: "POUPPR",
          module: "purchasing",
          name: "PrNo",
          key: "PrNo",
          itemID: "000015",
        },
        {
          mask: "ARUPRF",
          module: "accountsreceivable",
          name: "Ref",
          key: "Ref",
          itemID: "AR257328",
        },
        {
          mask: "POUPRD",
          module: "purchasing",
          name: "PrNo",
          key: "PrNo",
        },
      ],
    };
  }

  return AdvancedControl;
});
