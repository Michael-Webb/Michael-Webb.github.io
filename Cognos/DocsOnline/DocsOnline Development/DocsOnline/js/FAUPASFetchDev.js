define(() => {
  "use strict";

  class AdvancedControl {
    /*
     * Initialize the control. This method is optional. If this method is implemented, fnDoneInitializing must be called when done initializing, or a Promise must be returned.
     * Parameters: oControlHost, fnDoneInitializing
     * Returns: (Type: Promise) An optional promise that will be waited on instead fo calling fnDoneInitializing(). Since Version 6
     *
     */

    MASK_TYPES = {
      masks: [
        {
          name: "FAUPAS",
          urlPath: "fixedassets",
          idTable: "FAIdnt",
          idColumn: "Faid",
        },
        {
          name: "PEUPPE",
          urlPath: "personentity",
          idTable: "PENameMaster",
          idColumn: "PeId",
        },
      ],
    };

    initialize(oControlHost, fnDoneInitializing) {
      try {
        this.oControl = oControlHost;
        const {
          ["App Server Url"]: AppUrl,
          ["Job Server Url"]: JobUrl,
          ["Modal Label"]: ModalLabel,
          ["Icon Dimensions"]: ICON_DIMENSIONS,
          ["Mask Name"]: MASK_NAME,
          ["Font Size"]: FONT_SIZE,
          ["Lazy Loading"]: IS_LAZY_LOADED,
          ["scrolltimeout"]: SCROLL_TIMEOUT,
          ["Direct Url"]: URL_TYPE,
        } = this.oControl.configuration;

        // Check each configuration parameter and collect the missing ones
        const missingParams = [];
        if (!AppUrl) missingParams.push("App Server Url");
        if (!JobUrl) missingParams.push("Job Server Url");
        if (!MASK_NAME) missingParams.push("Mask Name");

        // If any parameters are missing, throw scriptableReportError
        if (missingParams.length > 0) {
          throw new scriptableReportError(
            "AdvancedControl",
            "initialize",
            `Missing required configuration parameters: ${missingParams.join(", ")}`
          );
        }

        // Continue with normal initialization if no errors
        this.AppUrl = this.removeTrailingSlash(AppUrl);
        this.JobUrl = this.removeTrailingSlash(JobUrl);
        this.ModalLabel = ModalLabel || "Asset Documents:";
        this.IS_LAZY_LOADED = IS_LAZY_LOADED !== false;
        this.MASK_NAME = MASK_NAME;
        this.ICON_DIMENSIONS = ICON_DIMENSIONS || "16px";
        this.FONT_SIZE = FONT_SIZE || "1em";
        this.SCROLL_TIMEOUT = SCROLL_TIMEOUT || 200;
        this.URL_TYPE = URL_TYPE;
        // Initialize cache with version tracking
        const cacheVersion = "1.0"; // Update this when making breaking changes to cached data format
        const storedVersion = sessionStorage.getItem("cache_version");

        if (storedVersion !== cacheVersion) {
          // If versions don't match, clear any existing cache
          this.clearCache();
          // Update stored version
          sessionStorage.setItem("cache_version", cacheVersion);
        }

        fnDoneInitializing();
      } catch (error) {
        // Handle the error by displaying it appropriately
        console.error("Error during control initialization:", error);

        // Always call fnDoneInitializing to prevent the control from hanging
        // fnDoneInitializing();
      }
    }

    /*
     *Draw the control. This method is optional if the control has no UI.
     */
    draw(oControlHost) {
      try {
        //   console.log("Drawing Started - FAUPAS CC");
        this.oControl = oControlHost;

        // Check each configuration parameter and collect the missing ones
        const missingParams = [];
        if (!this.AppUrl) missingParams.push("App Server Url");
        if (!this.JobUrl) missingParams.push("Job Server Url");
        if (!this.MASK_NAME) missingParams.push("Mask Name");

        // If any parameters are missing, log specific error and return
        if (missingParams.length > 0) {
          let description = `Missing required configuration parameters: ${missingParams.join(", ")}`;
          throw new scriptableReportError("AdvancedControl", "draw", description);
        }

        // Extract credentials from the DOM
        const { sessionID, token, authObj } = this.extractCredentials();
        this.authObj = authObj; // Add this line

        if (!sessionID || !token) {
          console.error("Failed to extract sessionID or token, cannot authenticate");
          return;
        }

        // First authenticate
        this.authenticate(authObj)
          .then((authObj) => {
            // Store the token if needed for later use
            this.apiToken = authObj.apiToken;

            // Find all spans with data-ref attribute
            const assetSpans = document.querySelectorAll("span[data-ref]");

            if (assetSpans.length > 0) {
              // console.log(`Found ${assetSpans.length} asset reference spans to process`);

              // Process the spans to add document buttons
              if (!this.IS_LAZY_LOADED) {
                return this.processAssetDocuments(assetSpans);
              }
              return this.initializeVisibleAssetLoading();
            } else {
              // console.log("No asset reference spans found on page");
            }
          })
          .catch((error) => {
            console.error("Authentication failed, cannot process assets:", error);
          });
      } catch (error) {
        // Log the error for debugging
        console.error("Error during control drawing:", error);
        //   console.log("Drawing Complete - FAUPAS CC");
      }
    }

    /**
     * Gets the specific URL path segment for a given mask name based on MASK_TYPES.
     * @param {string} maskName - The mask name (e.g., "FAUPAS", "PEUPPE").
     * @returns {object} The corresponding screen object from MASK_TYPES
     */
    _getMaskDetails(maskName) {
      const maskConfig = this.MASK_TYPES.masks.find((mask) => mask.name === maskName);
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
    // Utility method to remove trailing slashes from URLs
    removeTrailingSlash(url) {
      if (url && typeof url === "string" && url.endsWith("/")) {
        return url.slice(0, -1);
      }
      return url;
    }
    // Add these methods to your AdvancedControl class
    // Update these methods in your AdvancedControl class
    initializeVisibleAssetLoading() {
      // Keep track of processed spans
      this.processedSpanIds = new Set();
      this.processingInProgress = false;

      // Add scroll event listener for lazy loading - listen on document, not window
      this.scrollHandler = () => {
        console.log("Scroll event detected"); // Debug log
        if (this.apiToken && !this.processingInProgress) {
          this.processVisibleAssets();
        }
      };

      // Throttle the scroll handler with a shorter delay
      this.throttledScrollHandler = this.throttle(this.scrollHandler, this.SCROLL_TIMEOUT);

      // Add event listeners to multiple elements to catch all scroll events
      document.addEventListener("scroll", this.throttledScrollHandler, { passive: true });
      window.addEventListener("scroll", this.throttledScrollHandler, { passive: true });

      // Try to find the main Cognos content container and add listener
      const cognosContent = document.querySelector(".clsViewerPage, .viewerPage, #mainViewerContainer");
      if (cognosContent) {
        cognosContent.addEventListener("scroll", this.throttledScrollHandler, { passive: true });
        console.log("Added scroll listener to Cognos container");
      }

      // Also check on other events that might change visibility
      window.addEventListener("resize", this.throttledScrollHandler, { passive: true });

      // Force a check periodically in case scroll events are missing
      this.intervalCheck = setInterval(() => {
        if (this.apiToken && !this.processingInProgress) {
          // console.log("Interval check triggered");
          this.processVisibleAssets();
        }
      }, 2000);

      // Initial processing of visible assets
      setTimeout(() => this.processVisibleAssets(), 100);
    }

    // Add this throttle method to your AdvancedControl class
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

    escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    // Process a single asset span
    async processAssetSpan(span) {
      const assetID = span.getAttribute("data-ref");

      // Mark as processed immediately to prevent duplicate processing
      this.processedSpanIds.add(assetID);

      // Create container
      let container = document.getElementById(`doc-container-${assetID}`);
      if (!container) {
        container = document.createElement("span");
        container.id = `doc-container-${assetID}`;
        span.parentNode.insertBefore(container, span.nextSibling);
      } else {
        container.innerHTML = "";
      }

      // Show loading indicator
      container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);

      try {
        const assetItem = await this.fetchAssetDetails(assetID);
        const data = await this.fetchAttachments(assetItem);

        container.innerHTML = "";
        if (data && data.length > 0) {
          this.createDocumentButton(container, data, assetID);
        }
      } catch (error) {
        console.error("Error processing asset ID", assetID, error);
        container.innerHTML = "";
      }
    }

    // Improved visibility check with more tolerance
    isElementVisible(element) {
      if (!element) return false;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // More generous buffer (500px) to ensure we catch elements
      return (
        rect.top >= -500 && rect.bottom <= windowHeight + 500 && rect.left >= -100 && rect.right <= windowWidth + 100
      );
    }

    // Process assets as they become visible, with per-asset tracking
    async processVisibleAssets() {
      try {
        // Get all asset spans
        const allSpans = document.querySelectorAll("span[data-ref]");

        // Filter for visible spans that aren't processed or currently being processed
        const visibleSpans = Array.from(allSpans).filter((span) => {
          const assetID = span.getAttribute("data-ref");
          const isVisible = this.isElementVisible(span);
          const isProcessed = this.processedSpanIds.has(assetID);
          const isProcessing = span.hasAttribute("data-processing");

          return isVisible && !isProcessed && !isProcessing;
        });

        if (visibleSpans.length === 0) {
          return;
        }

        console.log(`Processing ${visibleSpans.length} newly visible assets`);

        // Process each visible span independently
        visibleSpans.forEach(async (span) => {
          const assetID = span.getAttribute("data-ref");

          // Mark this span as currently being processed
          span.setAttribute("data-processing", "true");

          try {
            await this.processAssetSpan(span);
          } catch (error) {
            console.error(`Error processing asset ${assetID}:`, error);
          } finally {
            // Remove the processing flag when done
            span.removeAttribute("data-processing");
          }
        });
      } catch (error) {
        console.error("Error in processVisibleAssets:", error);
      }
    }

    // Clean up in the destroy method - must clean up all listeners
    destroy(oControlHost) {
      this.oControl = oControlHost;

      // Remove event listeners
      if (this.throttledScrollHandler) {
        document.removeEventListener("scroll", this.throttledScrollHandler);
        window.removeEventListener("scroll", this.throttledScrollHandler);

        const cognosContent = document.querySelector(".clsViewerPage, .viewerPage, #mainViewerContainer");
        if (cognosContent) {
          cognosContent.removeEventListener("scroll", this.throttledScrollHandler);
        }
      }

      if (this.intervalCheck) {
        clearInterval(this.intervalCheck);
      }

      window.removeEventListener("resize", this.throttledScrollHandler);

      // Clear the cache when control is destroyed
      // This keeps memory usage efficient and ensures fresh data on next load
      this.clearCache();
    }

    // Method to extract credentials from the DOM
    // Method to extract credentials from the DOM
    extractCredentials() {
      try {
        const firstSpan = document.querySelector(`span[data-id^="documentsOnline-"]`);

        if (!firstSpan) {
          // If the span itself isn't found, log and throw an error
          const errorMsg =
            "Authentication span [data-id^='documentsOnline-'] not found in the DOM. Cannot extract credentials.";
          console.error(errorMsg);
          // Throwing here will stop execution in the calling 'draw' method's try block
          throw new Error(errorMsg);
          // Original code returned empty strings, but throwing is better for mandatory data
          // return { sessionID: "", token: "", authObj: null };
        }

        // Extract potential values
        const sessionID = firstSpan.getAttribute("data-sessionId");
        const token = firstSpan.getAttribute("data-token");
        const environment = firstSpan.getAttribute("data-environment");
        const user = firstSpan.getAttribute("data-user");

        // --- Start: Added Validation ---
        const missingAttrs = [];
        // Check if each essential attribute has a non-empty value
        if (!sessionID) {
          // Checks for null, undefined, empty string ""
          missingAttrs.push("data-sessionId");
        }
        if (!token) {
          missingAttrs.push("data-token");
        }
        if (!environment) {
          missingAttrs.push("data-environment");
        }
        if (!user) {
          // Assuming user is also essential for operations or logging
          missingAttrs.push("data-user");
        }

        // If any essential attributes are missing or empty, log and throw an error
        if (missingAttrs.length > 0) {
          const errorMsg = `Authentication span found, but missing or empty required attributes: ${missingAttrs.join(
            ", "
          )}. Cannot proceed with authentication.`;
          console.error(errorMsg);
          // Throw an error to be caught by the 'draw' method's try...catch
          throw new scriptableReportError("AdvancedControl", "extractCredentials", errorMsg);
        }
        // --- End: Added Validation ---

        // If validation passed, construct the auth object
        const authObj = {
          sessionId: sessionID, // Use the validated non-empty values
          token: token,
          environment: environment,
          user: user,
          // These rely on 'initialize' having run successfully
          appBaseURL: this.AppUrl,
          jobBaseURL: this.JobUrl,
        };

        // Log successful extraction only after validation
        console.log("Successfully extracted credentials:", authObj);

        // Return the necessary values (sessionID/token are slightly redundant
        // as they are in authObj, but kept for consistency with original call site)
        return { sessionID, token, authObj };
      } catch (error) {
        // Catch errors thrown above OR any unexpected errors during DOM access/attribute getting
        console.error("Error during credential extraction:", error.message);
        // Re-throw the error so the calling 'draw' method's catch block handles it
        // This ensures 'draw' knows extraction failed and won't proceed.
        throw error;
        // We don't return here because an error occurred.
      }
    }

    // Function to generate SVG for specific file type and size
    getSvgForType(fileType, size) {
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
        default:
          return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
      }
    }
    getViewerUrl(docToken, directUrl, urlType) {
      let url = `${this.AppUrl}/${this.authObj.environment}-UI/ui/Documents/viewer?docToken=${docToken}`;

      if (!urlType) {
        url = directUrl;
      }

      return url;
    }
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
          title: `${this.ModalLabel} ${assetID}`,
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
          callbackScope: { ok: this, cancel: this },
        };
        //console.log(dialogObject.message);

        // Create a simpler dialog first to test
        this.oControl.page.application.GlassContext.getCoreSvc(".Dialog").createDialog(dialogObject);
      } catch (error) {
        console.error("Error showing dialog:", error);
        alert(`Error showing document dialog: ${error.message}`);
      }
    }

    // Function to fetch the FAUPAS screen to capture cookies
    async fetchFromScreen() {
      // Get the dynamic URL path based on the configured MASK_NAME
      const screenDetails = this._getMaskDetails(this.MASK_NAME);
      const screenUrl = `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.name}`;
      // console.log(`fetchFromScreen: Fetching screen URL: ${screenUrl}`); // Debug log

      try {
        const response = await fetch(screenUrl, {
          headers: {
            priority: "u=0, i",
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
          mode: "no-cors",
          credentials: "include",
        });
        // console.log("FAUPAS fetch complete:", response);
        return response;
      } catch (error) {
        console.error("Error during FAUPAS fetch:", error);
        throw error;
      }
    }
    // Function to fetch API token
    async fetchScreenDefinitions() {
      // Get the dynamic URL path based on the configured MASK_NAME
      const screenDetails = this._getMaskDetails(this.MASK_NAME);
      const screenUrl = `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.name}`;
      try {
        const screenDef = await fetch(screenUrl, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            glledger: "--",
            jlledger: "--",
            mask: "FAUPAS",
            runtimemask: "FAUPAS",
          },
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!screenDef.ok) {
          throw new Error("Screen Definition fetch failed: " + screenDef.status);
        }

        const screenDefData = await screenDef.json();
        if (!screenDef) {
          throw new Error("No screen definition in response");
        }

        console.log("Screen definition obtained:", screenDefData);
        return screenDefData.apiToken;
      } catch (error) {
        console.error("Error fetching screen definition:", error);
        throw error;
      }
    }

    // Function to fetch API token
    async fetchApiToken() {
      try {
        const tokenResponse = await fetch(
          `${this.JobUrl}/${this.authObj.environment}/api/user/apiToken?sessionId=${this.authObj.sessionId}&authToken=${this.authObj.token}`,
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
    // Function to validate security token
    async validateSecurityToken() {
      try {
        const validationResponse = await fetch(
          `${this.JobUrl}/${this.authObj.environment}/api/User/ValidateSecurityToken`,
          {
            headers: {
              accept: "*/*",
              "accept-language": "en-US,en;q=0.9",
              "content-type": "application/x-www-form-urlencoded",
              Authorization: "Bearer " + this.authObj.apiToken,
            },
            referrer: this.AppUrl,
            referrerPolicy: "strict-origin-when-cross-origin",
            body:
              "sessionId=" +
              this.authObj.sessionId +
              "&authToken=" +
              this.authObj.token +
              "&claims=NameIdentifier&claims=Name&claims=GivenName&claims=Surname",
            method: "POST",
            mode: "cors",
            credentials: "omit",
          }
        );

        if (!validationResponse.ok) {
          throw new Error("Token validation failed: " + validationResponse.status);
        }

        console.log("Token validated for sessionID:", this.authObj.sessionId);
        return validationResponse;
      } catch (error) {
        console.error("Error validating token:", error);
        throw error;
      }
    }
    async getSessionExpiration() {
      try {
        const response = await fetch(`${this.JobUrl}/${this.authObj.environment}/api/user/getsessionexpiration`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            Authorization: "FEBearer " + this.authObj.apiToken,
            "cache-control": "no-cache",
          },
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to get session expiration: ${response.status}`);
        }

        const data = await response.json();
        console.log("Session expiration data:", data);
        return data;
      } catch (error) {
        console.error("Error getting session expiration:", error);
        throw error;
      }
    }

    // Main authentication function that calls the above functions in sequence
    async authenticate(authObj) {
      try {
        const auth = this.authObj || authObj;

        // Step 1: Fetch FAUPAS screen to capture cookies
        await this.fetchFromScreen();

        // Step 2: Fetch API token
        const apiToken = await this.fetchApiToken();
        this.authObj.apiToken = apiToken;
        // Step 3: Validate security token
        await this.validateSecurityToken();
        // Step 4: Get Session Expiration and log it
        // await this.getSessionExpiration(authObj);

        return this.authObj; // Return the API token for future use
      } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
      }
    }

    // Function to fetch asset details
    async fetchAssetDetails(objectId) {
      // Check cache first
      const cacheKey = `asset_${this.MASK_NAME}_${objectId}`; // Include MASK_NAME in key
      const cachedAsset = this.getCachedValue(cacheKey);

      const maskDetails = this._getMaskDetails(this.MASK_NAME);
      const attachUrl = `${this.AppUrl}/${this.authObj.environment}-UI/data/finance/legacy/${maskDetails.idTable}?$filter=(${maskDetails.idColumn}%20eq%20%27${objectId}%27%20)&$orderby=Ledger,${maskDetails.idColumn}&$skip=0&$top=20`;

      if (cachedAsset) {
        console.log(`Using cached asset details for ID ${objectId}`);
        return cachedAsset;
      }

      // If not in cache, fetch from server
      const assetResponse = await fetch(attachUrl, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          mask: this.MASK_NAME,
        },
        referrer: `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${maskDetails.urlPath}/${maskDetails.name}`,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        credentials: "include",
      });

      if (!assetResponse.ok) {
        throw new Error(`Failed to fetch asset details for ID ${objectId}: ${assetResponse.status}`);
      }

      const assetData = await assetResponse.json();

      if (!assetData || !assetData.items || assetData.items.length === 0) {
        throw new Error(`No asset data found for ID ${objectId}`);
      }

      // Cache the result before returning
      this.setCachedValue(cacheKey, assetData.items[0]);

      // Return the first asset item
      return assetData.items[0];
    }

    // Updated fetchAttachments function with caching
    async fetchAttachments(itemObj) {
      const maskDetails = this._getMaskDetails(this.MASK_NAME);

      // Create a cache key based on a stable identifier from the asset
      const cacheKey = `attach_${itemObj[maskDetails.idColumn]}_${itemObj.Ledger}`;
      const cachedAttachments = this.getCachedValue(cacheKey);

      const attachUrl = `${this.AppUrl}/${this.authObj.environment}-UI/api/finance/legacy/documents/${maskDetails.idTable}/attachments`;

      if (cachedAttachments) {
        console.log(`Using cached attachments for asset ${itemObj[maskDetails.idColumn]}`);
        return cachedAttachments;
      }

      const attachmentResponse = await fetch(attachUrl, {
        method: "POST",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          glledger: "GL",
          jlledger: "--",
          mask: this.MASK_NAME,
          runtimemask: this.MASK_NAME,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        body: JSON.stringify(itemObj),
        mode: "cors",
        credentials: "include",
        "Access-Control-Allow-Credentials": "*",
      });

      if (!attachmentResponse.ok) {
        throw new Error(`Failed to fetch attachment for asset: ${attachmentResponse.status}`);
      }

      const attachments = await attachmentResponse.json();

      // Cache the results before returning
      this.setCachedValue(cacheKey, attachments);

      return attachments;
    }

    // Also update fetchAttachmentCount with caching if needed
    async fetchAttachmentCount(assetItem) {
      try {
        // Create a cache key for the count
        const cacheKey = `count_${assetItem.Faid}_${assetItem.Ledger}`;
        const cachedCount = this.getCachedValue(cacheKey);

        const maskDetails = this._getMaskDetails(this.MASK_NAME);

        if (cachedCount !== null) {
          console.log(`Using cached attachment count for asset ${assetItem.Faid}`);
          return cachedCount;
        }

        const countResponse = await fetch(
          `${this.AppUrl}/${this.authObj.environment}-UI/api/finance/legacy/documents/${maskDetails.idTable}/getattachmentcount/`,
          {
            method: "POST",
            headers: {
              accept: "application/json, text/plain, */*",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "no-cache",
              "content-type": "application/json",
              glledger: "GL",
              jlledger: "--",
              mask: this.MASK_NAME,
            },
            body: JSON.stringify(assetItem),
            mode: "cors",
            credentials: "include",
          }
        );

        if (!countResponse.ok) {
          throw new Error(`Failed to fetch attachment count: ${countResponse.status}`);
        }

        const count = await countResponse.json();

        // Cache the count
        this.setCachedValue(cacheKey, count || 0);

        return count || 0;
      } catch (error) {
        console.error("Error fetching attachment count:", error);
        return 0;
      }
    }

    // Add these methods to your AdvancedControl class

    // Method to get a cached value from sessionStorage
    getCachedValue(key) {
      try {
        const cachedData = sessionStorage.getItem(key);
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        return null;
      } catch (error) {
        console.error("Error retrieving cached value:", error);
        return null;
      }
    }

    // Method to set a value in sessionStorage cache
    setCachedValue(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error("Error setting cached value:", error);
        // Handle quota exceeded or other storage errors
        try {
          // If storage is full, clear older items
          this.clearOldestCacheItems(5);
          // Try again
          sessionStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.error("Failed to store in cache even after cleanup:", e);
        }
      }
    }

    // Helper method to clear oldest cache items if storage is full
    clearOldestCacheItems(count = 5) {
      try {
        // Get all keys that match our cache pattern
        const cacheKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key.startsWith("asset_") || key.startsWith("attach_")) {
            cacheKeys.push(key);
          }
        }

        // Sort by timestamp if we store timestamps, or just take first few
        cacheKeys.sort();

        // Remove the oldest entries
        for (let i = 0; i < Math.min(count, cacheKeys.length); i++) {
          sessionStorage.removeItem(cacheKeys[i]);
        }
      } catch (error) {
        console.error("Error clearing cache items:", error);
      }
    }
    // Method to clear all cached data
    clearCache() {
      try {
        // Remove only our specific cache items to avoid clearing other app data
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key.startsWith("asset_") || key.startsWith("attach_") || key.startsWith("count_")) {
            sessionStorage.removeItem(key);
          }
        }
        console.log("Cache cleared successfully");
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }

    // Function to create document button
    createDocumentButton(container, documents, assetID) {
      const self = this;
      const button = document.createElement("button");
      button.innerHTML = this.getSvgForType("paperclip", this.ICON_DIMENSIONS);
      button.style.border = "none";
      button.style.background = "none";
      button.style.cursor = "pointer";
      button.style.padding = "0";
      button.title = `${documents.length} document${documents.length > 1 ? "s" : ""}`;

      button.setAttribute("data-documents", JSON.stringify(documents));

      button.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const btnDocuments = JSON.parse(this.getAttribute("data-documents"));
          self.openMessage(btnDocuments, assetID);
        } catch (error) {
          console.error("Error showing modal:", error);
          alert("There was an error displaying the documents.");
        }
        return false;
      };

      container.appendChild(button);
      //   console.log("Button added for asset ID:", assetID);
    }

    // Function to process asset spans and fetch document attachments
    async processAssetDocuments(spans) {
      // Create an array of promises for each span
      const fetchPromises = Array.from(spans).map((span) => {
        const assetID = span.getAttribute("data-ref");
        // console.log("Processing asset ID:", assetID);

        // Create or retrieve a container span to display the icon
        let container = document.getElementById(assetID);
        if (!container) {
          container = document.createElement("span");
          container.id = assetID;
          span.parentNode.insertBefore(container, span.nextSibling);
        } else {
          container.innerHTML = "";
        }

        // Insert clock SVG as a loading placeholder
        container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);

        // Return a promise for this spans processing
        return this.fetchAssetDetails(assetID)
          .then((assetItem) => this.fetchAttachments(assetItem))
          .then((data) => {
            // Remove the clock SVG placeholder
            container.innerHTML = "";
            if (data && data.length > 0) {
              console.log("Found", data.length, "documents for asset ID:", assetID);
              this.createDocumentButton(container, data, assetID);
            } else {
              console.log("No documents found for asset ID:", assetID);
            }
          })
          .catch((error) => {
            console.error("Error processing asset ID", assetID, error);
            // On error, remove the clock SVG
            container.innerHTML = "";
          });
      });

      // Execute all promises simultaneously (non-blocking)
      try {
        await Promise.all(fetchPromises);
        console.log("All asset document fetches complete");
      } catch (error) {
        console.error("Error in batch processing:", error);
      }
    }

    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    // destroy(oControlHost) {
    //   this.oControl = oControlHost;
    // }
  }

  return AdvancedControl;
});
