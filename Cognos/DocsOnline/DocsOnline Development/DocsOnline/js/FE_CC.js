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
        this.debugVisibilityIssues();

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

      // Now process each span using the pre-fetched definitions
      const processingPromises = spansToProcess.map((span) => {
        const mask = span.getAttribute("data-mask");
        if (!mask) {
          console.warn(`Draw ID: ${this.drawID} - Span has no mask attribute, skipping.`);
          return Promise.resolve();
        }

        const definitions = definitionsMap.get(mask);

        // Skip if we couldn't get definitions for this mask
        if (!definitions) {
          console.warn(`Draw ID: ${this.drawID} - No definitions available for mask ${mask}, skipping span.`);
          return Promise.resolve();
        }

        return this.processSpanWithDefinitions(span, definitions);
      });

      // Wait for all processing to complete
      await Promise.allSettled(processingPromises);

      console.log(`Draw ID: ${this.drawID} - Completed processing batch of ${spansToProcess.length} spans.`);
    }

    /**
     * Process a single span with pre-fetched definitions
     */
    async processSpanWithDefinitions(span, definitions) {
      // Make sure span is still in the DOM and valid
      if (!span || !document.body.contains(span)) {
        console.warn(`Draw ID: ${this.drawID} - Span no longer in DOM, skipping processing.`);
        return;
      }

      const mask = span.getAttribute("data-mask");
      const ref = span.getAttribute("data-ref");

      if (!mask || !ref) {
        console.warn(`Draw ID: ${this.drawID} - Span missing data-mask or data-ref attribute, skipping.`);
        return;
      }

      // Create a unique ID for this span
      const spanUniqueId = `${mask}-${ref}`;

      // Check for EXISTING icon by looking for our container anywhere in the document
      const existingContainer = document.getElementById(`doc-container-${spanUniqueId}`);
      if (existingContainer) {
        console.log(`Draw ID: ${this.drawID} - Container already exists for span ${spanUniqueId}, skipping.`);
        span.setAttribute(`data-processed-${this.drawID}`, "true");
        return;
      }

      // Use unique attributes to mark processing
      const processedAttr = `data-processed-${this.drawID}`;
      const processingAttr = `data-processing-${this.drawID}`;

      // Check if already being processed
      if (span.hasAttribute(processingAttr)) {
        return;
      }

      // Mark as processing
      span.setAttribute(processingAttr, "true");

      try {
        // Use the pre-fetched definitions
        const { transformedDef } = definitions;

        // Create the container with a globally unique ID
        const container = document.createElement("span");
        container.style.display = "inline-block";
        container.style.minWidth = "20px";
        container.style.minHeight = "16px";
        container.id = `doc-container-${spanUniqueId}`; // Use our unique ID instead of draw ID

        // Create the icon element
        const iconElement = document.createElement("span");
        iconElement.innerHTML = "📎";
        iconElement.style.marginLeft = "4px";
        iconElement.style.cursor = "pointer";
        iconElement.style.display = "inline-block";
        iconElement.title = `Documents for ${ref}`;

        // Add click handler that could open a modal with document details
        iconElement.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`Clicked icon for mask=${mask}, ref=${ref}`);
          // Here you would implement your modal or document display logic
        });

        // Add the icon to the container
        container.appendChild(iconElement);

        // Insert the container after the span
        span.parentNode.insertBefore(container, span.nextSibling);

        // Mark as processed
        span.setAttribute(processedAttr, "true");
      } catch (error) {
        console.error(`Error processing span with mask=${mask}, ref=${ref}:`, error);
      } finally {
        // Always remove the processing flag
        if (span) {
          span.removeAttribute(processingAttr);
        }
      }
    }

    /**
     * Enhanced check to determine if an element is visible, accounting for Cognos pagination
     */
    isElementVisibleInCognosPage(element) {
      if (!element) return false;

      // Check if element itself is hidden
      if (element.offsetParent === null) return false;

      // Check if element has zero dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;

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

      // Additionally check viewport visibility
      return this.isElementInViewport(element);
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
  }

  return AdvancedControl;
});
// 20250410 304