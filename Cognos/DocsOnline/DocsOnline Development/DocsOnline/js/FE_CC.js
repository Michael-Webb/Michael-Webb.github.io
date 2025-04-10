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
        this.drawID = this.oControl.generateUniqueID(); // *** Get and store drawID ***

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

        try {
          const autObject = await this.authenticate();

          // Now do things that require authentication
          let spanList = document.querySelectorAll(`[data-name=${this.SPAN_NAME}]`);
          console.log("spanList", spanList);
          let allMasks = this.getAllMasks(spanList);
          let data = await this.fetchScreenDef(allMasks[0], autObject);
          let modelsArray = this.extractEntityTypes(data);

          let btObjectValues = await this.getBT20Models(allMasks[0], modelsArray.btString, autObject);
          const uniqueModels = [...new Set([...btObjectValues, ...modelsArray.btString])];

          // Passing the combined set of btObjectValues and btString to getAttachDef
          const attachDef = await this.getAttachDef(maskString, uniqueModels, autObject);

          const entityTransform = this.transformDefintion(data, attachDef);

          console.log("Entity Types:", modelsArray, btObjectValues, attachDef, entityTransform);
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
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return;
      }
      const url = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.bt20models.mainUrl}`;
      const refUrl = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.bt20models.referrerUrl}${fetchObj.path}/${fetchObj.mask}`;

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
        }
        return await response.json();
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
      const refUrl = `${this.AppUrl}/${authObject.environment}${this.URL_LOOKUP.bt20models.referrerUrl}${fetchObj.path}/${fetchObj.mask}`;

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

        return extractObjectValues(data);
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
    destroy(oControlHost) {}

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

        // Step 1: Get Cookies
        let getCookies = await this.fetchFromScreen(authObject, "FAUPAS");
        // Step 2: Fetch API token.
        const apiToken = await this.fetchApiToken(authObject);
        authObject.apiToken = apiToken;

        // Step 3: Validate security token.
        const validateToken = await this.validateSecurityToken(authObject);

        // Step 4: Get Session Expiration and log it.
        const sessionExpData = await this.getSessionExpiration(authObject);
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
      const fetchObj = this.findMaskObject(maskString);
      if (!fetchObj) {
        console.error("Invalid mask:", maskString);
        return;
      }

      // Construct URLs using the helper function
      const url = `${this.AppUrl}/${authObj.environment}${this.URL_LOOKUP.screenDef.mainUrl}${fetchObj.path}`;
      const refUrl = `${this.AppUrl}/${authObj.environment}${this.URL_LOOKUP.screenDef.referrerUrl}${fetchObj.path}`;

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
        }
        return await response.json();
      } catch (error) {
        console.error("Fetch error:", error);
        throw error;
      }
    }
  }

  return AdvancedControl;
});
// 20250410 104