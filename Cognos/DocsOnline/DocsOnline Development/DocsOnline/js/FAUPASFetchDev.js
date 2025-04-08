define(() => {
  "use strict";

  /**
   * AdvancedControl class is responsible for fetching and processing asset details,
   * handling authentication, and updating the UI based on asset spans.
   */
  class AdvancedControl {
    MASK_TYPES = {
      masks: [
        {
          maskName: "FAUPAS",
          urlPath: "fixedassets",
          idTable: "FAIdnt",
          idData: "FAIdnt",
          idColumn: "Faid",
          orderBy: "Ledger,Faid",
        },
        {
          maskName: "PEUPPE",
          urlPath: "personentity",
          idTable: "PENameMaster",
          idData: "PENameMaster",
          idColumn: "PeId",
          orderBy: "NameU,PeId",
        },
        {
          maskName: "GLUPKY",
          urlPath: "generalledger",
          idTable: "GLKKeyMaster",
          idData: "GLKKeyMaster",
          idColumn: "Key",
          orderBy: "GR,KEY",
        },
      ],
    };

    /**
     * Initialize the control.
     *
     * @param {object} oControlHost - The host control configuration object.
     * @param {Function} fnDoneInitializing - Callback function that must be called when initialization is complete.
     * @returns {Promise|undefined} Optionally returns a Promise that the system will wait on.
     */
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
          ["Direct Url"]: URL_TYPE,
          ["List Name"]: LIST_NAME,
          ["Debug"]: DEBUG_MODE,
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
        this.URL_TYPE = URL_TYPE;
        this.LIST_NAME = LIST_NAME || "";
        this.DEBUG_MODE = DEBUG_MODE || false;

        let containerName = oControlHost.container.name || oControlHost.container.id
        if (this.DEBUG_MODE) {
          console.log(`DEBUG MODE for ${this.LIST_NAME} AND ${containerName}`,this.DEBUG_MODE);
        }
        // Initialize cache with version tracking
        const cacheVersion = "1.0"; // Update this when making breaking changes to cached data format
        const storedVersion = sessionStorage.getItem("cache_version");

        if (storedVersion !== cacheVersion) {
          // If versions don't match, clear any existing cache
          this.clearCache();
          // Update stored version
          sessionStorage.setItem("cache_version", cacheVersion);
        }

        this.processingInProgress = false; // Initialize state flag

        fnDoneInitializing();
      } catch (error) {
        // Handle the error by displaying it appropriately
        console.error("Error during control initialization:", error);

        // Always call fnDoneInitializing to prevent the control from hanging
        fnDoneInitializing();
      }
    }
    /**
     * Draw the control UI.
     *
     * @param {object} oControlHost - The host control with configuration and element information.
     */
    draw(oControlHost) {
      try {
        this.oControl = oControlHost;
        this.drawID = this.oControl.generateUniqueID(); // *** Get and store drawID ***
        
        if (this.DEBUG_MODE) {
          console.log(`AdvancedControl Instance Drawing: ID=${this.drawID}, Mask=${this.MASK_NAME}`);
        }

        // Check each configuration parameter and collect the missing ones
        const missingParams = [];
        if (!this.AppUrl) missingParams.push("App Server Url");
        if (!this.JobUrl) missingParams.push("Job Server Url");
        if (!this.MASK_NAME) missingParams.push("Mask Name");
        if (!this.LIST_NAME) missingParams.push("List Name");

        // If any parameters are missing, log specific error and return
        if (missingParams.length > 0) {
          let description = `Missing required configuration parameters: ${missingParams.join(", ")}`;
          throw new scriptableReportError("AdvancedControl", "draw", description);
        }

        // Extract credentials from the DOM
        const { sessionID, token, authObj } = this.extractCredentials();
        this.authObj = authObj; // Store the auth object

        if (!sessionID || !token) {
          console.error("Failed to extract sessionID or token, cannot authenticate");
          return;
        }

        // First authenticate
        this.authenticate(authObj)
          .then((authenticatedAuthObj) => {
            this.apiToken = authenticatedAuthObj.apiToken; // Store for later use
            if (this.DEBUG_MODE) {
              console.log(`Authentication successful for Draw ID: ${this.drawID}`);
            }

            if (this.IS_LAZY_LOADED) {
              if (this.DEBUG_MODE) {
                console.log(`Draw ID: ${this.drawID} - Initializing lazy loading.`);
              }
              this.initializeVisibleAssetLoading();
              // In lazy mode, process only the spans visible in the viewport.
              setTimeout(() => this.processVisibleAssetSpans(), 200);
            } else {
              // Non-Lazy Loading: Process all spans from all pages (ignoring viewport)
              const allSpans = this.getAllAssetSpans();
              if (allSpans.length > 0) {
                if (this.DEBUG_MODE) {
                  console.log(`Draw ID: ${this.drawID} - Processing ${allSpans.length} asset spans (Non-Lazy).`);
                }
                this.processAssetDocuments(allSpans);
              } else {
                if (this.DEBUG_MODE) {
                  console.log(`Draw ID: ${this.drawID} - No asset spans found (Non-Lazy).`);
                }
              }
            }
          })
          .catch((error) => {
            console.error(`Draw ID: ${this.drawID} - Authentication or initial processing failed:`, error);
            this.oControl.element.innerHTML = `<div style="color: red; font-size: 10px;">Auth/Init Error. Check console.</div>`;
          });
      } catch (error) {
        console.error(`Error during control drawing (Draw ID: ${this.drawID}):`, error);
        try {
          this.oControl.element.innerHTML = `<div style="color: red; font-size: 10px;">Draw Error: ${
            error.message || "Unknown"
          }. Check console.</div>`;
        } catch (displayError) {
          console.error("Could not display error in control element:", displayError);
        }
      }
    }

    /**
     * Retrieves mask details for a given mask name.
     *
     * @param {string} maskName - The mask name (e.g., "FAUPAS", "PEUPPE").
     * @returns {object} The corresponding mask configuration object from MASK_TYPES.
     */

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
     * Initializes lazy loading of asset spans by adding scroll, resize, and mutation listeners.
     */
    initializeVisibleAssetLoading() {
      // Ensure only one set of listeners/observers per instance
      if (this.scrollHandler) {
        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Listeners already initialized, skipping.`);
        }

        return;
      }
      if (this.DEBUG_MODE) {
        console.log(`Draw ID: ${this.drawID} - Initializing scroll/interval/mutation listeners.`);
      }

      this.scrollHandler = () => {
        // console.log("Scroll event detected"); // Debug log - can be noisy
        if (this.apiToken && !this.processingInProgress) {
          this.processVisibleAssets();
        }
      };

      this.throttledScrollHandler = this.throttle(this.scrollHandler, 150); // Slightly longer throttle

      // Listen on common scroll containers
      document.addEventListener("scroll", this.throttledScrollHandler, { capture: true, passive: true }); // Capture phase might catch internal Cognos scroll containers
      window.addEventListener("scroll", this.throttledScrollHandler, { passive: true });
      // Potentially add listener to Cognos specific scroll container if identifiable e.g. document.querySelector('#cognosViewerBody')?

      window.addEventListener("resize", this.throttledScrollHandler, { passive: true });

      this.intervalCheck = setInterval(() => {
        if (this.apiToken && !this.processingInProgress) {
          // console.log("Interval check triggered"); // Debug log - can be noisy
          this.processVisibleAssets();
        }
      }, 1500); // Slightly less frequent interval

      // --- MutationObserver Setup ---
      // **Strategy**: Observe a higher-level container that includes all pages, or fallback to body.
      let observerTarget = document.querySelector(".idViewer") || document.body; // Try common Cognos containers first
      if (this.DEBUG_MODE) {
        console.log(`Draw ID: ${this.drawID} - MutationObserver targeting:`, observerTarget);
      }

      const observerOptions = {
        attributes: true, // Enable attribute changes
        attributeFilter: ["style"],
        childList: true, // Watch for addition/removal of nodes (like new page divs)
        subtree: true, // Watch all descendants (including spans within new lists)
      };

      this.mutationObserver = new MutationObserver((mutationsList) => {
        let needsProcessing = false;
        for (const mutation of mutationsList) {
          // Check if nodes were added
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if the added node *is* a target list container OR *contains* one OR *contains* relevant spans directly
                const targetSelector = `[lid="${this.LIST_NAME}"] span[data-ref]`;
                const listSelector = `[lid="${this.LIST_NAME}"]`;

                // Check if the added node itself contains a relevant span, or if it contains a target list which in turn contains spans
                if (
                  node.querySelector(targetSelector) ||
                  (node.matches(listSelector) && node.querySelector("span[data-ref]")) ||
                  node.matches(targetSelector)
                ) {
                  needsProcessing = true;
                  break; // Found a relevant change in this mutation's added nodes
                }
              }
            }
          }
          // Optional: Could also check for attribute changes on .clsViewerPage (like display style) if needed
          // if (mutation.type === 'attributes' && mutation.attributeName === 'style' && mutation.target.matches('.clsViewerPage')) {
          //    needsProcessing = true;
          // }

          if (needsProcessing) break; // Found a relevant change in the overall list of mutations
        }

        if (needsProcessing) {
          if (this.DEBUG_MODE) {
            console.log(
              `Draw ID: ${this.drawID} - MutationObserver detected relevant changes, queueing processVisibleAssets.`
            );
          }

          // Debounce or throttle this call if mutations fire very rapidly
          clearTimeout(this.mutationProcessTimeout);
          this.mutationProcessTimeout = setTimeout(() => {
            if (this.apiToken && !this.processingInProgress) {
              this.processVisibleAssets();
            }
          }, 250); // Short delay to allow DOM to settle
        }
      });

      this.mutationObserver.observe(observerTarget, observerOptions);
      if (this.DEBUG_MODE) {
        console.log(`Draw ID: ${this.drawID} - MutationObserver started.`);
      }

      // Initial processing check (already called in draw method)
      // setTimeout(() => this.processVisibleAssets(), 100);
    }

    /**
     * Creates and returns a throttled version of the given function.
     *
     * @param {Function} func - The function to throttle.
     * @param {number} limit - The minimum time in milliseconds between invocations.
     * @returns {Function} The throttled function.
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
          lastFunc = setTimeout(
            () => {
              if (Date.now() - lastRan >= limit) {
                func.apply(this, args);
                lastRan = Date.now();
              }
            },
            limit - (Date.now() - lastRan)
          );
        }
      };
    }

    /**
     * Escapes HTML special characters to prevent XSS vulnerabilities.
     *
     * @param {string} unsafe - The string that may contain unsafe HTML.
     * @returns {string} The escaped string.
     */
    escapeHtml(unsafe) {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    /**
     * Processes a single asset span element by fetching its attachments and creating a document button.
     *
     * @param {HTMLElement} span - The span element representing an asset.
     * @returns {Promise<void>}
     */
    async processAssetSpan(span) {
      // Make sure span is still in the DOM and valid
      if (!span || !document.body.contains(span)) {
        console.warn(`Draw ID: ${this.drawID} - Span no longer in DOM, skipping processing.`);
        return;
      }

      const assetID = span.getAttribute("data-ref");
      if (!assetID) {
        console.warn(`Draw ID: ${this.drawID} - Span missing data-ref attribute, skipping.`);
        return;
      }

      // Use a unique attribute per instance to mark processing
      const processedAttr = `data-processed-${this.drawID}`;
      const processingAttr = `data-processing-${this.drawID}`;

      // Check if already processed or currently being processed by this instance
      if (span.hasAttribute(processedAttr) || span.hasAttribute(processingAttr)) {
        // console.log(`Span ${assetID} already handled by instance ${this.drawID}, skipping.`);
        return;
      }

      // Check if a button container already exists *immediately* after this span
      // This is a fallback check in case the attribute marking failed or was cleared
      const nextElem = span.nextElementSibling;
      const expectedContainerIdPrefix = `doc-container-for-${this.drawID}-${assetID}`; // More specific prefix
      if (
        nextElem &&
        nextElem.id &&
        nextElem.id.startsWith(expectedContainerIdPrefix) &&
        nextElem.querySelector("button")
      ) {
        if (this.DEBUG_MODE) {
          console.log(
            `Draw ID: ${this.drawID} - Paperclip button container already exists for span ${assetID}, marking as processed and skipping.`
          );
        }
        span.setAttribute(processedAttr, "true"); // Ensure it's marked
        return;
      }

      // Mark this span as currently being processed by this instance
      span.setAttribute(processingAttr, "true");

      // Generate a unique container ID tied to this specific span instance and drawID
      const spanUniqueId =
        span.id || `span-${this.drawID}-${assetID}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!span.id) span.id = spanUniqueId;
      const containerId = `doc-container-for-${spanUniqueId}`; // Use span's unique ID

      let container = document.getElementById(containerId);

      if (!container) {
        if (!span.parentNode) {
          console.error(`Draw ID: ${this.drawID} - No parent node found for span ${assetID}. Cannot add button.`);
          span.removeAttribute(processingAttr); // Clean up processing flag
          return;
        }
        container = document.createElement("span"); // Use span for inline behaviour
        container.id = containerId;
        container.style.marginLeft = "4px"; // Add a little space
        // Insert after the span
        span.parentNode.insertBefore(container, span.nextSibling);
      } else {
        // Clear previous content (like old error messages or spinners)
        container.innerHTML = "";
      }

      // Show loading indicator
      container.innerHTML = this.getSvgForType("clock", this.ICON_DIMENSIONS);

      try {
        const assetItem = await this.fetchAssetDetails(assetID);
        // Check again if span/container still exists after async operation
        if (!document.body.contains(span) || !document.body.contains(container)) {
          console.warn(
            `Draw ID: ${this.drawID} - Span or container removed from DOM during fetch for ${assetID}, aborting.`
          );
          if (container && container.parentNode) container.remove(); // Clean up container if it exists
          span.removeAttribute(processingAttr);
          return;
        }

        const data = await this.fetchAttachments(assetItem);

        container.innerHTML = ""; // Clear spinner
        if (data && data.length > 0) {
          this.createDocumentButton(container, data, assetID);
          span.setAttribute(processedAttr, "true"); // Mark as successfully processed
        } else {
          // No documents found, optionally leave container empty or remove it
          // container.innerHTML = ' <span title="No documents" style="font-size: 0.8em; color: grey;">(-)</span>'; // Example: Indicate no docs
          container.remove(); // Or just remove the container if nothing found
          span.setAttribute(processedAttr, "true"); // Still mark as processed (checked, but no docs)
        }
      } catch (error) {
        console.error(`Error processing asset ID ${assetID} (Instance ${this.drawID}):`, error);
        // Check if container still exists before modifying
        if (document.body.contains(container)) {
          container.innerHTML = this.getSvgForType("error"); // Clear spinner on error
          // container.remove(); // Clean up container on error
        }
        // Do NOT mark as processed on error, allow retry on next visibility check
        // span.setAttribute(processedAttr, "true"); // <-- REMOVE THIS LINE
      } finally {
        // Always remove the 'processing' flag
        if (span) {
          // Check if span still exists
          span.removeAttribute(processingAttr);
        }
      }
    }

    /**
     * Processes visible asset spans within the configured container.
     *
     * @returns {Promise<void>}
     */
    async processVisibleAssets() {
      // Ensure API token is available
      if (!this.apiToken) {
        console.log(`Draw ID: ${this.drawID} - API token not yet available, skipping processVisibleAssets.`);
        return;
      }

      // Prevent concurrent execution
      if (this.processingInProgress) {
        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Processing already in progress, skipping.`);
        }

        return;
      }
      this.processingInProgress = true;
      if (this.DEBUG_MODE) {
        console.log(`Draw ID: ${this.drawID} - Starting processVisibleAssets cycle.`);
      }

      try {
        // *** Step 1: Find ALL potential list containers ***
        const allContainers = document.querySelectorAll(`[lid="${this.LIST_NAME}"]`);

        if (allContainers.length === 0) {
          if (this.DEBUG_MODE) {
            console.log(`Draw ID: ${this.drawID} - No containers with lid="${this.LIST_NAME}" found.`);
          }
          this.processingInProgress = false;
          return;
        }

        // *** Step 2: Filter containers to find the currently VISIBLE ones ***
        // Cognos usually shows only one '.clsViewerPage' at a time.
        const visibleContainers = Array.from(allContainers).filter(
          (container) => this.isElementOrContainerVisible(container) // Use the helper function
        );

        if (visibleContainers.length === 0) {
          if (this.DEBUG_MODE) {
            console.log(`Draw ID: ${this.drawID} - No VISIBLE containers with lid="${this.LIST_NAME}" found.`);
          }

          this.processingInProgress = false;
          return;
        }

        // *** Step 3: Collect all relevant spans from WITHIN the visible containers ***
        let allSpansInVisibleContainers = [];
        visibleContainers.forEach((container) => {
          const spans = container.querySelectorAll("span[data-ref]");
          allSpansInVisibleContainers.push(...spans);
        });

        // *** Step 4: Filter these spans for actual viewport visibility and processing status ***
        const processedAttr = `data-processed-${this.drawID}`;
        const processingAttr = `data-processing-${this.drawID}`;

        const spansToProcess = allSpansInVisibleContainers.filter((span) => {
          const isVisible = this.isElementInViewport(span); // Check if span itself is in viewport
          const isProcessed = span.hasAttribute(processedAttr);
          const isProcessing = span.hasAttribute(processingAttr);
          // Also check if a button container already exists right after it (defensive check)
          const nextElem = span.nextElementSibling;
          const hasExistingButton =
            nextElem &&
            nextElem.id &&
            nextElem.id.startsWith(`doc-container-for-${this.drawID}-${span.getAttribute("data-ref")}`);

          return isVisible && !isProcessed && !isProcessing && !hasExistingButton;
        });

        if (spansToProcess.length === 0) {
          if (this.DEBUG_MODE) {
            console.log(`Draw ID: ${this.drawID} - No new, visible, unprocessed spans found in visible containers.`);
          }
          this.processingInProgress = false;
          return;
        }
        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Found ${spansToProcess.length} new spans to process.`);
        }
        // *** Step 5: Process the filtered spans ***
        // Process in batches or individually. Individual processing is simpler.
        const processingPromises = spansToProcess.map((span) => this.processAssetSpan(span));

        // Wait for all processing in this batch to settle (errors handled within processAssetSpan)
        await Promise.allSettled(processingPromises);

        console.log(`Draw ID: ${this.drawID} - Completed processing batch of ${spansToProcess.length} spans.`);
      } catch (error) {
        console.error(`Error in processVisibleAssets (Instance ${this.drawID}):`, error);
      } finally {
        this.processingInProgress = false; // Release the lock
        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Finished processVisibleAssets cycle.`);
        }
      }
    }

    /**
     * Determines if the given element or its container is visible.
     *
     * @param {HTMLElement} element - The element to check for visibility.
     * @returns {boolean} True if the element and its container are visible; otherwise, false.
     */
    isElementOrContainerVisible(element) {
      if (!element) return false;

      // Check if element itself is hidden
      if (element.offsetParent === null) return false;

      // Check if element has zero dimensions
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      // Check if any parent container is hidden
      // This handles Cognos page visibility where pages might be in the DOM but hidden
      let parent = element.parentElement;
      while (parent) {
        // Check for display:none, visibility:hidden or zero dimensions
        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") {
          return false;
        }

        // Check for specific Cognos page classes that might be hidden
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
     * Determines if an element is in the viewport.
     *
     * @param {HTMLElement} element - The element to check.
     * @returns {boolean} True if the element is in the viewport; otherwise, false.
     */
    isElementInViewport(element) {
      if (!element) return false;

      // Get the element's bounding rectangle.
      let rect = element.getBoundingClientRect();

      // If the element has no size, try to use its parent.
      if (rect.width === 0 || rect.height === 0) {
        if (element.parentElement) {
          rect = element.parentElement.getBoundingClientRect();
        }
      }

      // If after the fallback, the dimensions are still zero, consider it not visible.
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // Generous buffers allow you to trigger processing slightly off-screen.
      const verticalBuffer = 100;
      const horizontalBuffer = 50;

      const isInVerticalViewport = rect.top < windowHeight + verticalBuffer && rect.bottom > 0 - verticalBuffer;
      const isInHorizontalViewport = rect.left < windowWidth + horizontalBuffer && rect.right > 0 - horizontalBuffer;

      return isInVerticalViewport && isInHorizontalViewport;
    }

    /**
     * Extracts authentication credentials from the DOM.
     *
     * @returns {object} An object containing sessionID, token, and authObj.
     * @throws Will throw an error if required credentials are missing.
     */
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

    /**
     * Fetches the FAUPAS screen in order to capture cookies.
     *
     * @returns {Promise<Response>} The fetch response.
     */
    async fetchFromScreen() {
      // Get the dynamic URL path based on the configured MASK_NAME
      const screenDetails = this._getMaskDetails(this.MASK_NAME);
      const screenUrl = `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.maskName}`;
      if (this.DEBUG_MODE) {
        console.log(`fetchFromScreen: Fetching screen URL: ${screenUrl}`); // Debug log
      }
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
        if (this.DEBUG_MODE) {
          console.log("FAUPAS fetch complete:", response);
        }
        return response;
      } catch (error) {
        console.error("Error during FAUPAS fetch:", error);
        throw error;
      }
    }

    /**
     * Fetches screen definitions from the configured screen URL.
     *
     * @returns {Promise<string>} A Promise that resolves to an API token.
     */
    async fetchScreenDefinitions() {
      // Get the dynamic URL path based on the configured MASK_NAME
      const screenDetails = this._getMaskDetails(this.MASK_NAME);
      const screenUrl = `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${screenDetails.urlPath}/${screenDetails.maskName}`;
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

    /**
     * Fetches the API token using the job URL and authentication object.
     *
     * @returns {Promise<string>} A Promise that resolves to the API token string.
     */
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

    /**
     * Validates the security token via a POST request.
     *
     * @returns {Promise<Response>} A Promise that resolves to the response of the validation.
     */
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

    /**
     * Fetches session expiration data from the API.
     *
     * @returns {Promise<object>} A Promise that resolves to the session expiration data.
     */
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
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(`Failed to get session expiration: ${response.status}`);
        }

        const data = await response.json();
        if (this.DEBUG_MODE) {
          console.log("Session expiration data:", data);
        }

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
     * Main authentication sequence that fetches the FAUPAS screen, API token, validates the token,
     * and fetches session expiration.
     *
     * @param {object} authObj - The authentication object extracted from the DOM.
     * @returns {Promise<object>} A Promise that resolves to the authentication object (including API token).
     */
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
        const sessionExpData = await this.getSessionExpiration();
        // Calculate an absolute expiration timestamp (milliseconds since epoch)
        // For example, if expirationIntervalInMinutes is provided:
        this.cacheExpirationTimestamp = Date.now() + sessionExpData.expirationIntervalInMinutes * 60000;
        console.log("Cache expiration timestamp set to:", new Date(this.cacheExpirationTimestamp));

        return this.authObj; // Return the API token for future use
      } catch (error) {
        console.error("Authentication failed:", error);
        throw error;
      }
    }

    /**
     * Fetches the asset details for a given objectId.
     *
     * @param {string} objectId - The ID of the asset.
     * @returns {Promise<object|null>} A Promise that resolves to the asset details object or null.
     * @throws Will throw an error if the required parameters or fetched data are invalid.
     */
    async fetchAssetDetails(objectId) {
      if (!objectId) throw new Error("Asset objectId is required.");
      const maskDetails = this._getMaskDetails(this.MASK_NAME);
      if (!maskDetails.idColumn || !maskDetails.orderBy || !maskDetails.idData) {
        throw new Error(`Invalid mask details for ${this.MASK_NAME}: Missing idColumn, orderBy, or idData.`);
      }

      const cacheKey = `asset_${this.MASK_NAME}_${objectId}`;
      const cachedAsset = this.getCachedValue(cacheKey);
      if (cachedAsset) {
        if (this.DEBUG_MODE) {
          console.log(`Using cached asset details for ID ${objectId}`);
        }
        return cachedAsset;
      }

      // Construct URL safely
      if (!this.AppUrl || !this.authObj || !this.authObj.environment) {
        throw new Error("Cannot fetch asset details: Missing AppUrl or environment info.");
      }
      const filter = encodeURIComponent(`${maskDetails.idColumn} eq '${objectId}'`);
      const orderBy = encodeURIComponent(maskDetails.orderBy);
      // Ensure no double slashes
      const appBase = this.AppUrl.endsWith("/") ? this.AppUrl : this.AppUrl + "/";
      const dataPath = `${this.authObj.environment}-UI/data/finance/legacy/${maskDetails.idData}`;
      const assetUrl = `${appBase}${dataPath}?$filter=${filter}&$orderby=${orderBy}&$skip=0&$top=1`; // Only need top=1

      if (this.DEBUG_MODE) {
        console.log(`Fetching asset details from: ${assetUrl}`);
      }

      try {
        const assetResponse = await fetch(assetUrl, {
          method: "GET",
          credentials: "include", // Send cookies
          body: null,
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json", // Usually not needed for GET, but doesn't hurt
            "Cache-Control": "no-cache", // Ensure fresh data unless caching is intended server-side
            mask: this.MASK_NAME, // Custom header if required by API
            // Add other required headers like 'glledger', 'jlledger' if needed
          },
          // Referrer might be important
          referrer: `${this.AppUrl}/${this.authObj.environment}-UI/ui/uiscreens/${maskDetails.urlPath}/${maskDetails.maskName}`,
          referrerPolicy: "strict-origin-when-cross-origin",
        });

        if (!assetResponse.ok) {
          throw new Error(
            `Failed to fetch asset details for ID ${objectId}: ${assetResponse.status} ${assetResponse.statusText}`
          );
        }

        const assetData = await assetResponse.json();
        if (!assetData || !assetData.items || assetData.items.length === 0) {
          // It's possible an ID exists but has no details; treat as non-critical error or warning
          console.warn(`No asset data found for ID ${objectId}. Returning null.`);
          this.setCachedValue(cacheKey, null); // Cache the null result to avoid refetching
          return null; // Return null instead of throwing error? Depends on requirement.
          // throw new Error(`No asset data found for ID ${objectId}`);
        }

        const assetItem = assetData.items[0];
        this.setCachedValue(cacheKey, assetItem);
        return assetItem;
      } catch (error) {
        console.error(`Error fetching asset details for ${objectId}:`, error);
        throw error; // Re-throw
      }
    }

    /**
     * Fetches attachments for the given asset item with caching.
     *
     * @param {object} itemObj - The asset item object.
     * @returns {Promise<Array>} A Promise that resolves to an array of attachments.
     */
    async fetchAttachments(itemObj) {
      if (!itemObj) {
        console.warn("fetchAttachments called with null itemObj. Skipping.");
        return []; // Return empty array if no item provided
      }

      const maskDetails = this._getMaskDetails(this.MASK_NAME);
      const assetId = itemObj[maskDetails.idColumn]; // Get the ID from the object
      const ledger = itemObj.Ledger || "--"; // Use Ledger if available, default otherwise

      if (!assetId) {
        console.warn("Cannot fetch attachments: Asset ID missing in itemObj.", itemObj);
        return [];
      }
      if (!maskDetails.idTable) {
        throw new Error(`Invalid mask details for ${this.MASK_NAME}: Missing idTable.`);
      }

      // Use a more robust cache key
      const cacheKey = `attach_${this.MASK_NAME}_${assetId}_${ledger}`;
      const cachedAttachments = this.getCachedValue(cacheKey);
      if (cachedAttachments) {
        if (this.DEBUG_MODE) {
          console.log(`Using cached attachments for asset ${assetId}`);
        }
        return cachedAttachments;
      }

      if (!this.AppUrl || !this.authObj || !this.authObj.environment) {
        throw new Error("Cannot fetch attachments: Missing AppUrl or environment info.");
      }
      const appBase = this.AppUrl.endsWith("/") ? this.AppUrl : this.AppUrl + "/";
      const attachPath = `${this.authObj.environment}-UI/api/finance/legacy/documents/${maskDetails.idTable}/attachments`;
      const attachUrl = `${appBase}${attachPath}`;

      if (this.DEBUG_MODE) {
        console.log(`Fetching attachments for asset ${assetId} from: ${attachUrl}`);
      }

      try {
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
          // Provide more context in error
          throw new Error(
            `Failed to fetch attachments for asset ${assetId}: ${attachmentResponse.status} ${attachmentResponse.statusText}`
          );
        }

        const attachments = await attachmentResponse.json();

        // Cache the results (even if empty array)
        this.setCachedValue(cacheKey, attachments || []);

        return attachments || []; // Ensure return is always an array
      } catch (error) {
        console.error(`Error fetching attachments for asset ${assetId}:`, error);
        // Decide whether to re-throw or return empty array on error
        // throw error; // Re-throw to indicate failure in processAssetSpan
        return []; // Or return empty array to prevent breaking the UI loop
      }
    }

    /**
     * Fetches the attachment count for a given asset item with caching.
     *
     * @param {object} assetItem - The asset item object.
     * @returns {Promise<number>} A Promise that resolves to the attachment count.
     */
    async fetchAttachmentCount(assetItem) {
      try {
        // Create a cache key for the count
        const cacheKey = `count_${assetItem.Faid}_${assetItem.Ledger}`;
        const cachedCount = this.getCachedValue(cacheKey);

        const maskDetails = this._getMaskDetails(this.MASK_NAME);

        if (cachedCount !== null) {
          if (this.DEBUG_MODE) {
            console.log(`Using cached attachment count for asset ${assetItem.Faid}`);
          }
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

    /**
     * Retrieves a cached value from sessionStorage if it hasn't expired.
     *
     * @param {string} key - The cache key.
     * @returns {any|null} The cached value or null if missing/expired.
     */
    getCachedValue(key) {
      try {
        const cachedData = sessionStorage.getItem(key);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Check if we have an expiry and whether it has passed
          if (parsedData.expiry && Date.now() > parsedData.expiry) {
            // Cache entry has expired; remove it and return null
            sessionStorage.removeItem(key);
            return null;
          }
          // Otherwise, return the cached value
          return parsedData.value !== undefined ? parsedData.value : parsedData;
        }
        return null;
      } catch (error) {
        console.error(`Error retrieving cached value for key ${key}:`, error);
        return null;
      }
    }

    /**
     * Caches a value in sessionStorage with an expiry timestamp.
     *
     * @param {string} key - The cache key.
     * @param {any} value - The value to be cached.
     */
    setCachedValue(key, value) {
      try {
        // Use the updated cacheExpirationTimestamp if available,
        // Otherwise, fall back to a default expiration (e.g., 30 minutes)
        const defaultExpirationMs = 30 * 60000;
        const expiry = this.cacheExpirationTimestamp || Date.now() + defaultExpirationMs;

        // Store the value with its expiry timestamp
        const dataToStore = { value: value, expiry: expiry };
        sessionStorage.setItem(key, JSON.stringify(dataToStore));
      } catch (error) {
        console.error(`Error setting cached value for key ${key}:`, error);
      }
    }

    /**
     * Clears all cache entries set by this control.
     */
    clearCache() {
      // Clears ALL cache entries set by this control pattern
      try {
        let removedCount = 0;
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          // Iterate backwards when removing
          const key = sessionStorage.key(i);
          if (
            key &&
            (key.startsWith("asset_") ||
              key.startsWith("attach_") ||
              key.startsWith("count_") ||
              key === "cache_version")
          ) {
            sessionStorage.removeItem(key);
            removedCount++;
          }
        }
        console.log(`Cleared ${removedCount} cache entries.`);
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    }

    /**
     * Creates a document button within the provided container element.
     *
     * @param {HTMLElement} container - The container element where the button will be added.
     * @param {Array} documents - Array of document objects.
     * @param {string} assetID - The asset ID associated with the documents.
     */
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
      if (this.DEBUG_MODE) {
        console.log("Button added for asset ID:", assetID);
      }
    }

    /**
     * Processes an array of asset spans immediately, used when IS_LAZY_LOADED is false.
     *
     * @param {NodeList} spans - A NodeList of span elements.
     * @returns {Promise<void>}
     */
    async processAssetDocuments(spans) {
      if (this.DEBUG_MODE) {
        console.log(`Draw ID: ${this.drawID} - Starting immediate processing for ${spans.length} spans.`);
      }
      if (!spans || spans.length === 0) {
        return; // Nothing to process
      }
      if (!this.apiToken) {
        console.error(`Draw ID: ${this.drawID} - Cannot process asset documents: API token not available.`);
        return;
      }

      // Use Promise.allSettled to process all spans concurrently and handle individual errors
      const processingPromises = Array.from(spans).map((span) => {
        // Wrap the processing logic in a try/catch for each span
        return (async () => {
          try {
            await this.processAssetSpan(span); // Reuse the single-span processing logic
          } catch (error) {
            const assetID = span ? span.getAttribute("data-ref") : "unknown";
            console.error(
              `Error during immediate processing of asset span ${assetID} (Instance ${this.drawID}):`,
              error
            );
            // Don't let one error stop others
          }
        })();
      });

      try {
        await Promise.allSettled(processingPromises);
        console.log(`Draw ID: ${this.drawID} - Finished immediate processing batch.`);
      } catch (error) {
        // This catch is unlikely to be hit with Promise.allSettled unless there's a setup error
        console.error(`Unexpected error during batch processing (Instance ${this.drawID}):`, error);
      }
    }

    /**
     * Returns a NodeList of asset span elements based on the configured list name.
     *
     * @returns {NodeList} All asset span elements.
     */
    getAllAssetSpans() {
      // This selector finds any <span> with a data-ref attribute that is inside an element with
      // the desired lid attribute, itself a descendant of any element with the "clsViewerPage" class.
      return document.querySelectorAll(`.clsViewerPage [lid="${this.LIST_NAME}"] span[data-ref]`);
    }

    /**
     * Processes all asset spans (ignores visibility) across all pages.
     *
     * @returns {Promise<void>}
     */
    async processAllAssetSpans() {
      // Ensure API token is available
      if (!this.apiToken) {
        console.log(`Draw ID: ${this.drawID} - API token not yet available, skipping processAllAssetSpans.`);
        return;
      }

      // Prevent concurrent execution
      if (this.processingInProgress) {
        return;
      }
      this.processingInProgress = true;

      try {
        // Get all spans using the new helper method
        const allSpans = this.getAllAssetSpans();

        // Filter out spans that are already processed or in processing.
        const processedAttr = `data-processed-${this.drawID}`;
        const processingAttr = `data-processing-${this.drawID}`;
        const spansToProcess = Array.from(allSpans).filter((span) => {
          // (We no longer check visibility here)
          return !span.hasAttribute(processedAttr) && !span.hasAttribute(processingAttr);
        });

        if (spansToProcess.length === 0) {
          if (this.DEBUG_MODE) {
            console.log(`Draw ID: ${this.drawID} - No new, unprocessed spans found across all pages.`);
          }
          this.processingInProgress = false;
          return;
        }

        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Found ${spansToProcess.length} new spans to process.`);
        }

        // Process the spans (each via processAssetSpan)
        const processingPromises = spansToProcess.map((span) => this.processAssetSpan(span));
        await Promise.allSettled(processingPromises);
        console.log(`Draw ID: ${this.drawID} - Completed processing batch of ${spansToProcess.length} spans.`);
      } catch (error) {
        console.error(`Error in processAllAssetSpans (Instance ${this.drawID}):`, error);
      } finally {
        this.processingInProgress = false; // Release the lock
      }
    }

    /**
     * Processes asset spans that are visible in the viewport.
     *
     * @returns {Promise<void>}
     */
    async processVisibleAssetSpans() {
      // If a batch is already in progress, mark that new work is pending and exit.
      if (this.processingInProgress) {
        this.pendingProcessing = true;
        if (this.DEBUG_MODE) {
          console.log(`Draw ID: ${this.drawID} - Batch in progress; marking pendingProcessing for new visible items.`);
        }
        return;
      }

      this.processingInProgress = true;
      this.pendingProcessing = false; // reset the pending flag
      try {
        const allSpans = this.getAllAssetSpans();
        const processedAttr = `data-processed-${this.drawID}`;
        const processingAttr = `data-processing-${this.drawID}`;

        // Filter spans to those in the viewport and not already processed or being processed.
        const spansToProcess = Array.from(allSpans).filter((span) => {
          return (
            this.isElementInViewport(span) && !span.hasAttribute(processedAttr) && !span.hasAttribute(processingAttr)
          );
        });

        if (spansToProcess.length === 0) {
          console.log(`Draw ID: ${this.drawID} - No new, visible, unprocessed spans found.`);
          return;
        }

        if (this.DEBUG_MODE) {console.log(`Draw ID: ${this.drawID} - Found ${spansToProcess.length} visible spans to process.`);}
        const processingPromises = spansToProcess.map((span) => this.processAssetSpan(span));
        await Promise.allSettled(processingPromises);
        console.log(`Draw ID: ${this.drawID} - Completed processing batch of ${spansToProcess.length} spans.`);
      } catch (error) {
        console.error(`Error in processVisibleAssetSpans (Instance ${this.drawID}):`, error);
      } finally {
        // Release the current batch lock.
        this.processingInProgress = false;
        // If new items came in during processing, pendingProcessing will be true.
        if (this.pendingProcessing) {
          if (this.DEBUG_MODE) { console.log(`Draw ID: ${this.drawID} - Pending work detected; processing new visible spans.`);}
          // Reset the flag and call the method again (optionally wrap in setTimeout for a new tick).
          this.pendingProcessing = false;
          setTimeout(() => this.processVisibleAssetSpans(), 0);
        }
      }
    }

    /**
     * Cleans up the control by removing event listeners, disconnecting observers, clearing cache, and releasing references.
     *
     * @param {object} oControlHost - The host control object.
     */
    destroy(oControlHost) {
      console.log(`Destroying AdvancedControl Instance: ID=${this.drawID}`);
      this.oControl = oControlHost;

      // Remove event listeners
      if (this.throttledScrollHandler) {
        document.removeEventListener("scroll", this.throttledScrollHandler, { capture: true });
        window.removeEventListener("scroll", this.throttledScrollHandler);
        window.removeEventListener("resize", this.throttledScrollHandler);
        this.throttledScrollHandler = null; // Clear reference
      }

      if (this.intervalCheck) {
        clearInterval(this.intervalCheck);
        this.intervalCheck = null;
      }

      // --- Disconnect MutationObserver ---
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null; // Clear reference
        console.log(`Draw ID: ${this.drawID} - MutationObserver disconnected.`);
      }
      if (this.mutationProcessTimeout) {
        clearTimeout(this.mutationProcessTimeout);
      }
      // Clear cache if desired
      this.clearCache(); // Add this call to remove cache entries

      // Clear references
      this.oControl = null;
      this.authObj = null;
    }
  }

  return AdvancedControl;
});

//v1127