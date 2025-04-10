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
    ALL_MASKS = {
      masks: [
        {
          mask: "APOHBTUB",
          module: "accountspayable",
          name: "BatchId",
          itemID: "RE031665",
        },
        {
          mask: "FAUPAS",
          module: "fixedassets",
          name: "Faid",
          itemID: "130013048",
        },
        {
          mask: "GLUPKY",
          module: "generalledger",
          name: "Key",
          itemID: "190010",
        },
        {
          mask: "PEUPPE",
          module: "personentity",
        },
        {
          mask: "POUPPR",
          module: "purchasing",
          name: "PrNo",
          itemID: "000015",
        },
        {
          mask: "ARUPRF",
          module: "accountsreceivable",
          name: "Ref",
          itemID: "AR257328",
        },
      ],
    };
    URL_LOOKUP = {
      screenDef: {
        mainUrl: `-UI/api/finance/screendef/`,
        referrerUrl: `-UI/ui/uiscreens/`,
      },
      bt20models: {
        mainUrl: `-UI/api/finance/legacy/workflow/GetBT20Models`,
        referrerUrl: `-UI/ui/uiscreens/`,
      },
      attachDef: {
        mainUrl: `-UI/api/finance/legacy/documents/attachDefinitions`,
        referrerUrl: `-UI/ui/uiscreens/`,
      },
      detailUrls: {
        mainUrl: `-UI/data/finance/legacy/`,
        referrerUrl: `-UI/ui/uiscreens/`,
      },
      attachUrls: {
        mainUrl: `-UI/api/finance/legacy/documents`,
        referrerUrl: `-UI/ui/uiscreens/`,
      },
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
        ["Attachment ID Column Label"]: ATT_ID_COL_NM,
        ["List Name"]: LIST_NAME,
        ["Span Name"]: SPAN_NAME,
        ["Font Size"]: FONT_SIZE,
        ["Lazy Loading"]: IS_LAZY_LOADED,
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
      this.m_DataStore;
      console.log("Configuration", this.oControl.configuration);

      // Check each configuration parameter and collect the missing ones
      const missingParams = [];
      if (!this.AppUrl) missingParams.push("App Server Url");
      if (!this.JobUrl) missingParams.push("Job Server Url");
      if (!this.ATT_ID_COL_NM) missingParams.push("Attachment ID Column Name");

      // If any parameters are missing, log specific error and return
      if (missingParams.length > 0) {
        let description = `Missing required configuration parameters: ${missingParams.join(", ")}`;
        throw new scriptableReportError("AdvancedControl", "draw", description);
      }
      fnDoneInitializing();
    }

    /**
     *
     * @param {*} oControlHost
     */
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

        try {
          // Set processing flag
          this.processingInProgress = false;

          // Get authentication - will use cached token if available
          const authObject = await this.authenticate();

          // Store the API token as an instance property so it can be accessed by other methods
          this.apiToken = authObject.apiToken;
          this.authObj = authObject; // Make sure you store the entire auth object

          console.log(`Draw ID: ${this.drawID} - Authentication successful, API token acquired`);
          console.log(`Draw ID: ${this.drawID} - Auth object environment: ${this.authObj.environment}`);

          const allSpansTest = document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
          console.log(
            `Draw ID: ${this.drawID} - Found ${allSpansTest.length} total spans with data-name=${this.SPAN_NAME}`
          );

          if (this.IS_LAZY_LOADED) {
            console.log(`Draw ID: ${this.drawID} - Initializing lazy loading.`);

            // Initialize lazy loading and process only visible spans
            this.initializeVisibleSpanLoading();
            setTimeout(() => this.processVisibleSpans(), 200);
          } else {
            // Process all spans without lazy loading
            const allSpans = this.getAllAssetSpans();
            if (allSpans.length > 0) {
              console.log(`Draw ID: ${this.drawID} - Processing ${allSpans.length} spans (Non-Lazy).`);

              // Process each span
              const processingPromises = Array.from(allSpans).map((span) => this.processSpan(span));
              await Promise.allSettled(processingPromises);

              console.log(`Draw ID: ${this.drawID} - Finished processing all spans.`);
            } else {
              console.log(`Draw ID: ${this.drawID} - No spans found (Non-Lazy).`);
            }
          }
        } catch (error) {
          console.warn(error);
        } finally {
          const myTimeout = setTimeout(() => {
            oControlHost.container.innerHTML = "Docs Online Loaded";
          }, 1000);
        }
      } catch (error) {
        console.warn(error);
      }
    }

    // Add these methods to your AdvancedControl class

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

    transformDefintion(data, attachmentDefinitions = []) {
      // Validate input structure
      if (!data || !Array.isArray(data.dataSources) || !data.rootComponent) {
        console.error("Invalid data structure:", data);
        return null;
      }

      // First, add attachXML to each attachment definition
      if (Array.isArray(attachmentDefinitions)) {
        attachmentDefinitions.forEach((attachment) => {
          if (attachment && attachment.table && Array.isArray(attachment.columns)) {
            // Extract the table name
            const tableName = attachment.table;

            // Extract column names from the columns array
            const columnNames = attachment.columns.map((col) => col.column);

            // Create XML tag string: <TABLE_NAME COLUMN_NAME1 COLUMN_NAME2/>
            attachment.attachXML = `<${tableName} ${columnNames.join(" ")}/>`;
          }
        });
      }

      // Collect all linkage values across all data sources
      const allLinkageValuesSet = new Set();

      // Identify the root entity type
      const rootEntityType = data.rootComponent.dataSource;

      // Create a set to collect root ID columns (parent properties linking to root entity)
      const rootIdColumnsSet = new Set();

      // Loop through all data sources to collect linkage values and root ID columns
      data.dataSources.forEach((ds) => {
        if (ds.parentNavigationProperty && ds.linkages && Array.isArray(ds.linkages)) {
          // For each data source that has a parent and linkages
          ds.linkages.forEach((linkage) => {
            // Add to all linkage values
            if (linkage.parentProperty) allLinkageValuesSet.add(linkage.parentProperty);
            if (linkage.childProperty) allLinkageValuesSet.add(linkage.childProperty);

            // Find the parent data source
            const parentDS = data.dataSources.find((parent) => parent.entityType === ds.parentNavigationProperty);

            // If parent is the root entity or links to the root entity, add the parent property to rootIdColumns
            if (parentDS && parentDS.entityType === rootEntityType) {
              rootIdColumnsSet.add(linkage.parentProperty);
            }
          });
        }
      });

      // Convert sets to arrays
      const allLinkagesArray = Array.from(allLinkageValuesSet);
      const rootIdColumns = Array.from(rootIdColumnsSet);

      // Transform each data source into the required output format.
      const transformedDataSources = data.dataSources.map((ds) => {
        // Determine if this data source is the root entity.
        const isRootEntity = ds.entityType === data.rootComponent.dataSource;

        // Get the default sort order from the data source.
        const defaultSortOrder = ds.defaultOrderBy || "";

        // Get the main namedFilter
        let namedFilter = null;

        switch (true) {
          case isRootEntity && ds.constantFilter:
            namedFilter = ds.constantFilter;
            break;
          case isRootEntity && !ds.constantFilter && ds.filters && ds.filters.length == 1:
            namedFilter = ds.filters[0];
            break;
          case isRootEntity && !ds.constantFilter && ds.filters && ds.filters.length > 1:
            namedFilter = ds.filters[1];
            break;
          default:
            namedFilter = null;
            break;
        }
        // get table
        const table = ds.table ? ds.table.toUpperCase() : "";

        // Find matching attachment definition for this entity type
        const attachmentDef = Array.isArray(attachmentDefinitions)
          ? attachmentDefinitions.find((attach) => attach.entityType === ds.entityType)
          : null;

        // Extract child column filter for non-root entities with attachments
        let childColumnFilter = [];
        if (!isRootEntity && attachmentDef && Array.isArray(attachmentDef.columns)) {
          const propertiesObj = ds.dataSource?.properties || ds.properties || {};
          if (propertiesObj) {
            // Get attachment column names (uppercase for case-insensitive comparison)
            const attachmentColumnNames = attachmentDef.columns.map((col) => col.column.toUpperCase());

            // Find property keys where dbColumn (uppercase) matches any attachment column
            childColumnFilter = Object.entries(propertiesObj)
              .filter(
                ([_, propDetails]) =>
                  propDetails.dbColumn && attachmentColumnNames.includes(propDetails.dbColumn.toUpperCase())
              )
              .map(([propName, _]) => propName);
          }
        }

        // Identify the orderBy configuration in ds.orderBys whose description matches the default sort order.
        // If not found and there is at least one orderBy config available, fallback to the first one.
        let orderByConfig = ds.orderBys && ds.orderBys.find((item) => item.description === defaultSortOrder);
        if (!orderByConfig && ds.orderBys && ds.orderBys.length > 0) {
          orderByConfig = ds.orderBys[0];
        }

        // Get sortDetails array from the orderBy configuration or default to an empty array.
        const sortDetails = orderByConfig ? orderByConfig.properties || [] : [];

        // Build the sortbyParam string: for each sort rule, append " desc" if descending is true.
        const sortbyParam = sortDetails
          .map((item) => (item.descending ? `${item.property} desc` : item.property))
          .join(",");

        // *** Get required properties and orderBy properties ***
        // This will work whether properties are in dataSource.properties or directly in properties
        const propertiesObj = ds.dataSource?.properties || ds.properties || {};

        // Get all required properties
        const allRequiredProperties = [];
        if (propertiesObj) {
          Object.entries(propertiesObj).forEach(([propName, propDetails]) => {
            if (propDetails.isRequired === true) {
              allRequiredProperties.push(propName);
            }
          });
        }

        // Get all properties used in any orderBy
        const allOrderByProperties = new Set();
        const orderBys = ds.dataSource?.orderBys || ds.orderBys || [];
        if (Array.isArray(orderBys)) {
          orderBys.forEach((orderBy) => {
            if (orderBy.properties && Array.isArray(orderBy.properties)) {
              orderBy.properties.forEach((prop) => {
                if (prop && prop.property) {
                  allOrderByProperties.add(prop.property);
                }
              });
            }
          });
        }

        // Convert Set to Array
        const allOrderByPropertiesArray = Array.from(allOrderByProperties);

        // Find required columns that appear in all "order by" scenarios
        const requiredOrderByColumns = [];

        // Only proceed if orderBys exists and is an array
        if (orderBys && orderBys.length > 0) {
          // First, collect all properties from all orderBys
          const allOrderByProps = orderBys
            .map((order) =>
              order.properties && Array.isArray(order.properties) ? order.properties.map((prop) => prop.property) : []
            )
            .filter((props) => props.length > 0);

          // If we have valid properties in all orderBys
          if (allOrderByProps.length > 0) {
            // Start with the properties from the first orderBy
            let commonProps = [...allOrderByProps[0]];

            // Find intersection with all other orderBys
            for (let i = 1; i < allOrderByProps.length; i++) {
              commonProps = commonProps.filter((prop) => allOrderByProps[i].includes(prop));
            }

            // Final list: columns that are both required and in all orderBys
            requiredOrderByColumns.push(
              ...commonProps.filter((prop) =>
                allRequiredProperties.some((reqProp) => reqProp.toLowerCase() === prop.toLowerCase())
              )
            );
          }
        }

        // Extract unique linkage properties
        const parentLinkageValues = new Set();
        if (ds.linkages && Array.isArray(ds.linkages)) {
          ds.linkages.forEach((linkage) => {
            if (linkage.parentProperty) parentLinkageValues.add(linkage.parentProperty);
          });
        }
        const parentLinkageArray = Array.from(parentLinkageValues);

        // Extract unique linkage properties
        const childLinkageValues = new Set();
        if (ds.linkages && Array.isArray(ds.linkages)) {
          ds.linkages.forEach((linkage) => {
            if (linkage.childProperty) childLinkageValues.add(linkage.childProperty);
          });
        }
        const childLinkageArray = Array.from(parentLinkageValues);

        const result = {
          isRootEntity,
          entityType: ds.entityType,
          defaultSortOrder,
          sortDetails,
          sortbyParam,
          namedFilter,
          table,
          attachment: attachmentDef || null,
          attachXML: attachmentDef ? attachmentDef.attachXML : null,
          requiredOrderByColumns,
          allRequiredProperties,
          allOrderByProperties: allOrderByPropertiesArray,
          parentLinkage: parentLinkageArray,
          childLinkages: childLinkageArray,
          dataS: ds,
        };

        // Add rootIdColumns to the root entity data source
        if (isRootEntity) {
          result.rootIdColumns = rootIdColumns;
        }

        // Add childColumnFilter to non-root entities
        if (!isRootEntity && childColumnFilter.length > 0) {
          result.childColumnFilter = childColumnFilter;
          result.maxFilters = [...rootIdColumns, ...childColumnFilter];
        }

        return result;
      });

      // Extract unique maskEntityTypes from the list of data sources.
      const maskEntityTypes = Array.from(new Set(data.dataSources.map((ds) => ds.entityType)));
      // Create entityBTTypes by prefixing each maskEntityType with "BT20.".
      const entityBTTypes = maskEntityTypes.map((type) => `BT20.${type}`);

      // Extract unique entity types from attachment definitions
      const attachmentEntityTypes = Array.isArray(attachmentDefinitions)
        ? Array.from(
            new Set(
              attachmentDefinitions.filter((attach) => attach && attach.entityType).map((attach) => attach.entityType)
            )
          )
        : [];

      // Return the complete transformed object.
      return {
        dataSources: transformedDataSources,
        maskEntityTypes,
        entityBTTypes,
        attachmentDefinitions,
        attachmentEntityTypes,
        allLinkages: allLinkagesArray,
        rootIdColumns: rootIdColumns, // Add the root ID columns at the top level
        data,
      };
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

    getSpanData(spanNode) {
      const mask = spanNode.dataset.mask;
      const ref = spanNode.dataset.ref;
      return mask, ref;
    }

    getAllMasks(nodeList) {
      // Assuming `nodelist` is your NodeList of span elements
      const uniqueMasks = [...new Set([...nodeList].map((span) => span.dataset.mask))];

      console.log(uniqueMasks);
      return uniqueMasks;
    }

    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    destroy(oControlHost) {
      console.log(`Destroying AdvancedControl Instance: ID=${this.drawID}`);

      // Remove event listeners
      if (this.throttledScrollHandler) {
        document.removeEventListener("scroll", this.throttledScrollHandler, { capture: true });
        window.removeEventListener("scroll", this.throttledScrollHandler);
        window.removeEventListener("resize", this.throttledScrollHandler);
        this.throttledScrollHandler = null;
      }

      if (this.intervalCheck) {
        clearInterval(this.intervalCheck);
        this.intervalCheck = null;
      }

      // Disconnect MutationObserver
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }

      if (this.mutationProcessTimeout) {
        clearTimeout(this.mutationProcessTimeout);
      }

      // Clear cache if needed
      this.clearCache();

      // Clear references
      this.oControl = null;
      this.authObj = null;
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
     *
     * @param {*} oDataStore
     */
    setData(oControlHost, oDataStore) {
      this.m_DataStore = oDataStore;
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

    /**
     * Joins URL parts ensuring there is exactly one slash between each part and a trailing slash.
     * @param {...string} parts - The parts of the URL to join.
     * @returns {string} The joined URL.
     */
    joinUrlParts(...parts) {
      return parts.map((part) => part.replace(/\/+$/, "")).join("/") + "/";
    }

    /**
     * Extracts an array of entityType values from the dataSources array in the given config object.
     * @param {Object} config - The configuration object containing a dataSources array.
     * @returns {string[]} An array of entityType strings.
     */
    extractEntityTypes(config) {
      // Validate that the config object exists and has a dataSources property that is an array.
      if (!config || typeof config !== "object") {
        console.error("Invalid configuration: expected an object.");
        return [];
      }
      if (!Array.isArray(config.dataSources)) {
        console.error("Invalid configuration: expected 'dataSources' to be an array.", config);
        return [];
      }

      const entityObj = {
        btString: config.dataSources.map((source) => "BT20." + source.entityType),
        plainStr: config.dataSources.map((source) => source.entityType),
        array: config.dataSources.entityType,
      };
      // Map over the dataSources array to extract the entityType from each data source.
      return entityObj;
    }

    /**
     * Fetches the screen definition for a given mask string.
     * @param {string} maskString - The mask string used to locate the fetch configuration.
     * @returns {Promise<object|null>} The JSON response from the API, or null on error.
     */
    async fetchScreenDef(maskString, authObj) {
      // Generate cache key for this specific screen definition
      const cacheKey = this.generateCacheKey(`screenDef_${maskString}`, authObj);

      // Check if we have a cached version
      const cachedDef = this.getFromSessionStorage(cacheKey, true);
      if (cachedDef) {
        console.log(`Using cached screen definition for ${maskString}`);
        return cachedDef;
      }

      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return;
      }

      // Construct URLs using the helper function
      const url = `${this.AppUrl}/${authObj.environment}${this.URL_LOOKUP.screenDef.mainUrl}${fetchObj.path}`;
      const refUrl = `${this.AppUrl}/${authObj.environment}${this.URL_LOOKUP.screenDef.referrerUrl}${fetchObj.path}`;
      console.log("fetchScreenDef", url, refUrl);

      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            glledger: "--",
            jlledger: "--",
            mask: fetchObj.mask,
            pragma: "no-cache",
          },
          referrer: refUrl,
          referrerPolicy: "strict-origin-when-cross-origin",
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) {
          console.error(response.status, await response.text());
          return null;
        }

        const data = await response.json();

        // Cache the screen definition
        this.saveToSessionStorage(cacheKey, data, true);

        return data;
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    }

    /**
     * Returns all spans with data attributes on the page
     */
    getAllAssetSpans() {
      // Get all spans with data-mask and data-ref attributes
      return document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
    }

    /**
     * Determines if an element is in the viewport
     */
    isElementInViewport(element) {
      if (!element) return false;

      // Get the element's bounding rectangle
      let rect = element.getBoundingClientRect();

      // If the element has no size, try to use its parent
      if (rect.width === 0 || rect.height === 0) {
        if (element.parentElement) {
          rect = element.parentElement.getBoundingClientRect();
        }
      }

      // If dimensions are still zero, consider it not visible
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // Generous buffers allow you to trigger processing slightly off-screen
      const verticalBuffer = 100;
      const horizontalBuffer = 50;

      const isInVerticalViewport = rect.top < windowHeight + verticalBuffer && rect.bottom > 0 - verticalBuffer;
      const isInHorizontalViewport = rect.left < windowWidth + horizontalBuffer && rect.right > 0 - horizontalBuffer;

      return isInVerticalViewport && isInHorizontalViewport;
    }
    /**
     * Determines if the element or its container is visible
     */
    isElementOrContainerVisible(element) {
      if (!element) return false;

      // Check if element itself is hidden
      if (element.offsetParent === null) return false;

      // Check if element has zero dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      // Check if any parent container is hidden
      let parent = element.parentElement;
      while (parent) {
        // Check for display:none, visibility:hidden
        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }

        // Check for specific page classes that might be hidden
        if (parent.classList && parent.classList.contains("clsViewerPage")) {
          if (style.display === "none") {
            return false;
          }
        }

        parent = parent.parentElement;
      }

      return true;
    }

    /**
     * Throttle function to prevent excessive calls
     */
    throttle(func, limit) {
      let lastFunc;
      let lastRan;
      return (...args) => {
        if (!lastRan) {
          func.apply(this, args);
          lastRan = Date.now();
        } else {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(() => {
            if (Date.now() - lastRan >= limit) {
              func.apply(this, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      };
    }
    /**
     * Initialize lazy loading of spans by adding scroll, resize, and mutation listeners
     */
    /**
     * Initialize lazy loading with targeted observation of LIST_NAME tables
     */
    initializeVisibleSpanLoading() {
      // Ensure only one set of listeners/observers per instance
      if (this.scrollHandler) {
        console.log(`Draw ID: ${this.drawID} - Listeners already initialized, skipping.`);
        return;
      }

      this.scrollHandler = () => {
        if (this.apiToken && !this.processingInProgress) {
          this.processVisibleSpans();
        }
      };

      this.throttledScrollHandler = this.throttle(this.scrollHandler, 150);

      // Listen on scroll events
      document.addEventListener("scroll", this.throttledScrollHandler, { capture: true, passive: true });
      window.addEventListener("scroll", this.throttledScrollHandler, { passive: true });
      window.addEventListener("resize", this.throttledScrollHandler, { passive: true });

      this.intervalCheck = setInterval(() => {
        if (this.apiToken && !this.processingInProgress) {
          this.processVisibleSpans();
        }
      }, 1500);

      // Find tables to observe
      const targetTables = document.querySelectorAll(`[lid="${this.LIST_NAME}"]`);

      // If no tables found yet, observe the body for tables being added
      const observerTarget =
        targetTables.length > 0 ? targetTables : [document.querySelector(".idViewer") || document.body];

      console.log(`Draw ID: ${this.drawID} - Setting up MutationObserver on ${observerTarget.length} elements`);

      const observerOptions = {
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: true,
        subtree: true,
      };

      this.mutationObserver = new MutationObserver((mutationsList) => {
        let needsProcessing = false;
        let tablesAddedOrModified = false;

        for (const mutation of mutationsList) {
          // Check if tables with our LIST_NAME were added
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if a table with our LIST_NAME was added
                if (node.matches && node.matches(`[lid="${this.LIST_NAME}"]`)) {
                  tablesAddedOrModified = true;
                  needsProcessing = true;
                  break;
                }

                // Check if the added node contains a table with our LIST_NAME
                if (node.querySelector && node.querySelector(`[lid="${this.LIST_NAME}"]`)) {
                  tablesAddedOrModified = true;
                  needsProcessing = true;
                  break;
                }
              }
            }
          }

          // Check for attribute changes that might affect visibility
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "style" || mutation.attributeName === "class")
          ) {
            const target = mutation.target;
            if (target.matches && target.matches(`[lid="${this.LIST_NAME}"]`)) {
              tablesAddedOrModified = true;
              needsProcessing = true;
              break;
            }
          }

          if (needsProcessing) break;
        }

        if (needsProcessing) {
          console.log(
            `Draw ID: ${this.drawID} - Tables were ${tablesAddedOrModified ? "added/modified" : "not modified"}`
          );

          clearTimeout(this.mutationProcessTimeout);
          this.mutationProcessTimeout = setTimeout(() => {
            if (this.apiToken && !this.processingInProgress) {
              this.processVisibleSpans();
            }
          }, 250);
        }
      });

      // Observe each target
      observerTarget.forEach((target) => {
        this.mutationObserver.observe(target, observerOptions);
      });

      console.log(`Draw ID: ${this.drawID} - MutationObserver initialized`);
    }

    /**
     * Process spans in visible rows of tables with LIST_NAME
     */
    /**
     * Process spans in visible rows of tables with LIST_NAME
     */
    async processVisibleSpans() {
      // Ensure API token is available
      if (!this.apiToken) {
        console.log(`Draw ID: ${this.drawID} - API token not yet available, skipping processVisibleSpans.`);
        return;
      }

      // Prevent concurrent execution
      if (this.processingInProgress) {
        console.log(`Draw ID: ${this.drawID} - Processing already in progress, skipping.`);
        return;
      }

      this.processingInProgress = true;

      try {
        // Add this debugging call
        //   this.debugVisibilityIssues();

        // Find all spans with our data-name
        const allSpans = document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
        console.log(`Draw ID: ${this.drawID} - Found ${allSpans.length} total spans`);

        if (allSpans.length === 0) {
          console.log(`Draw ID: ${this.drawID} - No spans found`);
          this.processingInProgress = false;
          return;
        }

        // Filter to only spans in VISIBLE Cognos pages
        const visibleSpans = Array.from(allSpans).filter((span) => this.isElementVisibleInCognosPage(span));

        console.log(`Draw ID: ${this.drawID} - Found ${visibleSpans.length} visible spans`);

        if (visibleSpans.length === 0) {
          console.log(`Draw ID: ${this.drawID} - No visible spans found.`);
          this.processingInProgress = false;
          return;
        }

        // Process only spans that don't have an existing container
        const spansToProcess = visibleSpans.filter((span) => {
          const mask = span.getAttribute("data-mask");
          const ref = span.getAttribute("data-ref");
          if (!mask || !ref) return false;

          // Check if this span already has a container
          const spanUniqueId = `${mask}-${ref}`;
          const existingContainer = document.getElementById(`doc-container-${spanUniqueId}`);
          return !existingContainer;
        });

        console.log(`Draw ID: ${this.drawID} - Found ${spansToProcess.length} spans to process`);

        if (spansToProcess.length === 0) {
          console.log(`Draw ID: ${this.drawID} - No spans to process found.`);
          this.processingInProgress = false;
          return;
        }

        // Get unique masks from the spans to process
        const masks = [...new Set(spansToProcess.map((span) => span.getAttribute("data-mask")).filter(Boolean))];

        console.log(`Draw ID: ${this.drawID} - Found ${masks.length} unique masks: ${masks.join(", ")}`);

        // Process spans with these masks
        await this.processSpansByMask(spansToProcess, masks, this.authObj);
      } catch (error) {
        console.error(`Error in processVisibleSpans (Instance ${this.drawID}):`, error);
      } finally {
        this.processingInProgress = false;
      }
    }

    /**
     * Process spans by mask - fetching definitions once per mask
     */
    async processSpansByMask(spansToProcess, masks, authObj) {
      // Fetch screen definitions, BT20 models, and attachment definitions once per mask
      const definitionsMap = new Map();

      for (const mask of masks) {
        try {
          if (!mask) {
            console.warn(`Draw ID: ${this.drawID} - Skipping null/empty mask`);
            continue;
          }

          // Check if we already have cached definitions for this mask
          const cacheKey = this.generateCacheKey(`screen_defs_${mask}`, authObj);
          let definitions = this.getFromSessionStorage(cacheKey, true);

          if (!definitions) {
            console.log(`Draw ID: ${this.drawID} - Fetching definitions for mask ${mask}.`);

            // Fetch screen definition
            const screenDef = await this.fetchScreenDef(mask, authObj);
            if (!screenDef) {
              console.error(`Draw ID: ${this.drawID} - Failed to get screen definition for mask ${mask}.`);
              continue;
            }

            // Extract entity types
            const entityTypes = this.extractEntityTypes(screenDef);

            // Fetch BT20 models and attachment definitions
            const btModels = await this.getBT20Models(mask, entityTypes.btString, authObj);
            const attachDefs = await this.getAttachDef(mask, entityTypes.btString, authObj);

            // Transform the screen definition
            const transformedDef = this.transformDefintion(screenDef, attachDefs);

            // Store all definitions together
            definitions = {
              screenDef,
              entityTypes,
              btModels,
              attachDefs,
              transformedDef,
            };

            // Cache the definitions
            this.saveToSessionStorage(cacheKey, definitions, true);
          } else {
            console.log(`Draw ID: ${this.drawID} - Using cached definitions for mask ${mask}.`);
          }

          // Add to our map
          definitionsMap.set(mask, definitions);
        } catch (error) {
          console.error(`Error fetching definitions for mask ${mask}:`, error);
        }
      }

      // Group spans by mask and ref to avoid duplicate processing
      const spansByMaskAndRef = new Map();

      for (const span of spansToProcess) {
        const mask = span.getAttribute("data-mask");
        const ref = span.getAttribute("data-ref");

        if (!mask || !ref) continue;

        const key = `${mask}-${ref}`;
        if (!spansByMaskAndRef.has(key)) {
          spansByMaskAndRef.set(key, { mask, ref, spans: [] });
        }
        spansByMaskAndRef.get(key).spans.push(span);
      }

      // Process each unique mask-ref combination
      for (const [key, { mask, ref, spans }] of spansByMaskAndRef.entries()) {
        try {
          const definitions = definitionsMap.get(mask);

          if (!definitions || !definitions.transformedDef) {
            console.warn(`No definitions available for mask ${mask}, skipping spans.`);
            continue;
          }

          // Check if we already have cached attachment data
          const attachmentCacheKey = this.generateCacheKey(`attachments_${mask}_${ref}`, this.authObj);
          let attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);

          if (!attachmentResults) {
            // Create a mask object with the ref as the itemID
            const maskObj = {
              mask: mask,
              itemID: ref,
            };

            console.log(`Fetching attachments for mask=${mask}, ref=${ref}`);

            // Call getAttachments to fetch the attachment data
            attachmentResults = await this.getAttachments(definitions.transformedDef, mask, maskObj);

            // Log attachment results
            if (attachmentResults) {
              const totalAttachments = attachmentResults.reduce((count, result) => {
                return count + (result.attachments && result.attachments.items ? result.attachments.items.length : 0);
              }, 0);

              console.log(`Retrieved ${totalAttachments} attachments for ${mask}-${ref}`);

              // Cache the attachment results
              this.saveToSessionStorage(attachmentCacheKey, attachmentResults, true);
            } else {
              console.log(`No attachment results for ${mask}-${ref}`);
            }
          } else {
            console.log(`Using cached attachment data for ${mask}-${ref}`);
          }

          // Process each span normally (without attachment UI)
          for (const span of spans) {
            await this.processSpanWithDefinitions(span, definitions);
          }
        } catch (error) {
          console.error(`Error processing attachments for ${mask}-${ref}:`, error);
        }
      }

      console.log(`Draw ID: ${this.drawID} - Completed processing batch of ${spansToProcess.length} spans.`);
    }

    /**
     * Process a single span with pre-fetched definitions
     */
    escapeHtml(unsafe) {
      if (!unsafe) return "";
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    /**
     * Enhanced check to determine if an element is visible, accounting for Cognos pagination
     */
    isElementVisibleInCognosPage(element) {
      if (!element) return false;

      // Check if element itself is hidden
      if (element.offsetParent === null) return false;

      // NOTE: We're removing the dimension check since that's causing all our spans to be excluded
      // Instead, we'll only check parent visibility

      // Check if any parent container is hidden or on an inactive page
      let parent = element.parentElement;
      while (parent) {
        // Check for display:none, visibility:hidden
        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }

        // Special check for Cognos pagination
        // If this element is in a clsViewerPage that's not displayed, it's not visible
        if (parent.classList && parent.classList.contains("clsViewerPage")) {
          if (style.display !== "block") {
            return false;
          }
        }

        parent = parent.parentElement;
      }

      // If we get here, consider the element visible in the active Cognos page
      return true;
    }

    // Add this debugging function to your class
    debugVisibilityIssues() {
      // Get ALL spans with the data-name attribute first
      const allNamedSpans = document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
      console.log(`Debug: Found ${allNamedSpans.length} total spans with data-name=${this.SPAN_NAME}`);

      if (allNamedSpans.length === 0) {
        console.log(`Debug: No spans with data-name=${this.SPAN_NAME} found at all. Check the SPAN_NAME value.`);

        // Check if there are ANY spans with data attributes
        const anyDataSpans = document.querySelectorAll("span[data-mask]");
        console.log(`Debug: Found ${anyDataSpans.length} spans with data-mask attribute`);

        if (anyDataSpans.length > 0) {
          // Show what data-name values exist
          const dataNames = new Set();
          anyDataSpans.forEach((span) => {
            if (span.dataset.name) dataNames.add(span.dataset.name);
          });
          console.log(`Debug: Found these data-name values: ${Array.from(dataNames).join(", ")}`);
        }
        return;
      }

      // Check each span for required attributes
      let missingMask = 0;
      let missingRef = 0;

      allNamedSpans.forEach((span) => {
        if (!span.dataset.mask) missingMask++;
        if (!span.dataset.ref) missingRef++;
      });

      console.log(`Debug: Spans missing data-mask: ${missingMask}, missing data-ref: ${missingRef}`);

      // Check visibility status of each span
      let hiddenByOffsetParent = 0;
      let hiddenByDimensions = 0;
      let hiddenByStyle = 0;
      let hiddenByCognosPage = 0;
      let notInViewport = 0;
      let fullyVisible = 0;

      allNamedSpans.forEach((span) => {
        if (span.offsetParent === null) {
          hiddenByOffsetParent++;
          return;
        }

        const rect = span.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          hiddenByDimensions++;
          return;
        }

        // Check parent containers
        let isHiddenByParent = false;
        let isHiddenByCognosPage = false;
        let parent = span.parentElement;

        while (parent) {
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") {
            isHiddenByParent = true;
            break;
          }

          if (parent.classList && parent.classList.contains("clsViewerPage")) {
            if (style.display !== "block") {
              isHiddenByCognosPage = true;
              break;
            }
          }

          parent = parent.parentElement;
        }

        if (isHiddenByParent) {
          hiddenByStyle++;
          return;
        }

        if (isHiddenByCognosPage) {
          hiddenByCognosPage++;
          return;
        }

        // Check viewport visibility
        if (!this.isElementInViewport(span)) {
          notInViewport++;
          return;
        }

        // If we got here, the span is fully visible
        fullyVisible++;
      });

      console.log(`Debug: Visibility breakdown:
      - Hidden by offsetParent: ${hiddenByOffsetParent}
      - Hidden by zero dimensions: ${hiddenByDimensions}
      - Hidden by parent style: ${hiddenByStyle}
      - Hidden by Cognos page: ${hiddenByCognosPage}
      - Not in viewport: ${notInViewport}
      - Fully visible: ${fullyVisible}
    `);
    }
    /**
     * Gets root detail data for a specific entity
     */
    async getRootDetailData(entityTransform, maskString, itemIDInput) {
      // Find the root entity data source from the transformed data
      const dataSourceObj = entityTransform.dataSources.find((ds) => ds.isRootEntity === true);

      if (!dataSourceObj) {
        console.error("No root entity data source found in the transform");
        return null;
      }

      // Get the appropriate fetch configuration
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return null;
      }

      // For the URL, we need to use the entity type
      const entityType = dataSourceObj.entityType;

      // Determine which filter field to use
      const filterField = fetchObj.name;

      // Extract the actual item ID value
      let itemIDValue;

      // Handle different input formats
      if (typeof itemIDInput === "string") {
        // If it's directly a string
        itemIDValue = itemIDInput;
      } else if (itemIDInput && typeof itemIDInput === "object") {
        // If it's an object, check for itemID property
        if (itemIDInput.itemID) {
          itemIDValue = itemIDInput.itemID;
        } else if (Object.prototype.hasOwnProperty.call(itemIDInput, "mask")) {
          // It might be a mask object from ALL_MASKS
          const maskObj = this.ALL_MASKS.masks.find((mask) => mask.mask === maskString);
          if (maskObj && maskObj.itemID) {
            itemIDValue = maskObj.itemID;
          }
        }
      }

      // Ensure we have a valid item ID
      if (!itemIDValue) {
        console.error("Could not extract a valid itemID from input:", itemIDInput);
        return null;
      }

      console.log("Using itemID value:", itemIDValue);

      // Build the filter text
      const filterText = `(${filterField} eq '${itemIDValue}')`;

      // Prepare named filter parameter if available
      let namedFilterParam = "";
      if (dataSourceObj.namedFilter) {
        namedFilterParam = `$namedfilters=${encodeURIComponent(dataSourceObj.namedFilter)}&`;
      }

      // Construct filter parameter
      const filterParam = `${namedFilterParam}$filter=${encodeURIComponent(filterText)}`;

      // Use sort parameter from dataSource or default
      const orderByParam = dataSourceObj.sortbyParam
        ? `&$orderby=${encodeURIComponent(dataSourceObj.sortbyParam)}`
        : `&$orderby=CreateDate desc,BatchId`;

      // Build the complete URL
      const url = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.detailUrls.mainUrl}${entityType}?${filterParam}${orderByParam}&$skip=0&$top=20`;

      // Construct referrer URL
      const refUrl = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.detailUrls.referrerUrl}${fetchObj.path}`;

      console.log("Making request to:", url);
      console.log("Filter text:", filterText);

      try {
        const response = await fetch(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            glledger: "GL",
            jlledger: "--",
            mask: maskString,
            pragma: "no-cache",
            priority: "u=1, i",
            runtimemask: maskString,
          },
          referrer: refUrl,
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) {
          console.error(`HTTP error ${response.status}:`, await response.text());
          return null;
        }

        return await response.json();
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    }

    /**
     * Gets child detail data related to the parent results
     */
    async getChildrenInfo(entityTransform, maskString, parentResult) {
      // Find the fetch configuration
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return null;
      }

      // Get the root entity data source from the transformed data
      const rootDataSource = entityTransform.dataSources.find((ds) => ds.isRootEntity === true);

      if (!rootDataSource || !parentResult || !parentResult.items || parentResult.items.length === 0) {
        console.error("Missing root data source or parent result data");
        return null;
      }

      // Get the parent result data (first item)
      const parentData = parentResult.items[0];

      console.log("Parent data for building child filters:", parentData);

      // Find all non-root data sources that have attachment definitions
      const childDataSources = entityTransform.dataSources.filter((ds) => !ds.isRootEntity && ds.attachment);

      if (childDataSources.length === 0) {
        console.log("No child data sources with attachments found");
        return [];
      }

      // Process each child data source
      const childResults = await Promise.all(
        childDataSources.map(async (childDS) => {
          // Get the entity type for this child
          const entityType = childDS.entityType;

          // Build filter based on the linkage between parent and child
          let filterText = "";

          // Find linkage properties between this child and the parent
          if (childDS.dataS && childDS.dataS.linkages && Array.isArray(childDS.dataS.linkages)) {
            // Extract the linkage conditions
            const filterConditions = childDS.dataS.linkages
              .map((linkage) => {
                const parentProperty = linkage.parentProperty;
                const childProperty = linkage.childProperty;

                // Get the value from parent data
                if (parentProperty && childProperty && parentData[parentProperty] !== undefined) {
                  const parentValue = parentData[parentProperty];

                  // Format value based on type
                  const formattedValue = typeof parentValue === "string" ? `'${parentValue}'` : parentValue;

                  return `(${childProperty} eq ${formattedValue})`;
                }
                return null;
              })
              .filter((condition) => condition !== null);

            if (filterConditions.length > 0) {
              filterText = filterConditions.join(" and ");
            }
          }

          // If no linkage filters were created, try using root ID columns
          if (!filterText && entityTransform.rootIdColumns && entityTransform.rootIdColumns.length > 0) {
            const rootFilterConditions = entityTransform.rootIdColumns
              .filter((colName) => parentData[colName] !== undefined)
              .map((colName) => {
                const value = parentData[colName];
                const formattedValue = typeof value === "string" ? `'${value}'` : value;
                return `(${colName} eq ${formattedValue})`;
              });

            if (rootFilterConditions.length > 0) {
              filterText = rootFilterConditions.join(" and ");
            }
          }

          if (!filterText) {
            console.error(`No valid filter condition could be created for ${entityType}`);
            return { entityType, data: null };
          }

          // Prepare named filter parameter if available
          let namedFilterParam = "";
          if (childDS.namedFilter) {
            namedFilterParam = `$namedfilters=${encodeURIComponent(childDS.namedFilter)}&`;
          }

          // Construct filter parameter
          const filterParam = `${namedFilterParam}$filter=${encodeURIComponent(filterText)}`;

          // Use sort parameter from dataSource or default
          const orderByParam = childDS.sortbyParam ? `&$orderby=${encodeURIComponent(childDS.sortbyParam)}` : "";

          // Build the complete URL
          const url = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.detailUrls.mainUrl}${entityType}?${filterParam}${orderByParam}&$skip=0&$top=100`;

          // Construct referrer URL
          const refUrl = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.detailUrls.referrerUrl}${fetchObj.path}`;

          console.log(`Fetching child data for ${entityType} with filter: ${filterText}`);
          console.log(`Request URL: ${url}`);

          try {
            const response = await fetch(url, {
              headers: {
                accept: "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "application/json",
                glledger: parentData.Gr || "GL",
                jlledger: "--",
                mask: maskString,
                pragma: "no-cache",
                priority: "u=1, i",
                runtimemask: maskString,
              },
              referrer: refUrl,
              referrerPolicy: "strict-origin-when-cross-origin",
              body: null,
              method: "GET",
              mode: "cors",
              credentials: "include",
            });

            if (!response.ok) {
              console.error(`HTTP error ${response.status} for ${entityType}:`, await response.text());
              return { entityType, data: null };
            }

            const data = await response.json();
            console.log(`Retrieved ${data.items ? data.items.length : 0} items for ${entityType}`);
            return { entityType, data };
          } catch (error) {
            console.error(`Fetch error for ${entityType}:`, error);
            return { entityType, data: null };
          }
        })
      );

      return childResults;
    }

    /**
     * Gets attachments for a specific mask and entity
     */
    async getAttachments(entityTransform, maskString, maskObj) {
      // Step 1: Fetch the root detail data
      const rootData = await this.getRootDetailData(entityTransform, maskString, maskObj);

      if (!rootData || !rootData.items || rootData.items.length === 0) {
        console.error("No root data found");
        return null;
      }

      console.log("Root data retrieved:", rootData.items[0]);

      // Step 2: Fetch children data for all attachment-related tables
      const childrenData = await this.getChildrenInfo(entityTransform, maskString, rootData);

      if (!childrenData || childrenData.length === 0) {
        console.log("No child data sources with attachments");
      } else {
        console.log("Children data retrieved for:", childrenData.map((child) => child.entityType).join(", "));
      }

      // Step 3: Prepare for attachment requests
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return null;
      }

      // Prepare to collect all attachment results
      const attachmentResults = [];

      // Step 4: Process root entity attachments if available
      if (rootData.items && rootData.items.length > 0) {
        const rootEntity = entityTransform.dataSources.find((ds) => ds.isRootEntity);
        if (rootEntity && rootEntity.attachment) {
          const rootItem = rootData.items[0];

          try {
            // URL for attachments
            const url = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.mainUrl}/${rootEntity.entityType}/attachments/`;

            // Referrer URL
            const refUrl = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.referrerUrl}${fetchObj.path}`;

            console.log(`Fetching attachments for root entity with item:`, rootItem);

            const response = await fetch(url, {
              headers: {
                accept: "application/json, text/plain, */*",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                "content-type": "application/json",
                glledger: rootItem.Gr || "GL",
                jlledger: "--",
                mask: maskString,
                pragma: "no-cache",
                priority: "u=1, i",
                runtimemask: maskString,
              },
              referrer: refUrl,
              referrerPolicy: "strict-origin-when-cross-origin",
              body: JSON.stringify(rootItem),
              method: "POST",
              mode: "cors",
              credentials: "include",
            });

            if (!response.ok) {
              console.error(`HTTP error ${response.status} for root attachments:`, await response.text());
            } else {
              const attachmentData = await response.json();
              attachmentResults.push({
                entityType: rootEntity.entityType,
                isRoot: true,
                attachments: attachmentData,
              });
            }
          } catch (error) {
            console.error("Error fetching root attachments:", error);
          }
        } else {
          console.log("Root entity has no attachment definition");
        }
      }

      // Step 5: Process child entity attachments
      if (childrenData && childrenData.length > 0) {
        // For each child data source that has data
        for (const childResult of childrenData) {
          if (!childResult.data || !childResult.data.items || childResult.data.items.length === 0) {
            console.log(`No items found for child entity: ${childResult.entityType}`);
            continue;
          }

          // Find the corresponding data source
          const childDS = entityTransform.dataSources.find((ds) => ds.entityType === childResult.entityType);

          if (!childDS || !childDS.attachment) {
            console.log(`No attachment definition for child entity: ${childResult.entityType}`);
            continue;
          }

          // Process each item in the child data
          for (const childItem of childResult.data.items) {
            try {
              // URL for attachments
              const url = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.mainUrl}/${childDS.entityType}/attachments/`;

              // Referrer URL
              const refUrl = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.referrerUrl}${fetchObj.path}`;

              console.log(`Fetching attachments for child entity ${childResult.entityType} with item:`, childItem);

              const response = await fetch(url, {
                headers: {
                  accept: "application/json, text/plain, */*",
                  "accept-language": "en-US,en;q=0.9",
                  "cache-control": "no-cache",
                  "content-type": "application/json",
                  glledger: childItem.Gr || "GL",
                  jlledger: "--",
                  mask: maskString,
                  pragma: "no-cache",
                  priority: "u=1, i",
                  runtimemask: maskString,
                },
                referrer: refUrl,
                referrerPolicy: "strict-origin-when-cross-origin",
                body: JSON.stringify(childItem),
                method: "POST",
                mode: "cors",
                credentials: "include",
              });

              if (!response.ok) {
                console.error(`HTTP error ${response.status} for child attachments:`, await response.text());
              } else {
                const attachmentData = await response.json();
                attachmentResults.push({
                  entityType: childDS.entityType,
                  isRoot: false,
                  item: childItem,
                  attachments: attachmentData,
                });
              }
            } catch (error) {
              console.error(`Error fetching attachments for child entity ${childResult.entityType}:`, error);
            }
          }
        }
      }

      return attachmentResults;
    }

    /**
     * Generates an SVG string for the specified file type and size.
     *
     * @param {string} fileType - The file type (e.g., "pdf", "csv", "image").
     * @param {string} size - The desired size (e.g., "16px").
     * @returns {string} The SVG markup.
     */
    getSvgForType(fileType, size) {
      /*
       ** Lucide License
       ** ISC License
       ** Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
       ** Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
       ** THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
       */
      const height = size;
      const width = size;

      switch (fileType) {
        case "pdf":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
        case "csv":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet-icon lucide-file-spreadsheet"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>`;
        case "excel":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-x-icon lucide-file-x"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m14.5 12.5-5 5"/><path d="m9.5 12.5 5 5"/></svg>`;
        case "image":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-image-icon lucide-file-image"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg>`;
        case "doc":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
        case "txt":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
        case "paperclip":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>`;
        case "clock":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
        case "error":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
        default:
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="#FF0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
      }
    }

    /**
     * Constructs the viewer URL to open a document.
     *
     * @param {string} docToken - Document token.
     * @param {string} directUrl - Direct URL override, if applicable.
     * @param {string} urlType - URL type to determine which URL to use.
     * @returns {string} The constructed viewer URL.
     */
    getViewerUrl(docToken, directUrl, urlType) {
      let url = `${this.AppUrl}/${this.authObj.environment}-UI/ui/Documents/viewer?docToken=${docToken}`;

      if (!urlType) {
        url = directUrl;
      }

      return url;
    }

    /**
     * Builds and returns a DOM element containing a table of document details.
     *
     * @param {Array} documentData - Array of document objects.
     * @param {string} RefId - Reference ID used in the modal title.
     * @returns {HTMLElement|null} The constructed content container element or null on error.
     */
    getDocumentContent(documentData, RefId) {
      try {
        // Create just the content container
        const modalContent = document.createElement("div");
        modalContent.style.backgroundColor = "white";
        modalContent.style.borderRadius = "5px";
        modalContent.style.width = "100%";
        modalContent.style.display = "flex";
        modalContent.style.flexDirection = "column";
        modalContent.style.position = "relative";
        modalContent.style.fontSize = this.FONT_SIZE;

        const modalBody = document.createElement("div");
        modalBody.style.padding = "0";
        modalBody.style.overflowY = "auto";
        modalBody.style.flexGrow = "1";

        // Create table
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.marginTop = "10px";
        table.style.marginBottom = "10px";
        table.style.tableLayout = "fixed"; // Use fixed layout for no word wrap

        // Create table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        // Define headers
        const headers = [
          "Document ID",
          "FileName",
          "File Type",
          "Pages",
          "Page Count",
          "Create Date",
          "Attachment Definition",
        ];

        // Define column widths (percentages)
        const columnWidths = [15, 30, 10, 8, 8, 15, 14];

        headers.forEach((headerText, index) => {
          const th = document.createElement("th");
          th.textContent = headerText;
          th.style.padding = "8px";
          th.style.textAlign = "left";
          th.style.borderBottom = "1px solid #ddd";
          th.style.backgroundColor = "#f2f2f2";
          th.style.width = columnWidths[index] + "%";
          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        documentData.sort((a, b) => {
          // Convert docId strings to numbers for proper numerical sorting
          const idA = parseInt(a.docId) || 0;
          const idB = parseInt(b.docId) || 0;
          return idA - idB;
        });

        // Create table body
        const tbody = document.createElement("tbody");

        documentData.forEach((doc) => {
          const row = document.createElement("tr");
          row.style.cursor = "pointer";
          row.onmouseover = function () {
            this.style.backgroundColor = "#f5f5f5";
          };
          row.onmouseout = function () {
            this.style.backgroundColor = "";
          };

          let linkUrl = this.getViewerUrl(doc.docToken, doc.url, this.URL_TYPE);
          // Add click handler to open document
          if (linkUrl) {
            row.onclick = function () {
              window.open(linkUrl, "_blank");
            };
          }

          // Create cells for each column
          const createCell = (content, isIcon = false, isFilename = false) => {
            const td = document.createElement("td");
            td.style.padding = "8px";
            td.style.borderBottom = "1px solid #ddd";
            td.style.whiteSpace = "nowrap"; // Prevent word wrap
            td.style.overflow = "hidden";
            td.style.textOverflow = "ellipsis"; // Show ellipsis for overflow
            td.title = content;

            if (isFilename && linkUrl) {
              // Create a hyperlink for the filename
              const link = document.createElement("a");
              link.href = linkUrl;
              link.target = "_blank";
              link.textContent = content || "";
              link.style.textDecoration = "underline";
              link.style.color = "#0066cc";

              if (isIcon && doc.clsid) {
                // Add icon before the link text
                const extension = doc.clsid.toLowerCase();
                let iconType = "generic";

                if (extension.includes(".pdf")) {
                  iconType = "pdf";
                } else if (extension.includes(".csv")) {
                  iconType = "csv";
                } else if ([".xls", ".xlsx", ".xlsm", ".xlsb"].some((ext) => extension.includes(ext))) {
                  iconType = "excel";
                } else if (
                  [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].some((ext) => extension.includes(ext))
                ) {
                  iconType = "image";
                } else if ([".doc", ".docx"].some((ext) => extension.includes(ext))) {
                  iconType = "doc";
                } else if ([".txt", ".rtf", ".odt"].some((ext) => extension.includes(ext))) {
                  iconType = "txt";
                }

                const iconSpan = document.createElement("span");
                iconSpan.innerHTML = this.getSvgForType(iconType, this.ICON_DIMENSIONS);
                iconSpan.style.marginRight = "5px";
                td.appendChild(iconSpan);
              }

              td.appendChild(link);

              // Prevent row click from triggering when clicking the link directly
              link.onclick = function (e) {
                e.stopPropagation();
              };
            } else if (isIcon && doc.clsid) {
              const iconSpan = document.createElement("span");
              const extension = doc.clsid.toLowerCase();
              let iconType = "generic";

              if (extension.includes(".pdf")) {
                iconType = "pdf";
              } else if (extension.includes(".csv")) {
                iconType = "csv";
              } else if ([".xls", ".xlsx", ".xlsm", ".xlsb"].some((ext) => extension.includes(ext))) {
                iconType = "excel";
              } else if (
                [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].some((ext) => extension.includes(ext))
              ) {
                iconType = "image";
              } else if ([".doc", ".docx"].some((ext) => extension.includes(ext))) {
                iconType = "doc";
              } else if ([".txt", ".rtf", ".odt"].some((ext) => extension.includes(ext))) {
                iconType = "txt";
              }

              iconSpan.innerHTML = this.getSvgForType(iconType, this.ICON_DIMENSIONS);
              td.appendChild(iconSpan);

              const textSpan = document.createElement("span");
              textSpan.textContent = " " + content;
              td.appendChild(textSpan);
            } else {
              td.textContent = content || "";
            }

            return td;
          };

          // Add all cells to the row
          row.appendChild(createCell(doc.docId));
          row.appendChild(createCell(doc.description, true, true)); // Added true for isFilename
          row.appendChild(createCell(doc.clsid.toLowerCase()));
          row.appendChild(createCell(doc.pages));
          row.appendChild(createCell(doc.pageCount));
          row.appendChild(createCell(doc.createDt));
          row.appendChild(createCell(doc.attachID));

          tbody.appendChild(row);
        });

        table.appendChild(tbody);
        modalBody.appendChild(table);

        modalContent.appendChild(modalBody);

        return modalContent;
      } catch (error) {
        console.error("Error creating document content:", error);
        return null;
      }
    }

    /**
     * Opens a dialog message displaying document details in a table format.
     *
     * @param {Array} documentData - Array of document objects.
     * @param {string} assetID - The asset ID used in the dialog title.
     */
    openMessage(documentData, assetID) {
      try {
        // Define headers and column widths
        const headers = [
          "Document ID",
          "FileName",
          "File Type",
          "Pages",
          "Page Count",
          "Create Date",
          "Attachment Definition",
        ];

        const columnWidths = [15, 30, 10, 8, 8, 15, 14];

        // Sort the data
        documentData.sort((a, b) => {
          const idA = parseInt(a.docId) || 0;
          const idB = parseInt(b.docId) || 0;
          return idA - idB;
        });

        // Function to safely escape URLs
        const escapeURL = (url) => {
          if (!url) return "";
          // First encode the URL to handle special characters
          return url.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        };

        // Build the table HTML
        let tableHtml = `
              <div style="background-color:white;width:100%;font-size:${this.FONT_SIZE};">
                <div style="overflow-y:auto;max-height:400px;">
                  <table style="width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed;">
                    <thead>
                      <tr>`;

        // Add header cells
        headers.forEach((headerText, index) => {
          tableHtml += `<th style="padding:8px;text-align:left;border-bottom:1px solid #ddd;background-color:#f2f2f2;width:${columnWidths[index]}%;">${headerText}</th>`;
        });

        tableHtml += `</tr>
                    </thead>
                    <tbody>`;

        // Add rows for each document
        documentData.forEach((doc) => {
          let linkUrl = this.getViewerUrl(doc.docToken, doc.url, this.URL_TYPE);
          const safeUrl = escapeURL(linkUrl);

          tableHtml += `<tr style="cursor:pointer;" 
                              onmouseover="this.style.backgroundColor='#f5f5f5';" 
                              onmouseout="this.style.backgroundColor='';">`;

          // Document ID
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${doc.docId}">${doc.docId}</td>`;

          // Filename with link
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${
            this.escapeHtml(doc.description) || ""
          }">`;
          if (linkUrl) {
            tableHtml += `<a href="${safeUrl}" target="_blank" style="text-decoration:underline;color:#0066cc;">${
              doc.description || ""
            }</a>`;
          } else {
            tableHtml += this.escapeHtml(doc.description) || "";
          }
          tableHtml += `</td>`;

          // File Type
          const safeClsid = doc.clsid ? doc.clsid.toLowerCase() : "";
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${safeClsid}">${safeClsid}</td>`;

          // Pages
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${
            doc.pages || ""
          }">${doc.pages || ""}</td>`;

          // Page Count
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${
            doc.pageCount || ""
          }">${doc.pageCount || ""}</td>`;

          // Create Date
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${
            doc.createDt || ""
          }">${doc.createDt || ""}</td>`;

          // Attachment Definition
          tableHtml += `<td style="padding:8px;border-bottom:1px solid #ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${
            doc.attachID || ""
          }">${doc.attachID || ""}</td>`;

          tableHtml += `</tr>`;
        });

        tableHtml += `</tbody>
                  </table>
                </div>
              </div>`;
        let dialogObject = {
          title: `${this.MODAL_LABEL} ${assetID}`,
          message: tableHtml,
          className: "info",
          buttons: ["ok"],
          width: "60%",
          type: "info",
          size: "default",
          htmlContent: true,
          callback: {
            ok: async () => {
              if (this.DEBUG_MODE) {
                console.log("ok");
              }
            },
          },
          callbackScope: { ok: this },
        };

        // Create a simpler dialog first to test
        this.oControl.page.application.GlassContext.getCoreSvc(".Dialog").createDialog(dialogObject);
      } catch (error) {
        console.error("Error showing dialog:", error);
        alert(`Error showing document dialog: ${error.message}`);
      }
    }
  }

  return AdvancedControl;
});
// 20250410 342