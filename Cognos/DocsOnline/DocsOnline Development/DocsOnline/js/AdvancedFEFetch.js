class FetchTest {
  static ALL_MASKS = {
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

  static BASE_APP_URL = "https://cppfosapp.fdn.cpp.edu";
  static BASE_JOB_URL = "https://cppfosjob.fdn.cpp.edu";
  static ENVIRONMENT = "Production";

  static URL_LOOKUP = {
    screenDef: {
      mainUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/api/finance/screendef/`,
      referrerUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/ui/uiscreens/`,
    },
    bt20models: {
      mainUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/api/finance/legacy/workflow/GetBT20Models`,
      referrerUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/ui/uiscreens/`,
    },
    attachDef: {
      mainUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/api/finance/legacy/documents/attachDefinitions`,
      referrerUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/ui/uiscreens/`,
    },
    detailUrls: {
      mainUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/data/finance/legacy/`,
      params: ["$filter=", "&$orderby=", "&$skip=0", "&$top=20"],
      referrerUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/ui/uiscreens/`,
    },
    attachUrls: {
      mainUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/api/finance/legacy/documents`,
      referrerUrl: `${this.BASE_APP_URL}/${this.ENVIRONMENT}-UI/ui/uiscreens/`,
    },
  };

  /**
   * Finds the mask object corresponding to the provided mask string.
   * @param {string} maskString - The mask string to find.
   * @returns {object|null} The mask object with properties, or null if not found.
   */
  static findMaskObject(maskString) {
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
  static joinUrlParts(...parts) {
    return parts.map((part) => part.replace(/\/+$/, "")).join("/") + "/";
  }

  /**
   * Builds a URL using a base, environment, and path.
   * @param {string} base - The base URL.
   * @param {string} environment - The environment string.
   * @param {string} path - The path to append.
   * @returns {string} The constructed URL.
   */
  static buildUrl(base, environment, path) {
    return new URL(`${environment}-UI/api/finance/${path}`, base).toString();
  }

  /**
   * Fetches the screen definition for a given mask string.
   * @param {string} maskString - The mask string used to locate the fetch configuration.
   * @returns {Promise<object|null>} The JSON response from the API, or null on error.
   */
  static async fetchScreenDef(maskString) {
    const fetchObj = this.findMaskObject(maskString);
    if (!fetchObj) {
      console.error("Invalid mask:", maskString);
      return;
    }

    // Construct URLs using the helper function
    const url = this.joinUrlParts(this.URL_LOOKUP.screenDef.mainUrl, fetchObj.path);
    const refUrl = this.joinUrlParts(this.URL_LOOKUP.screenDef.referrerUrl, fetchObj.path);

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

  /**
   * Fetches BT20 models for a given mask string.
   * @param {string} maskString - The mask string used for the fetch configuration.
   * @returns {Promise<object|null>} The JSON response from the API, or null on error.
   */
  static async getBT20Models(maskString, btModels) {
    const btModelObject = {
      dataObjects: btModels.map((item) => ({ progID: item })),
    };
    const fetchObj = this.findMaskObject(maskString);
    if (!fetchObj) {
      console.error("Invalid mask:", maskString);
      return;
    }

    // The main URL is already provided; build the referrer URL using the helper function.
    const url = this.URL_LOOKUP.bt20models.mainUrl;
    const refUrl = this.joinUrlParts(this.URL_LOOKUP.bt20models.referrerUrl, fetchObj.path, fetchObj.mask);

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
  static async getAttachDef(maskString, btModels) {
    const fetchObj = this.findMaskObject(maskString);
    if (!fetchObj) {
      console.error("Invalid mask:", maskString);
      return;
    }
    const url = this.URL_LOOKUP.attachDef.mainUrl;
    const refUrl = this.joinUrlParts(this.URL_LOOKUP.attachDef.referrerUrl, fetchObj.path, fetchObj.mask);
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
   * Extracts an array of entityType values from the dataSources array in the given config object.
   * @param {Object} config - The configuration object containing a dataSources array.
   * @returns {string[]} An array of entityType strings.
   */
  static extractEntityTypes(config) {
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

  static transformDefintion(data, attachmentDefinitions = []) {
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
  /*
  itemID looks like this: {
          mask: "APOHBTUB",
          module: "accountspayable",
          name:"batchId",
          itemID: "RE031665",
        },
  */
  static async getRootDetailData(entityTransform, maskName, itemIDInput) {
    // Find the root entity data source from the transformed data
    const dataSourceObj = entityTransform.dataSources.find((ds) => ds.isRootEntity === true);

    if (!dataSourceObj) {
      console.error("No root entity data source found in the transform");
      return null;
    }

    // Get the appropriate fetch configuration
    const fetchObj = this.findMaskObject(maskName);
    if (!fetchObj) {
      console.error("Invalid mask:", maskName);
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
        const maskObj = this.ALL_MASKS.masks.find((mask) => mask.mask === maskName);
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
    const url = `${this.URL_LOOKUP.detailUrls.mainUrl}/${entityType}?${filterParam}${orderByParam}&$skip=0&$top=20`;

    // Construct referrer URL
    const refUrl = `${this.URL_LOOKUP.detailUrls.referrerUrl}/${fetchObj.path}`;

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
          mask: maskName,
          pragma: "no-cache",
          priority: "u=1, i",
          runtimemask: maskName,
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
   * This makes a similar request like getRootDetailData but it makes it for the other tables in the entityTransform with isRootColumn = false and match the tables in the attachment definitions.
   */
  static async getChildrenInfo(entityTransform, maskName, parentResult) {
    // Find the fetch configuration
    const fetchObj = this.findMaskObject(maskName);
    if (!fetchObj) {
      console.error("Invalid mask:", maskName);
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
        const url = `${this.URL_LOOKUP.detailUrls.mainUrl}/${entityType}?${filterParam}${orderByParam}&$skip=0&$top=100`;

        // Construct referrer URL
        const refUrl = `${this.URL_LOOKUP.detailUrls.referrerUrl}/${fetchObj.path}`;

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
              mask: maskName,
              pragma: "no-cache",
              priority: "u=1, i",
              runtimemask: maskName,
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

  static getAttachment() {
    fetch(`https://cppfosapp.fdn.cpp.edu/Production-UI/api/finance/legacy/documents/${maskName}/attachments/`, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        glledger: "GL",
        jlledger: "--",
        mask: "POUPPR",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      referrer: `https://cppfosapp.fdn.cpp.edu/Production-UI/ui/uiscreens/${maskPath}/${maskName}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: data,
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
  }
  static async getAttachments(entityTransform, maskString, maskObj) {
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
          const url = `${this.URL_LOOKUP.attachUrls.mainUrl}/${rootEntity.entityType}/attachments/`;

          // Referrer URL
          const refUrl = `${this.URL_LOOKUP.attachUrls.referrerUrl}${fetchObj.path}`;

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
            const url = `${this.URL_LOOKUP.attachUrls.mainUrl}/${maskString}/attachments/`;

            // Referrer URL
            const refUrl = `${this.URL_LOOKUP.attachUrls.referrerUrl}/${fetchObj.path}/${maskString}`;

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

  static async main() {
    try {
      const maskString = this.TEST_MASK;
      const data = await this.fetchScreenDef(maskString);
      console.log(data);

      const modelsArray = this.extractEntityTypes(data);

      // getBT20Models now returns an array of @object values
      const btObjectValues = await this.getBT20Models(maskString, modelsArray.btString);
      const uniqueModels = [...new Set([...btObjectValues, ...modelsArray.btString])];

      // Passing the combined set of btObjectValues and btString to getAttachDef
      const attachDef = await this.getAttachDef(maskString, uniqueModels);

      const entityTransform = this.transformDefintion(data, attachDef);

      console.log("Entity Types:", modelsArray, btObjectValues, attachDef, entityTransform);

      const childData = this.getAttachments(entityTransform, maskString, this.TEST_ID);
    } catch (error) {
      console.error("Error in main:", error);
    }
  }
  static TEST_MASK = "FAUPAS";
  static TEST_ID = this.findMaskObject(this.TEST_MASK);
}
FetchTest.main();
