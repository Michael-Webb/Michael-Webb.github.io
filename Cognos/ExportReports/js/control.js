/**
 * AMD definition for an advanced Cognos custom control module.
 *
 * This module defines a class (`AdvancedControl`) that implements the necessary
 * lifecycle methods and interacts with the Cognos environment via the
 * `oControlHost` object, following the Cognos Custom Controls API.
 * It demonstrates handling initialization (potentially asynchronous),
 * drawing UI, managing state, retrieving parameters, handling authored data,
 * and interacting with the Glass UI framework for custom dialogs.
 *
 * @module AdvancedControl
 * @see {@link ./cognos-docs.txt|Cognos Custom Controls API Documentation} - Refer to the provided context for detailed API specs.
 */
define(() => {
    "use strict";
  
    // --- JSDoc Type Definitions based on Cognos API Documentation ---
  
    /**
     * Represents the standard Cognos ParameterValue JSON object structure,
     * used for discrete parameter values.
     * @typedef {object} CognosParameterValueDef
     * @property {string} parameter - The name of the parameter being set.
     * @property {Array<object>} values - An array of value objects.
     * @property {string} values[].use - The mandatory 'use' value (internal representation).
     * @property {string} [values[].display] - The optional 'display' value (user-friendly representation).
     * @see {@link ./cognos-docs.txt|Parameter Objects - ParameterValue JSON Object}
     */
  
    /**
     * Represents the standard Cognos RangeParameter JSON object structure,
     * used for parameter values defining a range.
     * @typedef {object} CognosRangeParameterDef
     * @property {string} parameter - The name of the parameter being set.
     * @property {Array<object>} values - An array containing a single range object.
     * @property {object} values[].start - The start bound of the range.
     * @property {string} values[].start.use - The 'use' value for the start bound.
     * @property {string} [values[].start.display] - The optional 'display' value for the start bound.
     * @property {object} values[].end - The end bound of the range.
     * @property {string} values[].end.use - The 'use' value for the end bound.
     * @property {string} [values[].end.display] - The optional 'display' value for the end bound.
     * @see {@link ./cognos-docs.txt|Parameter Objects - RangeParameter JSON Object}
     */
  
    /**
     * Represents the Cognos control host object (`oControlHost`), which provides
     * the context and API bridge between the custom control and the Cognos environment.
     * @typedef {object} CognosControlHost
     * @property {HTMLElement} container - The DOM element container provided by Cognos where the control must render its UI.
     * @property {?object} configuration - A JSON object containing configuration properties authored for this control instance in the report spec. Null if no configuration is provided.
     * @property {string} locale - The current user's locale string (e.g., "en-us"). Read-only.
     * @property {object} page - A reference to the Cognos page object containing this control. Provides access to page-level controls and application context.
     * @property {CognosPageAPI} page - The page object that contains the control.
     * @property {CognosControlAPI} control - The public interface of the control instance itself (e.g., for methods like `getVisible`, `setVisible`). Matches the `CustomControl` interface.
     * @property {boolean} isDestroyed - Flag indicating if the control instance has been destroyed. Useful for async operations to check before interacting with the host. Read-only.
     * @property {boolean} isVisible - Flag indicating if the control is currently visible on the page. Read-only.
     * @property {string} loadingText - Text displayed by the host until the control's `draw` method completes initial rendering.
     * @property {Function} validStateChanged - Function to call when the control's validity state changes (e.g., after user input). This notifies the host to potentially enable/disable buttons like 'Next' or 'Finish'.
     * @property {Function} valueChanged - Function to call when a value within the control changes. Signals interaction to the host.
     * @property {Function} generateUniqueID - Function to generate a unique ID string suitable for use as an HTML element ID within the current document context.
     * @property {Function} getparameters - (Typo in docs, likely `getParameters`) Method to retrieve the current value(s) for a specific named parameter from the Cognos environment.
     * @property {Function} back - Navigates to the previous prompt page, if available.
     * @property {Function} cancel - Cancels the current report execution or prompt session.
     * @property {Function} finish - Submits current parameter values and attempts to finish the report execution, skipping subsequent optional prompts.
     * @property {Function} next - Submits current parameter values and navigates to the next prompt page.
     * @property {Function} reprompt - Restarts the prompting process, usually by returning to the first prompt page.
     * @property {Function} run - Executes the report with the current parameter values.
     * @see {@link ./cognos-docs.txt|oControlHost API}
     */
  
    /**
     * Represents the Cognos Page API, accessible via `oControlHost.page`.
     * @typedef {object} CognosPageAPI
     * @property {CognosApplicationAPI} application - Reference to the hosting Cognos application API.
     * @property {boolean} hasBack - Indicates if backward navigation (to a previous prompt page) is possible. Read-only.
     * @property {string} name - The authored name of the current page. Read-only.
     * @property {Promise<object>} pageModuleInstance - A Promise that resolves with the instance of the Page Module associated with this page, if one exists. Read-only, async.
     * @property {Function} getAllPromptControls - Returns an array of all prompt control instances (`PromptControl` type) on the current page.
     * @property {Function} getControlByName - Finds and returns the first control instance on the page matching the given authored name. Returns a `Control` base type or `null`.
     * @property {Function} getControlsByName - Finds and returns an array of all control instances on the page matching the given authored name. Returns an array of `Control` base types.
     * @property {Function} getControlsByNodeName - Finds and returns an array of control instances matching the specified report specification node name(s) (e.g., 'list', 'selectValue'). Returns an array of `Control` base types.
     * @see {@link ./cognos-docs.txt|oControlHost.page}
     */
  
     /**
      * Represents the Cognos Application API, accessible via `oControlHost.page.application`.
      * @typedef {object} CognosApplicationAPI
      * @property {Function} clearParameterValues - Clears all current parameter values in the session.
      * @property {Function} close - Closes the Cognos application interface (e.g., the report viewer or studio).
      * @property {Function} f_closeCurrentPerspectiveImmediately - Closes the current view/perspective immediately. Returns a Promise.
      * @property {Function} isSavedOutput - Returns `true` if the current view is displaying saved report output, `false` otherwise.
      * @property {Function} refresh - Refreshes the current report or view.
      * @property {Function} resetParameterValues - Resets all parameters to their default or initial values.
      * @property {Function} run - Executes the primary action, typically running the report.
      * @property {?Function} GlassContext - Accessor to the Glass UI framework context, if available in the environment. Used for advanced UI like custom dialogs. (Note: This might be specific to certain Cognos versions/interfaces).
      * @see {@link ./cognos-docs.txt|oControlHost.page.application}
      */
  
     /**
      * Represents the base Cognos Control API interface. Specific control types extend this.
      * @typedef {object} CognosControlAPI
      * @property {HTMLElement} element - The main HTML element representing the control. Read-only. (Accessed via `oControlHost.container` inside the control implementation).
      * @property {string} name - The authored name of the control. Read-only.
      * @property {string} nodeName - The node name from the report specification (e.g., 'customControl', 'list'). Read-only.
      * @property {Function} getDisplay - Returns the current display state (boolean).
      * @property {Function} getVisible - Returns the current visibility state (boolean).
      * @property {Function} setDisplay - Sets the CSS display style.
      * @property {Function} setVisible - Sets the CSS visibility style.
      * @property {Function} toggleDisplay - Toggles the display state.
      * @property {Function} toggleVisibility - Toggles the visibility state.
      * @see {@link ./cognos-docs.txt|Control Base API}
      */
  
     /**
      * Represents the interface for a Cognos Custom Control, extending the base Control API.
      * @typedef {object} CognosCustomControlAPI
      * @extends CognosControlAPI
      * @property {Promise<object>} instance - A Promise resolving to the custom control's module instance (the class instance itself). Read-only, async.
      * @property {Function} getDataStore - Retrieves an authored data store associated with this control by its name. Returns a `CognosDataStore` object or `null`.
      * @see {@link ./cognos-docs.txt|Control Extensions - CustomControl}
      */
  
    /**
     * Represents an authored data store passed to the control via the `setData` method.
     * @typedef {object} CognosDataStore
     * @property {number} index - The zero-based index of this data store as configured in the report spec.
     * @property {string} name - The authored name given to this data store in the report spec.
     * @property {Function} getData - A function that, when called, returns the actual data rows associated with this store.
     * @returns {Array<object>} An array where each object represents a row, with properties corresponding to data item names.
     * @see Implied by `setData` method documentation and `CustomControl.getDataStore`.
     */
  
    /**
     * @class AdvancedControl
     * @implements {CognosCustomControlAPI} Implicitly implements the lifecycle methods expected by Cognos for a custom control.
     * @classdesc
     * Implements a Cognos custom control (`nodeName: "customControl"`) demonstrating
     * various features of the Custom Controls API V6+. This includes lifecycle methods
     * (`initialize`, `destroy`, `draw`, `show`, `hide`), state management (`isInValidState`),
     * parameter handling (`getParameters`), data handling (`setData`), and interaction
     * with the Cognos host environment (`oControlHost`). It also shows integration
     * with the Glass UI framework for creating custom dialogs.
     *
     * This control renders two buttons that trigger Glass dialog examples.
     */
    class AdvancedControl {
  
      /**
       * @private
       * @type {?CognosControlHost} Reference to the Cognos Control Host object.
       * Initialized in `initialize`.
       */
      oControlHost = null;
  
      /**
       * @private
       * @type {?CognosPageAPI} Reference to the Cognos Page API object.
       * Initialized in `initialize`.
       */
      oPage = null;
  
      /**
       * @private
       * @type {?CognosApplicationAPI} Reference to the Cognos Application API object.
       * Initialized in `initialize`.
       */
      application = null;
  
      /**
       * @private
       * @type {?Function} Reference to the Glass UI framework context accessor.
       * Initialized in `initialize`. Used by `createCustomDialog`.
       */
      GlassContext = null;
  
      /**
       * @private
       * @type {?HTMLSelectElement} Example internal state: reference to a select element.
       * **Note:** This needs to be created and managed within the `draw` method if used.
       * Currently referenced by the placeholder `isInValidState` and commented-out `getParameters`.
       */
      m_sel = null; // TODO: Initialize in draw() if needed, or remove references.
  
      /**
       * @private
       * @type {?CognosDataStore} Example storage for a single data store received via `setData`.
       */
      m_oDataStore = null;
  
      /**
       * @private
       * @type {Array<CognosDataStore>} Example storage for multiple data stores, indexed numerically.
       */
      m_aDataStore = [];
  
      /**
       * @private
       * @type {?Object<string, CognosDataStore>} Example storage for multiple data stores, indexed by name.
       */
      m_oDataStores = null;
  
  
      /**
       * Optional initialization hook. Called once by the Cognos host when the
       * control instance is created.
       *
       * Use this method for setup tasks, such as storing references to the host APIs,
       * loading asynchronous dependencies, or setting initial state.
       *
       * If asynchronous operations are needed (like loading external modules via `require`),
       * either return a `Promise` that resolves when initialization is complete (API V6+),
       * or call the provided `fnDoneInitializing` callback function once ready. This
       * example uses `require` and the callback pattern.
       *
       * @param {CognosControlHost} oControlHost - The control host object providing context and APIs.
       * @param {Function} [fnDoneInitializing] - Optional callback function. If provided and a Promise is not returned, this *must* be called to signal that initialization is complete.
       * @returns {Promise<void>|void} Optionally return a Promise for async initialization (V6+). If using `fnDoneInitializing`, return `void`.
       * @see {@link ./cognos-docs.txt|Control Extensions - CustomControl - .instance} (related async loading concept)
       * @see {@link ./cognos-docs.txt|oControlHost API}
       */
      initialize(oControlHost, fnDoneInitializing) {
        console.log("AdvancedControl: Initializing...");
        this.oControlHost = oControlHost;
  
        // Store references to host APIs for convenience
        this.oPage = oControlHost.page;
        if (this.oPage) {
          this.application = this.oPage.application;
          if (this.application) {
            // Store GlassContext for custom dialogs (check availability)
            this.GlassContext = this.application.GlassContext || null;
            if (!this.GlassContext) {
              console.warn("AdvancedControl: GlassContext not found on application object. Custom dialogs may not work.");
            }
          } else {
            console.warn("AdvancedControl: Cognos application object not found on page.");
          }
        } else {
          console.warn("AdvancedControl: Cognos page object not found on control host.");
        }
  
        // Example: Load an external AMD module dependency (if needed)
        // Replace "Module" with your actual module ID.
        // If no async dependencies, simply call fnDoneInitializing() directly.
        try {
          // Using require for async dependency loading.
          // dependenciesLoaded will call fnDoneInitializing when the module loads.
          require(["Module"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
        } catch (e) {
          // Fallback if require is not available or fails
          console.error("AdvancedControl: Error initiating require call. Assuming no external dependencies.", e);
          if (fnDoneInitializing) {
            fnDoneInitializing();
          }
        }
      }
  
      /**
       * @private Internal callback method executed after asynchronous dependencies (loaded via `require` in `initialize`) are ready.
       *
       * This method signals the completion of the asynchronous initialization phase
       * by calling the `fnDoneInitializing` callback passed from `initialize`.
       *
       * @param {Function} fnDoneInitializing - The callback function originally passed to `initialize`. Must be called to signal readiness.
       * @param {object} oModule - The instance of the loaded AMD module (e.g., "Module").
       */
      dependenciesLoaded(fnDoneInitializing, oModule) {
        console.log("AdvancedControl: Asynchronous dependencies loaded.", oModule);
        // TODO: Use the loaded oModule if necessary for further setup.
  
        // Signal that initialization is fully complete.
        if (fnDoneInitializing) {
          fnDoneInitializing();
          console.log("AdvancedControl: fnDoneInitializing() called.");
        } else {
           console.warn("AdvancedControl: fnDoneInitializing callback was missing in dependenciesLoaded.");
        }
      }
  
      /**
       * Optional destruction hook. Called by the Cognos host when the control
       * instance is being permanently removed from the page.
       *
       * Use this method to perform essential cleanup tasks:
       * - Remove any DOM elements created by the control that are not within `oControlHost.container`.
       * - Remove event listeners attached to DOM elements or global objects.
       * - Cancel any active timers (`setTimeout`, `setInterval`) or ongoing requests.
       * - Release references to large objects or external resources to prevent memory leaks.
       *
       * Check `oControlHost.isDestroyed` if performing async cleanup after this method returns.
       *
       * @param {CognosControlHost} oControlHost - The control host object. Note: The host and its properties might become invalid shortly after this call completes.
       * @see {@link ./cognos-docs.txt|oControlHost Members - isDestroyed}
       */
      destroy(oControlHost) {
        console.log("AdvancedControl: destroy called.");
        // --- Cleanup Example ---
        // Remove event listeners added in draw() if they were stored
        // if (this.simpleButton && this.simpleButtonClickHandler) {
        //    this.simpleButton.removeEventListener('click', this.simpleButtonClickHandler);
        //    this.simpleButtonClickHandler = null;
        // }
        // if (this.exampleButton && this.exampleButtonClickHandler) {
        //    this.exampleButton.removeEventListener('click', this.exampleButtonClickHandler);
        //    this.exampleButtonClickHandler = null;
        // }
  
        // Clear internal references to prevent potential memory leaks
        this.oControlHost = null;
        this.oPage = null;
        this.application = null;
        this.GlassContext = null;
        this.m_sel = null;
        this.m_oDataStore = null;
        this.m_aDataStore = [];
        this.m_oDataStores = null;
  
        // TODO: Add any other specific cleanup logic required by your control.
      }
  
      /**
       * Optional render hook. Called by the Cognos host whenever the control's
       * UI needs to be rendered or re-rendered. This can happen initially,
       * after data updates (`setData`), configuration changes, or potentially
       * other host actions.
       *
       * Implementations *must* populate the provided `oControlHost.container`
       * DOM element with the control's user interface.
       *
       * **Important:** This method may be called multiple times. Always clear
       * the `oControlHost.container` and remove any previous event listeners
       * attached by this method before adding new content to prevent duplication
       * and memory leaks.
       *
       * @param {CognosControlHost} oControlHost - The control host object, providing the `container` element.
       * @see {@link ./cognos-docs.txt|oControlHost Members - container}
       * @see {@link ./cognos-docs.txt|Control Base API - oControlHost.control.element} (Conceptually linked to container)
       */
      draw(oControlHost) {
        console.log("AdvancedControl: draw called.");
        const container = oControlHost.container;
  
        // **Crucial:** Clear previous content and listeners before drawing anew.
        container.innerHTML = "";
        // (If listeners were attached directly to container or its children previously, remove them here)
  
        // --- Create UI Elements ---
  
        // Button to open the simple dialog
        const simpleButton = document.createElement("button");
        simpleButton.textContent = "Open Simple Dialog";
        simpleButton.style.marginRight = "10px"; // Add some spacing
        // Use an arrow function for the click handler to preserve 'this' context
        const simpleButtonClickHandler = () => this.showSimplerDialog();
        simpleButton.addEventListener('click', simpleButtonClickHandler);
        container.appendChild(simpleButton);
        // Optional: Store references if needed for destroy() cleanup
        // this.simpleButton = simpleButton;
        // this.simpleButtonClickHandler = simpleButtonClickHandler; // Store handler reference
  
        // Button to open the example/advanced dialog
        const exampleButton = document.createElement("button");
        exampleButton.textContent = "Open Example Dialog";
        const exampleButtonClickHandler = () => this.showExampleDialog();
        exampleButton.addEventListener('click', exampleButtonClickHandler);
        container.appendChild(exampleButton);
        // Optional: Store references if needed for destroy() cleanup
        // this.exampleButton = exampleButton;
        // this.exampleButtonClickHandler = exampleButtonClickHandler; // Store handler reference
  
  
        // --- Example: Render based on Data (if m_oDataStore was populated in setData) ---
        // if (this.m_oDataStore) {
        //   const data = this.m_oDataStore.getData();
        //   const dataDiv = document.createElement('div');
        //   dataDiv.style.marginTop = '10px';
        //   dataDiv.textContent = `Data Store "${this.m_oDataStore.name}" received with ${data.length} rows. First row: ${JSON.stringify(data[0])}`;
        //   container.appendChild(dataDiv);
        // }
  
        // --- Example: Create the select element (if using m_sel) ---
        // this.m_sel = document.createElement('select');
        // const defaultOption = document.createElement('option');
        // defaultOption.value = "";
        // defaultOption.textContent = "-- Select --";
        // this.m_sel.appendChild(defaultOption);
        // // ... add other options based on data or config ...
        // container.appendChild(this.m_sel);
        // // Add listener to notify host on change for validation/parameter updates
        // this.m_sel.addEventListener('change', () => {
        //    if(this.oControlHost) {
        //        this.oControlHost.valueChanged(); // Notify value changed
        //        this.oControlHost.validStateChanged(); // Notify validity might have changed
        //    }
        // });
      }
  
      /**
       * Optional hook. Called by the Cognos host when the control becomes visible
       * after having been hidden. Useful for resuming animations, updates, or
       * performing actions that only make sense when the UI is visible.
       *
       * Check `oControlHost.isVisible` which should be `true` when this is called.
       *
       * @param {CognosControlHost} oControlHost - The control host object.
       * @see {@link ./cognos-docs.txt|oControlHost Members - isVisible}
       */
      show(oControlHost) {
          console.log("AdvancedControl: show called.");
          // TODO: Implement logic if needed when control becomes visible.
          // Example: Start an animation or resume data polling.
      }
  
      /**
       * Optional hook. Called by the Cognos host when the control becomes hidden.
       * Useful for pausing animations, stopping frequent updates, or releasing
       * temporary resources to improve performance when the control is not visible.
       *
       * Check `oControlHost.isVisible` which should be `false` when this is called.
       *
       * @param {CognosControlHost} oControlHost - The control host object.
       * @see {@link ./cognos-docs.txt|oControlHost Members - isVisible}
       */
      hide(oControlHost) {
          console.log("AdvancedControl: hide called.");
          // TODO: Implement logic if needed when control is hidden.
          // Example: Pause an animation or stop data polling.
      }
  
      /**
       * Optional validation hook. Called by the Cognos host (typically on prompt pages)
       * to determine if the control is in a valid state to proceed (e.g., to enable
       * 'Next' or 'Finish' buttons).
       *
       * The control implementation should perform its internal validation logic based
       * on user input or current state.
       *
       * **Important:** If the control's state changes in a way that affects its validity
       * (e.g., user selects an item, enters text), the control *must* call
       * `oControlHost.validStateChanged()` to notify the host to re-evaluate the state.
       *
       * @param {CognosControlHost} oControlHost - The control host object.
       * @returns {boolean} `true` if the control considers its current state valid, `false` otherwise.
       * @see {@link ./cognos-docs.txt|oControlHost Methods - validStateChanged}
       */
      isInValidState(oControlHost) {
        // --- Example Validation Logic (using the placeholder m_sel) ---
        // Replace this with your actual validation logic.
        let isValid = true; // Default to true unless specific conditions fail
        if (this.m_sel) {
          // Example: Considered valid only if an item other than the first (placeholder) is selected.
          isValid = this.m_sel.selectedIndex > 0;
        } else {
          // Example: If m_sel is mandatory for this control, it's invalid if not created.
          // isValid = false;
        }
        // --- End Example ---
  
        console.log(`AdvancedControl: isInValidState called. Returning: ${isValid}`);
        return isValid;
        // Note: Calling oControlHost.validStateChanged() *here* is usually redundant,
        // as this method is called *by* the host *after* validStateChanged() was presumably called by the control.
        // Call validStateChanged() in event handlers (like 'change', 'input') where the state *actually* changes.
      }
  
      /**
       * Optional parameter retrieval hook. Called by the Cognos host (e.g., when
       * 'Next', 'Finish', or 'Run' is clicked) to get the parameter values represented
       * by this control.
       *
       * The implementation should gather the current values from its UI/state and
       * format them according to the Cognos ParameterValue or RangeParameter JSON object
       * specifications.
       *
       * If the control is not in a valid state to provide parameters (e.g., nothing
       * selected, invalid input), it should return `null`.
       *
       * @param {CognosControlHost} oControlHost - The control host object.
       * @returns {?(Array<CognosParameterValueDef>|Array<CognosRangeParameterDef>)} An array
       *   containing parameter value objects, or `null` if the control cannot provide valid parameters.
       * @see {@link ./cognos-docs.txt|Parameter Objects}
       * @see {@link CognosParameterValueDef}
       * @see {@link CognosRangeParameterDef}
       */
      getParameters(oControlHost) {
        console.log("AdvancedControl: getParameters called.");
  
        // --- Example Parameter Logic (using the placeholder m_sel) ---
        // Replace or uncomment/complete this with your actual parameter logic.
  
        // First, check if the control is in a valid state to provide parameters.
        // You might reuse or adapt logic from isInValidState.
        if (!this.m_sel || this.m_sel.selectedIndex < 1) {
            console.log("AdvancedControl: Not returning parameters, m_sel selection is invalid.");
            return null; // Return null if not valid or nothing to submit
        }
  
        // Get the selected value from the UI element
        const selectedOption = this.m_sel.options[this.m_sel.selectedIndex];
        const useValue = selectedOption.value;      // The value to be used internally by Cognos
        const displayValue = selectedOption.text;   // The value the user saw (optional but good practice)
  
        // Format the value according to the Cognos spec.
        // Replace "parameter1" with the actual name of the parameter this control sets.
        const parameterData = {
            parameter: "parameter1", // <-- ** Replace with actual parameter name **
            values: [
                {
                    use: useValue,
                    display: displayValue // Optional: include display value
                }
            ]
        };
  
        console.log("AdvancedControl: Returning parameter data:", [parameterData]);
        return [parameterData]; // Return array containing one parameter object
        // --- End Example ---
  
        // If the control sets multiple parameters, add more objects to the array.
        // If the control sets a range parameter, format it using CognosRangeParameterDef structure.
  
        // Default return if no specific logic implemented yet:
        // return null;
      }
  
      /**
       * Optional data handling hook. Called by the Cognos host once for each
       * authored data store associated with this control instance in the report
       * specification. This typically happens during or shortly after initialization.
       *
       * Use this method to receive and store references to the data stores. The actual
       * data can be retrieved by calling the `getData()` method on the provided
       * `oDataStore` object when needed (e.g., during the `draw` method).
       *
       * @param {CognosControlHost} oControlHost - The control host object.
       * @param {CognosDataStore} oDataStore - An object representing a single authored data store.
       *   Contains `index`, `name`, and the `getData()` function.
       * @see {@link ./cognos-docs.txt|Control Extensions - CustomControl - .getDataStore} (Host method to *get* stores, conceptually related)
       * @see {@link CognosDataStore}
       */
      setData(oControlHost, oDataStore) {
        console.log(`AdvancedControl: setData called for Data Store - Index: ${oDataStore.index}, Name: "${oDataStore.name}"`);
    
        // Strategy 1: Store only the first/primary data store received.
        if (!this.m_oDataStore) { // Store only the first one
            this.m_oDataStore = oDataStore;
            console.log(`   Stored as primary data store (m_oDataStore).`);
        }
  
        // Strategy 2: Store multiple data stores in an array, using the index.
        this.m_aDataStore[oDataStore.index] = oDataStore;
        console.log(`   Stored in array at index ${oDataStore.index} (m_aDataStore).`);
  
        // Strategy 3: Store multiple data stores in an object, using the name as the key.
        if (oDataStore.name) {
          this.m_oDataStores = this.m_oDataStores || {}; // Initialize if first time
          this.m_oDataStores[oDataStore.name] = oDataStore;
          console.log(`   Stored in object with key "${oDataStore.name}" (m_oDataStores).`);
        } else {
          console.warn(`   Data store at index ${oDataStore.index} has no name, cannot store by name.`);
        }
      }
  
      // --- Custom Methods (Not part of standard Cognos lifecycle) ---
  
      /**
       * @private Internal helper method.
       * Creates and displays a custom dialog using the Glass framework's Dialog service.
       * Requires `this.GlassContext` to be available (obtained during `initialize`).
       * Refer to Glass UI framework documentation for detailed `config` options.
       *
       * @param {object} config - The configuration object for the Glass dialog.
       * @param {string} config.title - Dialog title (Required).
       * @param {string} [config.message] - Plain text message body.
       * @param {string} [config.htmlContent] - boolean value. does the message body contain html content?
       * @param {('info'|'error'|'warning'|'share'|'embed'|'default')} [config.type='info'] - Dialog type/style.
       * @param {Array<string>} [config.buttons=['ok', 'cancel']] - Standard buttons (e.g., 'ok', 'cancel').
       * @param {object} [config.callback] - Callbacks for button actions (e.g., `ok: () => {...}`, `cancel: () => {...}`).
       * @param {object} [config.callbackScope] - `this` context for specific callbacks (e.g., `{ ok: this }`).
       * @param {string} [config.width] - Dialog width (e.g., '500px').
       * @param {boolean} [config.showCloseX=true] - Show 'X' in header.
       *
       * @example
       * this.createCustomDialog({ title: "Success", message: "Operation complete.", type: "info", buttons: ["ok"] });
       */
      createCustomDialog(config) {
        if (!this.GlassContext) {
          console.error(
            "AdvancedControl: Cannot create dialog - GlassContext not available."
          );
          alert(
            `Dialog Error: GlassContext not available.\nTitle: ${config?.title}`
          ); // Fallback alert
          return;
        }
        if (!config || typeof config !== "object" || !config.title) {
          console.error(
            "AdvancedControl: Invalid or missing config object (or title) passed to createCustomDialog."
          );
          return;
        }
  
        try {
          const dialogService = this.GlassContext.getCoreSvc(".Dialog");
          if (!dialogService || typeof dialogService.createDialog !== "function") {
            console.error(
              "AdvancedControl: Glass Dialog service or createDialog method not found."
            );
            alert(`Dialog Error: Service unavailable.\nTitle: ${config.title}`);
            return;
          }
          console.log("AdvancedControl: Creating Glass dialog with config:", config);
          dialogService.createDialog(config);
        } catch (error) {
          console.error("AdvancedControl: Error creating custom dialog:", error);
          // Attempt to show error via Glass itself, otherwise fallback
          if (this.GlassContext.showErrorMessage) {
            this.GlassContext.showErrorMessage(
              `Failed to create dialog: ${error.message}`,
              "Dialog Creation Error"
            );
          } else {
            alert(
              `Dialog Creation Error: ${error.message}\nTitle: ${config.title}`
            );
          }
        }
      }
  
      /**
       * @private Internal example method.
       * Shows a more complex dialog using `createCustomDialog`, demonstrating
       * callbacks and chaining dialogs with `setTimeout`.
       */
      showExampleDialog() {
        console.log("AdvancedControl: showExampleDialog called.");
        const dialogConfig = {
            title: "Initial Example Dialog",
            message: "Click OK for an info dialog, Cancel for a warning dialog.",
            type: 'question', // Use 'question' type for choices
            width: '500px',
            buttons: [ 'ok', 'cancel' ], // Standard OK and Cancel buttons
            callback: {
                ok: () => {
                    console.log("ExampleDialog: OK callback executed. Scheduling INFO dialog...");
                    // Use setTimeout to allow the current dialog to close before opening the next.
                    setTimeout(() => {
                        console.log("ExampleDialog: setTimeout (OK) -> Creating INFO dialog.");
                        this.createCustomDialog({
                            title: "Information",
                            message: "Triggered by clicking OK.",
                            type: 'info',
                            buttons: ['ok']
                        });
                    }, 0); // 0ms delay pushes to next event loop tick
                },
                cancel: () => {
                    console.log("ExampleDialog: Cancel callback executed. Scheduling WARNING dialog...");
                    setTimeout(() => {
                        console.log("ExampleDialog: setTimeout (Cancel) -> Creating WARNING dialog.");
                         this.createCustomDialog({
                            title: "Warning Confirmation",
                            message: "Triggered by clicking Cancel.",
                            type: 'warning',
                            buttons: ['ok']
                        });
                    }, 0);
                }
            },
            callbackScope: { ok: this, cancel: this }, // Set 'this' context for callbacks
            showCloseX: true,
            className: 'my-example-dialog-class' // Optional custom CSS class
        };
        this.createCustomDialog(dialogConfig);
      }
  
      /**
       * @private Internal example method.
       * Shows a very basic info dialog using `createCustomDialog`.
       */
      showSimplerDialog() {
        console.log("AdvancedControl: showSimplerDialog called.");
        this.createCustomDialog({
          title: "Simple Info",
          message: "Just showing a basic message.",
          type: "info",
          buttons: ["ok"], // Only an OK button
        });
      }
  
    } // End class AdvancedControl
  
    // Return the class constructor for the AMD module system
    return AdvancedControl;
  
  }); // End define