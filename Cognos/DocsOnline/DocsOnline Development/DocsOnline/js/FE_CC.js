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
      console.log("Initiallize END");
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

          // ***NEW ADDITION: Update session expiration on every draw***
          try {
            const sessionExpData = await this.getSessionExpiration(this.authObj);
            console.log(
              `Draw ID: ${this.drawID} - Updated session expiration. New expiration in ${sessionExpData.expirationIntervalInMinutes} minutes`
            );
          } catch (sessionError) {
            console.warn(
              `Draw ID: ${this.drawID} - Failed to update session expiration, continuing with existing token:`,
              sessionError
            );
          }

          const allSpansTest = document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
          console.log(
            `Draw ID: ${this.drawID} - Found ${allSpansTest.length} total spans with data-name=${this.SPAN_NAME}`
          );

          // Always initialize the page observer to handle pagination, regardless of lazy loading setting
          this.initializeViewerPageObserver();

          if (this.IS_LAZY_LOADED) {
            console.log(`Draw ID: ${this.drawID} - Initializing lazy loading.`);

            // Initialize lazy loading and process only visible spans
            this.initializeVisibleSpanLoading();
            setTimeout(() => this.processVisibleSpans(), 100);
          } else {
            // Process all spans without lazy loading
            const allSpans = this.getAllAssetSpans();
            if (allSpans.length > 0) {
              console.log(`Draw ID: ${this.drawID} - Processing ${allSpans.length} spans (Non-Lazy).`);

              // Group spans by mask and ref to avoid duplicate processing
              const spanGroups = this.groupSpansByMaskRef(Array.from(allSpans));
              console.log(`Draw ID: ${this.drawID} - Grouped into ${spanGroups.size} unique mask-ref combinations.`);

              // Create a promise for each unique mask-ref group
              const processingPromises = [];
              for (const [key, group] of spanGroups.entries()) {
                processingPromises.push(this.processIndividualSpanGroup(group, this.authObj));
              }

              // Process all groups concurrently
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

    /**
     * Groups spans by their mask and ref attributes to avoid duplicate processing
     * @param {Array} spans - Array of span elements
     * @returns {Map} Map with mask-ref keys and grouped span data
     */
    groupSpansByMaskRef(spans) {
      const spanGroups = new Map();

      for (const span of spans) {
        const mask = span.getAttribute("data-mask");
        const ref = span.getAttribute("data-ref");

        if (!mask || !ref) continue;

        const key = `${mask}-${ref}`;
        if (!spanGroups.has(key)) {
          spanGroups.set(key, { mask, ref, spans: [] });
        }

        spanGroups.get(key).spans.push(span);
      }

      return spanGroups;
    }

    /**
     * Processes a group of spans with the same mask and ref
     * @param {Object} group - Object containing mask, ref, and spans array
     * @param {Object} authObj - Authentication object
     * @returns {Promise} Promise that resolves when processing is complete
     */
    async processIndividualSpanGroup(group, authObj) {
      const { mask, ref, spans } = group;
      const spanUniqueId = `${mask}-${ref}`;
      const processedAttr = `data-processed-${this.drawID}`;
      const processingAttr = `data-processing-${this.drawID}`;

      try {
        // Mark all spans in this group as processing
        spans.forEach((span) => {
          if (span && !span.hasAttribute(processedAttr) && !span.hasAttribute(processingAttr)) {
            span.setAttribute(processingAttr, "true");
          }
        });

        // Create container for this group
        let container = document.getElementById(`doc-container-${spanUniqueId}`);
        if (!container) {
          // Insert clock icon container
          container = document.createElement("span");
          container.style.display = "inline-block";
          container.style.minWidth = this.ICON_DIMENSIONS;
          container.style.minHeight = this.ICON_DIMENSIONS;
          container.style.width = this.ICON_DIMENSIONS
          container.style.height = this.ICON_DIMENSIONS
          container.style.verticalAlign = "middle";
          container.id = `doc-container-${spanUniqueId}`;
          container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);
          container.title = `Loading attachments for ${ref}...`;

          // Place container next to the first span in the group
          if (spans.length > 0) {
            const firstSpan = spans[0];
            const rect = firstSpan.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              const parentElement = firstSpan.parentElement;
              if (parentElement && (parentElement.tagName === "TD" || parentElement.tagName === "TH")) {
                parentElement.appendChild(container);
              } else {
                firstSpan.parentNode.insertBefore(container, firstSpan.nextSibling);
              }
            } else {
              firstSpan.parentNode.insertBefore(container, firstSpan.nextSibling);
            }
          }
        }

        // Fetch definition for this mask
        const defCacheKey = this.generateCacheKey(`screen_defs_${mask}`, authObj);
        let definition = this.getFromSessionStorage(defCacheKey, true);

        if (!definition) {
          console.log(`Processing ${spanUniqueId}: Fetching screen definition`);
          try {
            const screenDef = await this.fetchScreenDef(mask, authObj);
            if (!screenDef) throw new Error(`Failed to get screen definition for mask ${mask}`);

            const entityTypes = this.extractEntityTypes(screenDef);
            const btModels = await this.getBT20Models(mask, entityTypes.btString, authObj);
            const attachDefs = await this.getAttachDef(mask, entityTypes.btString, authObj);
            const transformedDef = this.transformDefintion(screenDef, attachDefs);

            definition = {
              screenDef,
              entityTypes,
              btModels,
              attachDefs,
              transformedDef,
            };

            this.saveToSessionStorage(defCacheKey, definition, true);
          } catch (error) {
            console.error(`Error fetching definition for ${spanUniqueId}:`, error);
            container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
            container.title = `Error loading definition: ${error.message}`;

            // Mark spans as processed with error
            spans.forEach((span) => {
              span.setAttribute(processedAttr, "true");
              span.removeAttribute(processingAttr);
            });

            return; // Exit early on definition error
          }
        }

        // Fetch attachments
        const attachmentCacheKey = this.generateCacheKey(`attachments_${mask}_${ref}`, authObj);
        let attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);

        if (attachmentResults === null) {
          console.log(`Processing ${spanUniqueId}: Fetching attachments`);
          try {
            const maskObj = { mask: mask, itemID: ref };
            attachmentResults = await this.getAttachments(definition.transformedDef, mask, maskObj);
            this.saveToSessionStorage(attachmentCacheKey, attachmentResults, true);
          } catch (error) {
            console.error(`Error fetching attachments for ${spanUniqueId}:`, error);
            container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
            container.title = `Error loading attachments: ${error.message}`;

            // Mark spans as processed with error
            spans.forEach((span) => {
              span.setAttribute(processedAttr, "true");
              span.removeAttribute(processingAttr);
            });

            return; // Exit early on attachment error
          }
        }

        // Process results and update container
        let documentCount = 0;
        let documentData = [];

        if (attachmentResults && Array.isArray(attachmentResults)) {
          documentData = attachmentResults.reduce((allDocs, result) => {
            if (result?.attachments && Array.isArray(result.attachments)) {
              return [...allDocs, ...result.attachments];
            }
            return allDocs;
          }, []);
          documentCount = documentData.length;
        }

        // Update container based on results
        if (documentCount > 0) {
          container.innerHTML = this.getSvgForType("paperclip", this.ICON_DIMENSIONS);
          container.style.cursor = "pointer";
          container.title = `${documentCount} document(s) for ${ref}`;

          // Add click listener
          container.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openMessage(documentData, ref);
          };
        } else {
          // No attachments
          container.innerHTML = "";
          container.title = `No attachments for ${ref}`;
          container.style.cursor = "default";
          container.onclick = null;
        }

        // Mark all spans in this group as processed
        spans.forEach((span) => {
          if (span) {
            span.setAttribute(processedAttr, "true");
            span.removeAttribute(processingAttr);
          }
        });

        console.log(`Processing ${spanUniqueId}: Complete with ${documentCount} documents`);
      } catch (error) {
        console.error(`Unhandled error processing ${spanUniqueId}:`, error);

        // Update container to error state if possible
        const container = document.getElementById(`doc-container-${spanUniqueId}`);
        if (container) {
          container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
          container.title = `Processing error: ${error.message}`;
        }

        // Mark spans as processed with error
        spans.forEach((span) => {
          if (span) {
            span.setAttribute(processedAttr, "true");
            span.removeAttribute(processingAttr);
          }
        });
      }
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

    // /**
    //  * Determines if an element is in the viewport
    //  */
    // isElementInViewport(element) {
    //   if (!element) return false;

    //   // Get the element's bounding rectangle
    //   let rect = element.getBoundingClientRect();

    //   // If the element has no size, try to use its parent
    //   if (rect.width === 0 || rect.height === 0) {
    //     if (element.parentElement) {
    //       rect = element.parentElement.getBoundingClientRect();
    //     }
    //   }

    //   // If dimensions are still zero, consider it not visible
    //   if (rect.width === 0 || rect.height === 0) {
    //     return false;
    //   }

    //   const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    //   const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    //   // Generous buffers allow you to trigger processing slightly off-screen
    //   const verticalBuffer = 100;
    //   const horizontalBuffer = 50;

    //   const isInVerticalViewport = rect.top < windowHeight + verticalBuffer && rect.bottom > 0 - verticalBuffer;
    //   const isInHorizontalViewport = rect.left < windowWidth + horizontalBuffer && rect.right > 0 - horizontalBuffer;

    //   return isInVerticalViewport && isInHorizontalViewport;
    // }
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
     * Initializes lazy-loading using IntersectionObserver.
     * This replaces scroll and resize listeners to detect when spans become visible.
     */
    initializeVisibleSpanLoading() {
      if (this.intersectionObserver) {
        console.log(`Draw ID: ${this.drawID} - IntersectionObserver already initialized.`);
        return;
      }

      const observerOptions = {
        root: null,
        rootMargin: "150px 50px",
        threshold: 0.1,
      };

      const observerCallback = (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log(`Draw ID: ${this.drawID} - Span visible:`, entry.target);
            observer.unobserve(entry.target);
            if (this.visibilityProcessingTimeout) {
              clearTimeout(this.visibilityProcessingTimeout);
            }
            this.visibilityProcessingTimeout = setTimeout(() => {
              this.processVisibleSpans();
            }, 200);
          }
        });
      };

      this.intersectionObserver = new IntersectionObserver(observerCallback.bind(this), observerOptions);

      // Initially observe all existing spans.
      const spans = document.querySelectorAll(`span[data-name="${this.SPAN_NAME}"]`);
      spans.forEach((span) => {
        if (
          !span.hasAttribute(`data-processed-${this.drawID}`) &&
          !span.hasAttribute(`data-processing-${this.drawID}`)
        ) {
          this.intersectionObserver.observe(span);
        }
      });

      console.log(`Draw ID: ${this.drawID} - IntersectionObserver initialized and observing spans.`);

      // Set up MutationObservers on all viewer page containers.
      this.initializeViewerPageObserver();
    }

    /**
     * Initializes a MutationObserver on each 'clsViewerPage' container to detect when a page becomes visible.
     * When a container becomes visible (display: block), it queries for new spans and adds them to the intersection observer.
     */
    initializeViewerPageObserver() {
      // Prevent re-initialization
      if (this.viewerPageObserversInitialized) {
        console.log(`Draw ID: ${this.drawID} - Viewer page observers already initialized.`);
        return;
      }

      // Set up a document-wide observer to catch any new viewer pages added during pagination
      const documentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // Check if any new viewer pages were added
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                // Element node
                // Check if it's a viewer page itself
                if (node.classList && node.classList.contains("clsViewerPage")) {
                  this.setupPageObserver(node);
                }
                // Or check its children for viewer pages
                const newPages = node.querySelectorAll(".clsViewerPage");
                if (newPages.length > 0) {
                  console.log(`Draw ID: ${this.drawID} - Found ${newPages.length} new viewer pages from DOM mutation.`);
                  newPages.forEach((page) => this.setupPageObserver(page));
                }
              }
            });
          }
        });
      });

      // Start observing the document for new pages
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Also set up observers for existing viewer pages
      const viewerPages = document.querySelectorAll(".clsViewerPage");
      console.log(`Draw ID: ${this.drawID} - Found ${viewerPages.length} existing viewer pages to observe.`);

      viewerPages.forEach((page) => this.setupPageObserver(page));

      // Store the document observer for cleanup
      this.documentObserver = documentObserver;

      // Set the flag after successful initialization
      this.viewerPageObserversInitialized = true;
      console.log(`Draw ID: ${this.drawID} - Viewer page observers initialized.`);
    }
    /**
     * Sets up an observer for a specific viewer page
     * @param {Element} page - The viewer page element to observe
     */
    setupPageObserver(page) {
      // Only observe if not already being observed (use a data attribute to track)
      if (page.hasAttribute(`data-observed-${this.drawID}`)) {
        return;
      }

      // Mark as being observed
      page.setAttribute(`data-observed-${this.drawID}`, "true");

      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === "style") {
            const targetPage = mutation.target;
            const display = window.getComputedStyle(targetPage).display;

            if (display === "block") {
              console.log(`Draw ID: ${this.drawID} - Page became visible:`, targetPage);

              // Find spans in this specific page
              const newSpans = targetPage.querySelectorAll(`span[data-name="${this.SPAN_NAME}"]`);
              console.log(`Draw ID: ${this.drawID} - Found ${newSpans.length} spans in newly visible page.`);

              if (newSpans.length > 0) {
                // Filter for unprocessed spans
                const unprocessedSpans = Array.from(newSpans).filter(
                  (span) =>
                    !span.hasAttribute(`data-processed-${this.drawID}`) &&
                    !span.hasAttribute(`data-processing-${this.drawID}`)
                );

                if (unprocessedSpans.length > 0) {
                  console.log(
                    `Draw ID: ${this.drawID} - Found ${unprocessedSpans.length} unprocessed spans in newly visible page.`
                  );

                  if (this.IS_LAZY_LOADED) {
                    // If using lazy loading, add to intersection observer
                    if (this.intersectionObserver) {
                      unprocessedSpans.forEach((span) => {
                        this.intersectionObserver.observe(span);
                      });
                    }
                  } else {
                    // If not lazy loading, process spans immediately using the same group approach
                    const spanGroups = this.groupSpansByMaskRef(unprocessedSpans);
                    console.log(
                      `Draw ID: ${this.drawID} - Grouped ${unprocessedSpans.length} spans into ${spanGroups.size} groups for processing.`
                    );

                    // Process each group
                    spanGroups.forEach((group) => {
                      this.processIndividualSpanGroup(group, this.authObj);
                    });
                  }
                }
              }
            }
          }
        });
      });

      mutationObserver.observe(page, {
        attributes: true,
        attributeFilter: ["style"],
      });

      // Store observer reference for cleanup
      if (!this.pageObservers) {
        this.pageObservers = new Map();
      }
      this.pageObservers.set(page, mutationObserver);

      // Check if the page is already visible and process it
      const display = window.getComputedStyle(page).display;
      if (display === "block") {
        console.log(`Draw ID: ${this.drawID} - Page already visible at setup time:`, page);

        // Process any spans in this page that haven't been processed yet
        const visibleSpans = page.querySelectorAll(`span[data-name="${this.SPAN_NAME}"]`);
        const unprocessedSpans = Array.from(visibleSpans).filter(
          (span) =>
            !span.hasAttribute(`data-processed-${this.drawID}`) && !span.hasAttribute(`data-processing-${this.drawID}`)
        );

        if (unprocessedSpans.length > 0) {
          console.log(
            `Draw ID: ${this.drawID} - Found ${unprocessedSpans.length} unprocessed spans in already visible page.`
          );

          if (this.IS_LAZY_LOADED) {
            // If using lazy loading, add to intersection observer
            if (this.intersectionObserver) {
              unprocessedSpans.forEach((span) => {
                this.intersectionObserver.observe(span);
              });
            }
          } else {
            // If not lazy loading, process spans immediately
            const spanGroups = this.groupSpansByMaskRef(unprocessedSpans);
            console.log(`Draw ID: ${this.drawID} - Processing ${spanGroups.size} groups in visible page.`);

            // Process each group
            spanGroups.forEach((group) => {
              this.processIndividualSpanGroup(group, this.authObj);
            });
          }
        }
      }
    }

    /**
     * Process spans in visible rows of tables with LIST_NAME
     */
    async processVisibleSpans() {
      if (!this.apiToken) {
        return;
      }
      if (this.processingInProgress) {
        return;
      }
      this.processingInProgress = true;
      console.log(`Draw ID: ${this.drawID} - processVisibleSpans START`);

      // Shared state for this batch run to coordinate concurrent fetches
      const definitionsPromiseCache = new Map(); // Cache promises for ongoing definition fetches { mask: Promise<definitions> }
      const attachmentsPromiseCache = new Map(); // Cache promises for ongoing attachment fetches { spanUniqueId: Promise<attachmentResults> }

      try {
        // Find ALL spans, even those that might be in hidden pages
        const allSpans = document.querySelectorAll(`span[data-name=${this.SPAN_NAME}]`);
        if (allSpans.length === 0) {
          console.log(`Draw ID: ${this.drawID} - No spans found.`);
          this.processingInProgress = false;
          return;
        }

        // 1. Filter for visible spans that haven't been fully processed yet
        // Enhanced visibility check that considers pagination
        const visibleUnprocessedSpans = Array.from(allSpans).filter(
          (span) => !span.hasAttribute(`data-processed-${this.drawID}`) && this.isElementVisibleInCognosPage(span)
        );

        console.log(`Draw ID: ${this.drawID} - Found ${visibleUnprocessedSpans.length} visible/unprocessed spans.`);

        if (visibleUnprocessedSpans.length === 0) {
          this.processingInProgress = false;
          return;
        }

        // 2. Group spans by mask-ref
        const spansByMaskRef = new Map();
        visibleUnprocessedSpans.forEach((span) => {
          const mask = span.getAttribute("data-mask");
          const ref = span.getAttribute("data-ref");
          if (!mask || !ref) return; // Skip invalid spans

          // Ensure span isn't already marked as 'processing' by this instance *before* adding to group
          if (span.hasAttribute(`data-processing-${this.drawID}`)) {
            // console.log(`Draw ID: ${this.drawID} - Span ${mask}-${ref} already marked processing, skipping addition to batch.`);
            return;
          }

          const key = `${mask}-${ref}`;
          if (!spansByMaskRef.has(key)) {
            spansByMaskRef.set(key, { mask, ref, spans: [] });
          }
          spansByMaskRef.get(key).spans.push(span);
        });

        if (spansByMaskRef.size === 0) {
          console.log(`Draw ID: ${this.drawID} - No valid mask-ref groups need processing.`);
          this.processingInProgress = false;
          return;
        }

        // 3. Preprocessing: Insert Clocks Synchronously (avoids race conditions in Promise.all)
        // And mark spans as 'processing' *before* starting async work
        console.log(`Draw ID: ${this.drawID} - Preprocessing: Inserting clocks for ${spansByMaskRef.size} groups.`);
        for (const [key, { mask, ref, spans }] of spansByMaskRef.entries()) {
          const spanUniqueId = key;
          const processingAttr = `data-processing-${this.drawID}`;
          let container = document.getElementById(`doc-container-${spanUniqueId}`);

          if (!container) {
            // Create and insert clock container
            // console.log(`Draw ID: ${this.drawID} - Inserting clock for ${spanUniqueId}`);
            container = document.createElement("span");
            container.style.display = "inline-block";
            container.style.minWidth = this.ICON_DIMENSIONS;
            container.style.minHeight = this.ICON_DIMENSIONS;
            container.style.width = this.ICON_DIMENSIONS
          container.style.height = this.ICON_DIMENSIONS
            container.style.verticalAlign = "middle";
            container.id = `doc-container-${spanUniqueId}`;
            container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);
            container.title = `Loading attachments for ${ref}...`;

            // Use the *first* span in the group for placement reference
            const refSpan = spans[0];
            if (refSpan && document.body.contains(refSpan)) {
              const rect = refSpan.getBoundingClientRect();
              const parentElement = refSpan.parentElement;
              if (
                (rect.width === 0 || rect.height === 0) &&
                parentElement &&
                (parentElement.tagName === "TD" || parentElement.tagName === "TH")
              ) {
                parentElement.appendChild(container);
              } else if (parentElement) {
                parentElement.insertBefore(container, refSpan.nextSibling);
              } else {
                console.warn(`Draw ID: ${this.drawID} - Ref span for ${spanUniqueId} has no parent.`);
              }
            } else {
              console.warn(`Draw ID: ${this.drawID} - Ref span for ${spanUniqueId} invalid for placement.`);
            }
          }

          // Mark all spans in this group as processing *now*
          spans.forEach((s) => {
            if (s && !s.hasAttribute(processingAttr)) {
              // Check again to be safe
              s.setAttribute(processingAttr, "true");
            }
          });
        }

        // 4. Create Promises for Concurrent Processing
        console.log(`Draw ID: ${this.drawID} - Creating ${spansByMaskRef.size} processing promises.`);
        const processingPromises = [];
        for (const [key, groupData] of spansByMaskRef.entries()) {
          processingPromises.push(
            this.handleMaskRefGroupProcessing(
              groupData, // { mask, ref, spans }
              this.authObj,
              definitionsPromiseCache, // Pass shared caches
              attachmentsPromiseCache
            )
          );
        }

        // 5. Execute all promises concurrently and wait for completion
        console.log(`Draw ID: ${this.drawID} - Awaiting Promise.all...`);
        await Promise.allSettled(processingPromises); // Use allSettled to ensure all complete, even if some fail
        console.log(`Draw ID: ${this.drawID} - Promise.allSettled completed.`);
      } catch (error) {
        console.error(`Error in processVisibleSpans (Outer Try): ID=${this.drawID}`, error);
      } finally {
        this.processingInProgress = false; // Release the flag
        //console.log(`Draw ID: ${this.drawID} - processVisibleSpans END`);
      }
    }

    /**
     * Handles the processing for a single mask-ref group.
     * Fetches definitions/attachments (using shared caches/promises) and updates the UI.
     * Returns a promise that resolves when processing is complete for this group.
     */
    async handleMaskRefGroupProcessing(groupData, authObj, definitionsPromiseCache, attachmentsPromiseCache) {
      const { mask, ref, spans } = groupData;
      const spanUniqueId = `${mask}-${ref}`;
      const drawID = this.drawID; // Capture instance ID for logging
      const processedAttr = `data-processed-${drawID}`;
      const processingAttr = `data-processing-${drawID}`;

      // Find the container (should exist from preprocessing)
      let container = document.getElementById(`doc-container-${spanUniqueId}`);
      if (!container) {
        console.warn(
          `Draw ID: ${drawID} - Container ${spanUniqueId} missing at start of handleMaskRefGroupProcessing.`
        );
        // Mark spans as not processed so they can be retried if needed?
        spans.forEach((s) => {
          if (s) s.removeAttribute(processingAttr);
        });
        return; // Cannot proceed without container
      }

      try {
        // --- 1. Get Definitions ---
        let definitions = null;
        let definitionError = false;
        const defCacheKey = this.generateCacheKey(`screen_defs_${mask}`, authObj);

        if (definitionsPromiseCache.has(mask)) {
          // A fetch for this mask is already in progress by another concurrent call
          // console.log(`Draw ID: ${drawID} - Awaiting existing definitions promise for mask ${mask}.`);
          definitions = await definitionsPromiseCache.get(mask);
        } else {
          // Check session storage first
          definitions = this.getFromSessionStorage(defCacheKey, true);
          if (!definitions || definitions.error) {
            // Check cache or cached error
            if (!definitions?.error) {
              // Only fetch if not already a known error
              // Fetch needed
              // console.log(`Draw ID: ${drawID} - Fetching definitions for mask ${mask}.`);
              const fetchPromise = (async () => {
                try {
                  const screenDef = await this.fetchScreenDef(mask, authObj);
                  if (!screenDef) throw new Error(`Failed screenDef`);
                  const entityTypes = this.extractEntityTypes(screenDef);
                  if (!entityTypes?.btString?.length) throw new Error(`No entity types`);
                  const btModels = await this.getBT20Models(mask, entityTypes.btString, authObj);
                  const attachDefs = await this.getAttachDef(mask, entityTypes.btString, authObj);
                  const transformedDef = this.transformDefintion(screenDef, attachDefs);
                  if (!transformedDef) throw new Error(`Failed transform`);
                  const result = { transformedDef, error: null };
                  this.saveToSessionStorage(defCacheKey, result, true); // Cache success
                  return result;
                } catch (error) {
                  console.error(`Draw ID: ${drawID} - Definition fetch/process error for mask ${mask}:`, error);
                  const errorResult = { error: error.message || "Definition fetch failed" };
                  // Cache error state briefly? Or just handle locally? Let's handle locally for now.
                  // this.saveToSessionStorage(defCacheKey, errorResult, true);
                  return errorResult; // Return error state
                } finally {
                  definitionsPromiseCache.delete(mask); // Remove promise once resolved/rejected
                }
              })();
              definitionsPromiseCache.set(mask, fetchPromise); // Store promise for others to await
              definitions = await fetchPromise;
            } else {
              // Definition error was found in session storage
              definitionError = true;
            }
          }
          // else: Definitions were found in session storage
        }

        // Check final definition state
        if (!definitions || definitions.error) {
          definitionError = true;
          console.warn(`Draw ID: ${drawID} - Definition error for ${spanUniqueId}: ${definitions?.error || "Unknown"}`);
          container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
          container.title = definitions?.error || `Definition error for ${mask}`;
          // Finalize spans immediately with error state
          spans.forEach((s) => {
            if (s && s.hasAttribute(processingAttr)) {
              s.setAttribute(processedAttr, "true"); // Mark processed (with error)
              s.removeAttribute(processingAttr);
            }
          });
          return; // Stop processing this group
        }

        // --- 2. Get Attachments ---
        let attachmentResults = null;
        let attachmentError = false;
        const attachmentCacheKey = this.generateCacheKey(`attachments_${spanUniqueId}`, authObj);

        if (attachmentsPromiseCache.has(spanUniqueId)) {
          // Fetch already in progress for this specific mask-ref
          // console.log(`Draw ID: ${drawID} - Awaiting existing attachments promise for ${spanUniqueId}.`);
          attachmentResults = await attachmentsPromiseCache.get(spanUniqueId);
        } else {
          // Check session storage
          attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);
          if (attachmentResults === null || attachmentResults?.error) {
            // Check cache or cached error
            if (!attachmentResults?.error) {
              // Only fetch if not already a known error
              // Fetch needed
              // console.log(`Draw ID: ${drawID} - Fetching attachments for ${spanUniqueId}.`);
              const fetchPromise = (async () => {
                try {
                  const maskObj = { mask: mask, itemID: ref };
                  const results = await this.getAttachments(definitions.transformedDef, mask, maskObj);
                  this.saveToSessionStorage(attachmentCacheKey, results || null, true); // Cache result or null
                  return results || null; // Return null if API returns nothing meaningful
                } catch (fetchError) {
                  console.error(`Draw ID: ${drawID} - Attachment fetch error for ${spanUniqueId}:`, fetchError);
                  const errorResult = { error: fetchError.message || "Attachment fetch failed" };
                  this.saveToSessionStorage(attachmentCacheKey, errorResult, true); // Cache error state
                  return errorResult; // Return error state
                } finally {
                  attachmentsPromiseCache.delete(spanUniqueId); // Remove promise once done
                }
              })();
              attachmentsPromiseCache.set(spanUniqueId, fetchPromise);
              attachmentResults = await fetchPromise;
            } else {
              // Attachment error was found in session storage
              attachmentError = true;
            }
          }
          // else: Attachments were found in session storage
        }

        // Check final attachment state
        if (attachmentResults?.error) {
          attachmentError = true;
          console.warn(`Draw ID: ${drawID} - Attachment error for ${spanUniqueId}: ${attachmentResults.error}`);
          container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
          container.title = attachmentResults.error;
        }

        // --- 3. Update Container UI ---
        // This section runs once the attachment data (or error) is resolved
        let documentCount = 0;
        let documentData = [];

        if (!attachmentError && attachmentResults && Array.isArray(attachmentResults)) {
          documentData = attachmentResults.reduce((allDocs, result) => {
            if (result?.attachments && Array.isArray(result.attachments)) {
              return [...allDocs, ...result.attachments];
            }
            return allDocs;
          }, []);
          documentCount = documentData.length;
        }

        // Re-find container - DOM might have changed during awaits
        container = document.getElementById(`doc-container-${spanUniqueId}`);
        if (!container) {
          console.warn(`Draw ID: ${drawID} - Container ${spanUniqueId} missing during final update.`);
          // Spans were marked processing, need to clear that if container is gone?
          spans.forEach((s) => {
            if (s) s.removeAttribute(processingAttr);
          });
          return; // Can't update
        }

        if (attachmentError) {
          // Error already set above
        } else if (documentCount > 0) {
          container.innerHTML = this.getSvgForType("paperclip", this.ICON_DIMENSIONS);
          container.style.cursor = "pointer";
          container.title = `${documentCount} document(s) for ${ref}`;
          // Add click listener (should only happen once as container persists)
          // Check if listener already exists based on a class or attribute? Simpler: just add, modern browsers handle duplicates okay.
          // Or remove previous listeners if needed, but harder. Let's assume adding is okay.
          container.onclick = (e) => {
            // Use onclick for simplicity here, or manage event listeners more carefully if needed
            e.preventDefault();
            e.stopPropagation();
            console.log(`Clicked paperclip icon for mask=${mask}, ref=${ref}`);
            this.openMessage(documentData, ref);
          };
        } else {
          // No attachments or null result
          container.innerHTML = "";
          container.title = `No attachments for ${ref}`;
          container.style.cursor = "default";
          container.onclick = null; // Remove listener if no attachments
        }

        // --- 4. Finalize Associated Spans ---
        spans.forEach((s) => {
          if (s && document.body.contains(s) && s.hasAttribute(processingAttr)) {
            s.setAttribute(processedAttr, "true");
            s.removeAttribute(processingAttr);
          }
        });
        // console.log(`Draw ID: ${drawID} - Finalized processing for group ${spanUniqueId}`);
      } catch (error) {
        console.error(
          `Draw ID: ${drawID} - Unhandled error in handleMaskRefGroupProcessing for ${spanUniqueId}:`,
          error
        );
        // Attempt to update container to error state as fallback
        container = document.getElementById(`doc-container-${spanUniqueId}`);
        if (container) {
          container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
          container.title = `Processing error for ${ref}`;
        }
        // Ensure flags are cleaned up on associated spans
        spans.forEach((s) => {
          if (s && s.hasAttribute(processingAttr)) {
            s.setAttribute(processedAttr, "true"); // Mark processed (with error)
            s.removeAttribute(processingAttr);
          }
        });
      }
    }

    // *** NEW FUNCTION (Replaces processSpansByMask) ***
    async processSpansInOrder(spansToProcess, authObj) {
      console.log(`Draw ID: ${this.drawID} - Starting processSpansInOrder for ${spansToProcess.length} spans.`);

      // Local cache for definitions during this batch run (avoids repeated session storage checks within the loop)
      const definitionsCache = new Map();
      // Set to track mask-refs for which attachment fetch is *in progress* within this batch
      const fetchingAttachments = new Set();

      for (const span of spansToProcess) {
        // Ensure span is still valid
        if (!span || !document.body.contains(span)) {
          console.warn(`Draw ID: ${this.drawID} - Span no longer in DOM, skipping.`);
          continue;
        }

        const mask = span.getAttribute("data-mask");
        const ref = span.getAttribute("data-ref");

        if (!mask || !ref) {
          console.warn(`Draw ID: ${this.drawID} - Span missing data-mask or data-ref, skipping.`);
          continue;
        }

        const spanUniqueId = `${mask}-${ref}`; // ID for container and attachment cache
        const processedAttr = `data-processed-${this.drawID}`;
        const processingAttr = `data-processing-${this.drawID}`;

        // --- 1. Check Existing State & Insert Clock ---
        let container = document.getElementById(`doc-container-${spanUniqueId}`);
        let needsUpdate = false; // Flag if we need to run the update logic for this container

        if (container) {
          // Container exists. Is the *current* span already marked?
          if (span.hasAttribute(processedAttr) || span.hasAttribute(processingAttr)) {
            // console.log(`Draw ID: ${this.drawID} - Span ${span.outerHTML} for ${spanUniqueId} already processed/processing, skipping.`);
            continue; // Skip this specific span, but others might need the container updated
          } else {
            // Container exists from another span, but this span needs processing flags set.
            // Mark this span as processing, it will be updated later when the container is.
            span.setAttribute(processingAttr, "true");
            needsUpdate = true; // Ensure the container update logic runs later
            // console.log(`Draw ID: ${this.drawID} - Container for ${spanUniqueId} exists, marking span ${span.outerHTML} for processing.`);
          }
        } else {
          // Container does NOT exist, create it and insert clock
          // console.log(`Draw ID: ${this.drawID} - Creating container and clock for ${spanUniqueId}`);
          span.setAttribute(processingAttr, "true"); // Mark this span as initiating processing

          container = document.createElement("span");
          container.style.display = "inline-block";
          container.style.minWidth = this.ICON_DIMENSIONS;
          container.style.minHeight = this.ICON_DIMENSIONS;
          container.style.width = this.ICON_DIMENSIONS
          container.style.height = this.ICON_DIMENSIONS
          container.style.verticalAlign = "middle";
          container.id = `doc-container-${spanUniqueId}`;
          container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);
          container.title = `Loading attachments for ${ref}...`;

          // Insert container (using existing placement logic)
          const rect = span.getBoundingClientRect();
          const hasZeroDimensions = rect.width === 0 || rect.height === 0;
          if (hasZeroDimensions) {
            let targetParent = span.parentElement;
            if (targetParent && (targetParent.tagName === "TD" || targetParent.tagName === "TH")) {
              targetParent.appendChild(container);
            } else {
              span.parentNode.insertBefore(container, span.nextSibling);
            }
          } else {
            span.parentNode.insertBefore(container, span.nextSibling);
          }
          needsUpdate = true; // Container was just created, needs update logic
        }

        // --- 2. Ensure Definitions are Available ---
        let definitions = definitionsCache.get(mask);
        let definitionError = false;

        if (!definitions) {
          // Check session storage first
          const defCacheKey = this.generateCacheKey(`screen_defs_${mask}`, authObj);
          definitions = this.getFromSessionStorage(defCacheKey, true);

          if (!definitions) {
            // Not in session storage, fetch them
            console.log(
              `Draw ID: ${this.drawID} - Fetching definitions for mask ${mask} (triggered by ${spanUniqueId}).`
            );
            try {
              const screenDef = await this.fetchScreenDef(mask, authObj);
              if (!screenDef) throw new Error(`Failed to get screen definition for mask ${mask}.`);

              const entityTypes = this.extractEntityTypes(screenDef);
              const btModels = await this.getBT20Models(mask, entityTypes.btString, authObj);
              const attachDefs = await this.getAttachDef(mask, entityTypes.btString, authObj);
              const transformedDef = this.transformDefintion(screenDef, attachDefs);

              definitions = { screenDef, entityTypes, btModels, attachDefs, transformedDef, error: null }; // Add error flag
              this.saveToSessionStorage(defCacheKey, definitions, true); // Cache successful fetch
              definitionsCache.set(mask, definitions); // Cache locally for this batch
              console.log(`Draw ID: ${this.drawID} - Successfully fetched and cached definitions for ${mask}.`);
            } catch (error) {
              console.error(`Draw ID: ${this.drawID} - Error fetching definitions for mask ${mask}:`, error);
              definitions = { error: error.message || "Failed to fetch definitions" }; // Store error state
              // Don't save error state to session storage? Or maybe save it briefly?
              // Let's cache the error locally for this batch run only.
              definitionsCache.set(mask, definitions);
              definitionError = true;
            }
          } else {
            // Found in session storage, cache locally for this batch
            definitionsCache.set(mask, definitions);
            if (definitions.error) {
              // Check if cached definitions indicate a past error
              definitionError = true;
            }
            // console.log(`Draw ID: ${this.drawID} - Using cached definitions for ${mask}.`);
          }
        } else if (definitions.error) {
          // Already known error from local cache
          definitionError = true;
        }

        // If definitions failed, update container to error and skip attachment fetch
        if (definitionError) {
          console.warn(
            `Draw ID: ${this.drawID} - Cannot process attachments for ${spanUniqueId} due to definition error for mask ${mask}.`
          );
          if (container) {
            container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
            container.title = `Error loading definition for ${mask}`;
          }
          // Mark this span as processed (with error)
          span.setAttribute(processedAttr, "true");
          span.removeAttribute(processingAttr);
          continue; // Move to the next span
        }

        // --- 3. Fetch Attachments (if needed and not already fetching) ---
        const attachmentCacheKey = this.generateCacheKey(`attachments_${mask}_${ref}`, this.authObj);
        let attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);
        let attachmentFetchInitiated = false;

        // Fetch only if: Not cached AND not currently being fetched by another concurrent iteration for the same mask-ref
        if (attachmentResults === null && !fetchingAttachments.has(spanUniqueId)) {
          fetchingAttachments.add(spanUniqueId); // Mark as fetch initiated
          attachmentFetchInitiated = true;
          console.log(`Draw ID: ${this.drawID} - Initiating attachment fetch for ${spanUniqueId}.`);
          try {
            const maskObj = { mask: mask, itemID: ref };
            // ---vvv--- ACTUAL /attachments/ HTTP REQUESTS HAPPEN HERE ---vvv---
            attachmentResults = await this.getAttachments(definitions.transformedDef, mask, maskObj);
            // ---^^^--- END OF /attachments/ REQUESTS ---^^^---

            if (attachmentResults) {
              const totalCount = attachmentResults.reduce(
                (count, result) => count + (result?.attachments?.length || 0),
                0
              );
              console.log(`Draw ID: ${this.drawID} - Fetched ${totalCount} attachments for ${spanUniqueId}. Caching.`);
              this.saveToSessionStorage(attachmentCacheKey, attachmentResults, true);
            } else {
              console.log(`Draw ID: ${this.drawID} - No attachment results fetched for ${spanUniqueId}. Caching null.`);
              this.saveToSessionStorage(attachmentCacheKey, null, false); // Cache the null result
              attachmentResults = null; // Ensure it's null locally
            }
          } catch (fetchError) {
            console.error(`Draw ID: ${this.drawID} - Error fetching attachments for ${spanUniqueId}:`, fetchError);
            attachmentResults = { error: fetchError.message || "Failed to fetch attachments" }; // Store error state
            // Cache the error state so we don't retry immediately
            this.saveToSessionStorage(attachmentCacheKey, attachmentResults, true);
          } finally {
            fetchingAttachments.delete(spanUniqueId); // Remove from fetching set
          }
        }

        // --- 4. Update Icon Container (only if needed) ---
        // Update if container was just created OR if fetch just completed
        if (needsUpdate || attachmentFetchInitiated) {
          // Retrieve latest attachment results again in case a concurrent fetch finished
          if (attachmentFetchInitiated) {
            attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);
          }

          console.log(`Draw ID: ${this.drawID} - Updating container for ${spanUniqueId}.`);
          let documentCount = 0;
          let documentData = [];
          let attachmentError = false;

          if (attachmentResults && attachmentResults.error) {
            attachmentError = true;
            console.warn(
              `Draw ID: ${this.drawID} - Attachment fetch for ${spanUniqueId} resulted in error: ${attachmentResults.error}`
            );
          } else if (attachmentResults && Array.isArray(attachmentResults)) {
            documentData = attachmentResults.reduce((allDocs, result) => {
              if (result && result.attachments && Array.isArray(result.attachments)) {
                return [...allDocs, ...result.attachments];
              }
              return allDocs;
            }, []);
            documentCount = documentData.length;
          } // Handles null case correctly (count stays 0)

          if (container) {
            // Check container still exists
            if (attachmentError) {
              container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
              container.title = `Error loading attachments for ${ref}`;
            } else if (documentCount > 0) {
              // Create paperclip icon
              const iconElement = document.createElement("span");
              iconElement.innerHTML = this.getSvgForType("paperclip", this.ICON_DIMENSIONS);
              iconElement.style.cursor = "pointer";
              iconElement.style.display = "inline-block";
              iconElement.style.verticalAlign = "middle";
              iconElement.title = `${documentCount} document(s) for ${ref}`;
              // Add click handler - check if one already exists to prevent duplicates
              if (!container.querySelector(".lucide-paperclip")) {
                // Only add listener if paperclip not already there
                iconElement.addEventListener("click", (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`Clicked paperclip icon for mask=${mask}, ref=${ref}`);
                  this.openMessage(documentData, ref);
                });
                container.innerHTML = "";
                container.appendChild(iconElement);
              } else {
                // Paperclip already exists, maybe just update title?
                container.title = `${documentCount} document(s) for ${ref}`;
              }
            } else {
              // No attachments, clear the container
              container.innerHTML = "";
              container.title = `No attachments for ${ref}`;
            }
          } else {
            console.warn(`Draw ID: ${this.drawID} - Container ${spanUniqueId} disappeared before update.`);
          }

          // --- 5. Update ALL Spans Associated with this Container ---
          // Find all spans that *should* be using this container and mark them processed
          const allSpansForContainer = document.querySelectorAll(
            `span[data-name="${this.SPAN_NAME}"][data-mask="${mask}"][data-ref="${ref}"]`
          );
          allSpansForContainer.forEach((s) => {
            if (s && s.hasAttribute(processingAttr)) {
              // Only update those marked as processing
              s.setAttribute(processedAttr, "true");
              s.removeAttribute(processingAttr);
            }
          });
          console.log(
            `Draw ID: ${this.drawID} - Marked ${allSpansForContainer.length} spans as processed for ${spanUniqueId}.`
          );
        } // End if(needsUpdate || attachmentFetchInitiated)
      } // End for...of spansToProcess loop

      console.log(`Draw ID: ${this.drawID} - Finished processSpansInOrder.`);
    }

    /**
     * Process spans by mask - fetching definitions, inserting clocks,
     * then fetching attachments and updating icons.
     */
    async processSpansByMask(spansToProcess, masks, authObj) {
      // --- Phase 0: Fetch Definitions (Same as before) ---
      const definitionsMap = new Map();
      for (const mask of masks) {
        try {
          if (!mask) {
            console.warn(`Draw ID: ${this.drawID} - Skipping null/empty mask in definitions fetch`);
            continue;
          }
          const cacheKey = this.generateCacheKey(`screen_defs_${mask}`, authObj);
          let definitions = this.getFromSessionStorage(cacheKey, true);
          if (!definitions) {
            console.log(`Draw ID: ${this.drawID} - Fetching definitions for mask ${mask}.`);
            const screenDef = await this.fetchScreenDef(mask, authObj);
            if (!screenDef) {
              console.error(`Draw ID: ${this.drawID} - Failed to get screen definition for mask ${mask}.`);
              continue;
            }
            const entityTypes = this.extractEntityTypes(screenDef);
            const btModels = await this.getBT20Models(mask, entityTypes.btString, authObj);
            const attachDefs = await this.getAttachDef(mask, entityTypes.btString, authObj);
            const transformedDef = this.transformDefintion(screenDef, attachDefs);
            definitions = { screenDef, entityTypes, btModels, attachDefs, transformedDef };
            this.saveToSessionStorage(cacheKey, definitions, true);
          } else {
            console.log(`Draw ID: ${this.drawID} - Using cached definitions for mask ${mask}.`);
          }
          definitionsMap.set(mask, definitions);
        } catch (error) {
          console.error(`Error fetching definitions for mask ${mask}:`, error);
          // If definitions fail, we can't process spans for this mask
        }
      }

      // Group spans by mask and ref (Same as before)
      const spansByMaskAndRef = new Map();
      for (const span of spansToProcess) {
        const mask = span.getAttribute("data-mask");
        const ref = span.getAttribute("data-ref");
        if (!mask || !ref) continue;
        const key = `${mask}-${ref}`; // Unique key for mask-ref pair
        if (!spansByMaskAndRef.has(key)) {
          spansByMaskAndRef.set(key, { mask, ref, spans: [] });
        }
        spansByMaskAndRef.get(key).spans.push(span);
      }

      // --- Phase 1: Insert Clocks ---
      console.log(
        `Draw ID: ${this.drawID} - Starting Phase 1: Inserting clocks for ${spansByMaskAndRef.size} mask-ref groups.`
      );
      for (const [key, { mask, ref, spans }] of spansByMaskAndRef.entries()) {
        const spanUniqueId = key; // Use the map key as the unique ID for the container

        // Check if definitions are available for this mask before proceeding
        if (!definitionsMap.has(mask)) {
          console.warn(
            `Draw ID: ${this.drawID} - No definitions found for mask ${mask}, skipping clock insertion for ${key}`
          );
          continue;
        }

        for (const span of spans) {
          // Make sure span is still in the DOM
          if (!span || !document.body.contains(span)) continue;

          const processedAttr = `data-processed-${this.drawID}`;
          const processingAttr = `data-processing-${this.drawID}`;

          // Skip if already fully processed or currently being processed by THIS logic flow
          if (span.hasAttribute(processedAttr) || span.hasAttribute(processingAttr)) {
            continue;
          }

          // Check if a container ALREADY exists for this mask-ref pair (might happen if processed partially before)
          let container = document.getElementById(`doc-container-${spanUniqueId}`);

          if (!container) {
            // Mark as starting processing (clock insertion phase)
            span.setAttribute(processingAttr, "true");

            // Create container & clock
            container = document.createElement("span");
            container.style.display = "inline-block";
            container.style.minWidth = this.ICON_DIMENSIONS;
            container.style.minHeight = this.ICON_DIMENSIONS;
            container.style.width = this.ICON_DIMENSIONS
          container.style.height = this.ICON_DIMENSIONS
            container.style.verticalAlign = "middle"; // Align icon nicely
            container.id = `doc-container-${spanUniqueId}`;
            container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);
            container.title = `Loading attachments for ${ref}...`; // Add title

            // Insert container into DOM (using your existing placement logic)
            const rect = span.getBoundingClientRect();
            const hasZeroDimensions = rect.width === 0 || rect.height === 0;
            if (hasZeroDimensions) {
              let targetParent = span.parentElement;
              if (targetParent && (targetParent.tagName === "TD" || targetParent.tagName === "TH")) {
                targetParent.appendChild(container);
              } else {
                span.parentNode.insertBefore(container, span.nextSibling);
              }
            } else {
              span.parentNode.insertBefore(container, span.nextSibling);
            }
            // console.log(`Draw ID: ${this.drawID} - Inserted clock for ${spanUniqueId}`); // Keep log concise
          } else {
            // If container exists, ensure the processing flag is set on the span
            if (!span.hasAttribute(processingAttr)) {
              span.setAttribute(processingAttr, "true");
            }
            // console.log(`Draw ID: ${this.drawID} - Container already exists for ${spanUniqueId}, ensuring processing flag.`);
          }
        }
      }
      console.log(`Draw ID: ${this.drawID} - Finished Phase 1: Clock insertion.`);

      // --- Phase 2: Fetch Attachments and Update Icons ---
      console.log(`Draw ID: ${this.drawID} - Starting Phase 2: Fetching attachments and updating icons.`);
      for (const [key, { mask, ref, spans }] of spansByMaskAndRef.entries()) {
        const spanUniqueId = key;
        try {
          const definitions = definitionsMap.get(mask);

          // Skip if definitions failed earlier
          if (!definitions || !definitions.transformedDef) {
            console.warn(
              `Draw ID: ${this.drawID} - No definitions for mask ${mask}, cannot fetch/update for ${key}. Clearing processing flags.`
            );
            // Clean up processing flags for spans in this group
            spans.forEach((span) => {
              if (span && span.hasAttribute(`data-processing-${this.drawID}`)) {
                span.removeAttribute(`data-processing-${this.drawID}`);
                // Optionally remove the clock container or add an error icon here
                const container = document.getElementById(`doc-container-${spanUniqueId}`);
                if (container) container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS); // Indicate definition error
              }
            });
            continue; // Move to the next mask-ref group
          }

          // Check cache for attachment results
          const attachmentCacheKey = this.generateCacheKey(`attachments_${mask}_${ref}`, this.authObj);
          let attachmentResults = this.getFromSessionStorage(attachmentCacheKey, true);
          let fetchedThisTime = false;

          // *** Fetch attachments ONLY if not cached ***
          if (attachmentResults === null || attachmentResults === undefined) {
            // Explicit check for null/undefined needed if you cache non-JSON null
            const maskObj = { mask: mask, itemID: ref };
            console.log(`Draw ID: ${this.drawID} - Fetching attachments for ${key} (Not Cached).`);

            // ---vvv--- ACTUAL /attachments/ HTTP REQUESTS HAPPEN HERE ---vvv---
            attachmentResults = await this.getAttachments(definitions.transformedDef, mask, maskObj);
            // ---^^^--- END OF /attachments/ REQUESTS ---^^^---
            fetchedThisTime = true;

            if (attachmentResults) {
              const totalAttachments = attachmentResults.reduce((count, result) => {
                if (result && result.attachments && Array.isArray(result.attachments)) {
                  return count + result.attachments.length;
                } else if (result && Array.isArray(result)) {
                  // Adjust if getAttachments returns array directly
                  // return count + result.length;
                }
                return count;
              }, 0);
              console.log(`Draw ID: ${this.drawID} - Retrieved ${totalAttachments} attachments for ${key}. Caching.`);
              this.saveToSessionStorage(attachmentCacheKey, attachmentResults, true); // Cache successful fetch
            } else {
              console.log(`Draw ID: ${this.drawID} - No attachment results fetched for ${key}. Caching null.`);
              // Cache null to indicate fetch attempt failed or returned nothing, prevent re-fetching immediately
              this.saveToSessionStorage(attachmentCacheKey, null, false); // Store literal null
              attachmentResults = null; // Ensure it's null for the update logic
            }
          } else {
            console.log(`Draw ID: ${this.drawID} - Using cached attachment data for ${key}.`);
          }

          // *** Update the containers for all spans associated with this mask-ref ***
          let documentCount = 0;
          let documentData = [];
          // Recalculate count based on fetched or cached data
          if (attachmentResults && Array.isArray(attachmentResults)) {
            documentData = attachmentResults.reduce((allDocs, result) => {
              if (result && result.attachments && Array.isArray(result.attachments)) {
                return [...allDocs, ...result.attachments];
              } else if (result && Array.isArray(result)) {
                // return [...allDocs, ...result];
              }
              return allDocs;
            }, []);
            documentCount = documentData.length;
          }

          // Find the container (should exist from Phase 1)
          const container = document.getElementById(`doc-container-${spanUniqueId}`);

          if (!container) {
            console.warn(
              `Draw ID: ${this.drawID} - Container 'doc-container-${spanUniqueId}' missing during update phase for ${key}.`
            );
            // Clean up flags on associated spans if container is missing
            spans.forEach((span) => {
              if (span) {
                span.removeAttribute(`data-processing-${this.drawID}`);
                span.removeAttribute(`data-processed-${this.drawID}`); // Remove processed flag too if container gone
              }
            });
            continue; // Skip update if container is gone
          }

          // Update the single container for this mask-ref
          console.log(
            `Draw ID: ${this.drawID} - Updating container ${container.id} with ${documentCount} attachments.`
          );
          if (documentCount > 0) {
            // Create paperclip icon element
            const iconElement = document.createElement("span");
            iconElement.innerHTML = this.getSvgForType("paperclip", this.ICON_DIMENSIONS);
            iconElement.style.cursor = "pointer";
            iconElement.style.display = "inline-block";
            iconElement.style.verticalAlign = "middle";
            iconElement.title = `${documentCount} document(s) for ${ref}`;
            // Add click handler (only once per container)
            iconElement.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log(`Clicked paperclip icon for mask=${mask}, ref=${ref}`);
              this.openMessage(documentData, ref); // Use potentially updated documentData
            });
            // Replace clock with paperclip
            container.innerHTML = ""; // Clear clock
            container.appendChild(iconElement);
            container.title = `${documentCount} document(s) for ${ref}`; // Update title
          } else {
            // No attachments, clear the clock
            container.innerHTML = "";
            container.title = `No attachments for ${ref}`; // Update title
          }

          // Mark all associated spans as fully processed and remove processing flag
          spans.forEach((span) => {
            if (span && document.body.contains(span)) {
              // Check if span still exists
              const processedAttr = `data-processed-${this.drawID}`;
              const processingAttr = `data-processing-${this.drawID}`;
              span.setAttribute(processedAttr, "true");
              span.removeAttribute(processingAttr);
            }
          });
        } catch (error) {
          console.error(`Draw ID: ${this.drawID} - Error during attachment fetch or update for ${key}:`, error);
          // Handle errors - update the container to show an error
          const container = document.getElementById(`doc-container-${spanUniqueId}`);
          if (container) {
            container.innerHTML = this.getSvgForType("error", this.ICON_DIMENSIONS);
            container.title = `Error loading attachments for ${ref}`;
          }
          // Mark associated spans as processed (to avoid loops) and clear processing flag
          spans.forEach((span) => {
            if (span && document.body.contains(span)) {
              const processedAttr = `data-processed-${this.drawID}`;
              const processingAttr = `data-processing-${this.drawID}`;
              span.setAttribute(processedAttr, "true"); // Mark processed even on error
              span.removeAttribute(processingAttr);
            }
          });
        }
      }

      console.log(`Draw ID: ${this.drawID} - Finished Phase 2: Attachments fetched/updated.`);
      // console.log(`Draw ID: ${this.drawID} - Completed processing batch.`); // Final log
    }

    /**
     * Helper method to escape HTML content to prevent XSS vulnerabilities
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
     * Enhanced check to determine if an element is truly visible:
     * - Not hidden by parent styles (display:none, visibility:hidden)
     * - On an active Cognos page (if applicable)
     * - Within the current browser viewport
     */
    isElementVisibleInCognosPage(element) {
      if (!element) return false;

      // 1. Basic DOM check: Is it even connected?
      if (!document.body.contains(element)) {
        return false;
      }

      // 2. Check if element is actually part of a visible page
      let parent = element;
      let foundViewerPage = false;
      let isOnVisiblePage = false;

      // Traverse up to find if the element is within a viewer page and if that page is visible
      while (parent) {
        if (parent.classList && parent.classList.contains("clsViewerPage")) {
          foundViewerPage = true;
          const style = window.getComputedStyle(parent);
          if (style.display === "block") {
            isOnVisiblePage = true;
          }
          break; // Stop at first viewer page ancestor
        }
        parent = parent.parentElement;
      }

      // If it's inside a viewer page, it must be on a visible one
      if (foundViewerPage && !isOnVisiblePage) {
        return false;
      }

      // 3. Check visibility based on CSS and offsetParent
      if (element.offsetParent === null) {
        return false;
      }

      // 4. Check explicit parent styles
      parent = element.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        // Check standard CSS hiding
        if (style.display === "none" || style.visibility === "hidden") {
          return false; // Hidden by an ancestor
        }
        parent = parent.parentElement;
      }

      // 5. Check if the element is within the viewport
      return this.isElementInViewport(element);
    }

    /**
     * Determines if an element is in the viewport (Helper function - check if still accurate)
     * Consider how it handles zero-dimension spans.
     */
    isElementInViewport(element) {
      if (!element) return false;

      // Get the element's bounding rectangle
      let rect = element.getBoundingClientRect();

      // If the element has no size (like our empty spans initially),
      // check its parent TD/TR or a more relevant container instead.
      // Checking the immediate parent might be enough if it's the TD.
      if (rect.width === 0 || rect.height === 0) {
        const parentElement = element.parentElement; // Typically the TD
        if (parentElement) {
          rect = parentElement.getBoundingClientRect();
          // If parent is *also* 0x0, then it's truly not visible/rendered yet
          if (rect.width === 0 || rect.height === 0) {
            // console.log(`Span ${element.dataset.mask}-${element.dataset.ref} and parent have zero dimensions`);
            return false;
          }
        } else {
          // No parent? Definitely not visible.
          // console.log(`Span ${element.dataset.mask}-${element.dataset.ref} has zero dimensions and no parent`);
          return false;
        }
      }

      // If dimensions are still zero after checking parent, consider it not visible
      if (rect.width === 0 || rect.height === 0) {
        // console.log(`Span ${element.dataset.mask}-${element.dataset.ref} resolved to zero dimensions`);
        return false;
      }

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // Generous buffers allow loading slightly off-screen
      const verticalBuffer = 150; // Increased buffer slightly
      const horizontalBuffer = 50;

      // Check if *any part* of the element bounding box is within the viewport + buffer
      const vertInView = rect.bottom > 0 - verticalBuffer && rect.top < windowHeight + verticalBuffer;
      const horzInView = rect.right > 0 - horizontalBuffer && rect.left < windowWidth + horizontalBuffer;

      // console.log(`Span ${element.dataset.mask}-${element.dataset.ref} viewport check: rect=${JSON.stringify(rect)}, vert=${vertInView}, horz=${horzInView}`);

      return vertInView && horzInView;
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
        // console.log("No child data sources with attachments");
      } else {
        // console.log("Children data retrieved for:", childrenData.map((child) => child.entityType).join(", "));
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

            //console.log(`Fetching attachments for root entity with item:`, rootItem);

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
            // console.log(`No items found for child entity: ${childResult.entityType}`);
            continue;
          }

          // Find the corresponding data source
          const childDS = entityTransform.dataSources.find((ds) => ds.entityType === childResult.entityType);

          if (!childDS || !childDS.attachment) {
            // console.log(`No attachment definition for child entity: ${childResult.entityType}`);
            continue;
          }

          // Process each item in the child data
          for (const childItem of childResult.data.items) {
            try {
              // URL for attachments
              const url = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.mainUrl}/${childDS.entityType}/attachments/`;

              // Referrer URL
              const refUrl = `${this.AppUrl}/${this.authObj.environment}${this.URL_LOOKUP.attachUrls.referrerUrl}${fetchObj.path}`;

              //   console.log(`Fetching attachments for child entity ${childResult.entityType} with item:`, childItem);

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
        case "not found":
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus-icon lucide-minus"><path d="M5 12h14"/></svg>`;
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
              console.log("ok");
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

      // Disconnect the document-wide observer
      if (this.documentObserver) {
        this.documentObserver.disconnect();
        this.documentObserver = null;
      }

      if (this.mutationProcessTimeout) {
        clearTimeout(this.mutationProcessTimeout);
      }

      // Disconnect all page-specific observers
      if (this.pageObservers && this.pageObservers.size > 0) {
        console.log(`Draw ID: ${this.drawID} - Disconnecting ${this.pageObservers.size} page observers.`);
        this.pageObservers.forEach((observer, page) => {
          observer.disconnect();
        });
        this.pageObservers.clear();
      }

      if (this.mutationProcessTimeout) {
        clearTimeout(this.mutationProcessTimeout);
      }

      // Disconnect IntersectionObserver
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect();
        this.intersectionObserver = null;
        console.log(`Draw ID: ${this.drawID} - Disconnected IntersectionObserver.`);
      }

      this.viewerPageObserversInitialized = false;

      // Clear cache if needed
      this.clearCache();

      // Clear references
      this.oControl = null;
      this.authObj = null;
    }
  }

  return AdvancedControl;
});
// 20250411 260