/**
 * AMD definition for an advanced Cognos custom control.
 *
 * Leverages the Cognos Custom Controls API to implement lifecycle hooks,
 * parameter retrieval, and authored data handling. See full reference:
 * https://your-doc-host/CognosCustomControls#Control-Base-API
 *
 * @module AdvancedControl
 */
define(() => {
  "use strict";

  /**
   * @class AdvancedControl
   * @description
   * Implements a Cognos custom control with optional lifecycle
   * methods: initialize, destroy, draw, show, hide, isInValidState,
   * getParameters and setData. Follows the Cognos Custom Controls API:
   * oControlHost, ControlHost lifecycle, and parameter conventions.
   */
  class AdvancedControl {
    /**
     * Optional initialization hook.
     * Called once when the control is first instantiated. If asynchronous
     * dependencies are required, either return a Promise or call
     * **fnDoneInitializing()** when ready.
     *
     * Documentation: Control Extensions → CustomControl.instance
     * @param {oControlHost} oControlHost - Host context including:
     *   - container: HTMLElement
     *   - configuration: JSON authored config
     *   - locale: string
     * @param {Function} fnDoneInitializing - Callback to signal ready state
     * @returns {Promise|undefined} Promise (v6+) or undefined
     */
    initialize(oControlHost, fnDoneInitializing) {
      require(["Module"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
    }

    /**
     * @private
     * Called when required modules have loaded. Must invoke fnDoneInitializing
     * to allow the ControlHost to proceed.
     * @param {Function} fnDoneInitializing - Ready callback
     * @param {Object} oModule - Loaded module instance
     */
    dependenciesLoaded(fnDoneInitializing, oModule) {
      fnDoneInitializing();
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      this.oPage = oControlHost.page;
      this.application = oControlHost.page.application;
      this.GlassContext = this.application.GlassContext;
      fnDoneInitializing();
    }

    /**
     * Optional destruction hook.
     * Performs cleanup of any DOM elements, event listeners, or timers.
     *
     * Documentation: oControlHost API → isDestroyed flag
     * @param {oControlHost} oControlHost - Host context
     */
    destroy(oControlHost) {
      // TODO: remove event listeners or cancel timers
    }

    /**
     * Optional render hook.
     * Populates oControlHost.container with the control’s UI.
     *
     * Documentation: Control Base API → control.element
     * @param {oControlHost} oControlHost - Host context and container
     */
    draw(oControlHost) {
      // Clear previous content
      oControlHost.container.innerHTML = "";

      // Button to open the simple dialog
      const simpleButton = document.createElement("button");
      simpleButton.textContent = "Open Simple Dialog";
      simpleButton.style.marginRight = "10px"; // Add some spacing
      simpleButton.onclick = () => {
        // Use arrow function to preserve 'this'
        this.showSimplerDialog();
      };
      oControlHost.container.appendChild(simpleButton);

      // Button to open the example/advanced dialog
      const exampleButton = document.createElement("button");
      exampleButton.textContent = "Open Example Dialog";
      exampleButton.onclick = () => {
        // Use arrow function to preserve 'this'
        this.showExampleDialog();
      };
      oControlHost.container.appendChild(exampleButton);
    }

    /**
     * Optional hook invoked when the control is displayed.
     * Useful for deferred rendering or animations.
     *
     * Documentation: oControlHost.isVisible
     * @param {oControlHost} oControlHost
     */
    show(oControlHost) {
      // TODO: handle visibility changes
    }

    /**
     * Optional hook invoked when the control is hidden.
     * Clean up or pause UI updates.
     *
     * Documentation: oControlHost.isVisible
     * @param {oControlHost} oControlHost
     */
    hide(oControlHost) {
      // TODO: handle hide state
    }

    /**
     * Determines whether the control is in a valid state to advance prompts.
     * Called by ControlHost to enable/disable Next/Finish buttons.
     *
     * Documentation: oControlHost.validStateChanged()
     * @param {oControlHost} oControlHost
     * @returns {boolean}
     */
    isInValidState(oControlHost) {
      const valid = this.m_sel && this.m_sel.selectedIndex > 0;
      if (oControlHost) {
        oControlHost.validStateChanged();
      }
      return valid;
    }

    /**
     * Retrieves parameter values from the control for report execution.
     * Called by ControlHost.getParameters().
     *
     * Documentation: Parameter Objects → ParameterValue JSON Object
     * @param {oControlHost} oControlHost
     * @returns {?Array.<ParameterValue>|Array.<RangeParameter>} Array of parameter objects or null
     */
    //   getParameters(oControlHost) {
    //     if (!this.m_sel || this.m_sel.selectedIndex < 1) {
    //       return null;
    //     }
    //     const { value } = this.m_sel.options[this.m_sel.selectedIndex];
    //     return [
    //       {
    //         parameter: "parameter1",
    //         values: [{ use: value }],
    //       },
    //     ];
    //   }

    /**
     * Receives authored data stores for use during rendering.
     * Called once per data store configured in the report spec.
     *
     * Documentation: Control Extensions → CustomControl.getDataStore
     * @param {oControlHost} oControlHost
     * @param {DataStore} oDataStore - Contains:
     *   - index: number
     *   - name: string
     *   - getData(): Array<Object>
     */
    setData(oControlHost, oDataStore) {
      // Single data store pattern
      // this.m_oDataStore = oDataStore;
      // // Indexed collection pattern
      // this.m_aDataStore = this.m_aDataStore || [];
      // this.m_aDataStore[oDataStore.index] = oDataStore;
      // // Named collection pattern
      // this.m_oDataStores = this.m_oDataStores || {};
      // this.m_oDataStores[oDataStore.name] = oDataStore;
    }
    // --- Custom Dialog Method ---

    /**
     * Creates and displays a custom dialog using the Glass framework.
     *
     * @param {object} config - The configuration object for the dialog.
     * @param {string} config.title - The title displayed in the dialog header. Required.
     * @param {string} [config.message] - Plain text message to display in the body. Use this OR `htmlContent`.
     * @param {string} [config.htmlContent] - HTML string to display in the body. Use this OR `message`. Allows for more complex formatting but use with caution regarding XSS.
     * @param {('info'|'error'|'warning'|'share'|'embed')} [config.type='info'] - The type of dialog, influencing styling and icon. Defaults to 'info'.
     * @param {Array.<string>} [config.buttons=['ok', 'cancel']] - An array defining the buttons using *standard string identifiers*.
     *   - Accepted values: 'ok', 'cancel', 'close', 'copy', 'delete'.
     *   - Custom button *behavior* can be implemented using the `callback.general` function by checking the clicked button's ID.
     *   - The visual text of the buttons will correspond to the standard identifiers (e.g., 'ok' button will display "OK").
     * @param {string} [config.width] - CSS width for the dialog (e.g., '500px'). If omitted, size might default or be based on `config.size`.
     * @param {object} [config.callback] - Callbacks for button actions.
     * @param {Function} [config.callback.general] - A general callback function triggered for *any* button click before the dialog closes (for standard buttons). Receives an object like `{ btn: 'ok' }` or `{ btn: 'cancel' }`. Use this to implement custom logic based on which standard button was pressed.
     * @param {Function} [config.callback.ok] - Specific callback executed *after* the general callback if the 'ok' button is clicked.
     * @param {Function} [config.callback.cancel] - Specific callback executed *after* the general callback if the 'cancel' button is clicked.
     * @param {Function} [config.callback.close] - Specific callback executed *after* the general callback if the 'close' button is clicked.
     * @param {Function} [config.callback.delete] - Specific callback executed *after* the general callback if the 'delete' button is clicked.
     * @param {object} [config.callbackScope] - Optional `this` context for the specific callbacks (ok, cancel, close, delete). Note: `callback.general` will typically use the `this` context of where `createCustomDialog` was called due to arrow function usage in examples.
     * @param {boolean} [config.showCloseX=true] - Whether to show the 'X' close button in the header. Defaults to true.
     * @param {string} [config.className] - Additional CSS class to add to the dialog blocker element for custom styling.
     * @param {string} [config.titleAriaLabel] - Aria-label for the title element, defaults to the `config.title` text if not provided.
     * @param {string} [config.subTitle] - Optional subtitle text displayed below the main title in the header.
     * @param {('default'|'small'|'large')} [config.size='large'] - Predefined size classes for the dialog. Defaults to 'large'. If `config.width` is also set with a numeric value, `config.width` might take precedence or interact depending on CSS.
     * @param {object} [config.payload] - Specific payload data required for 'share' or 'embed' dialog types (e.g., `{ url: '...' }`).
     * @param {string} [config.id] - Optional unique ID for the dialog instance (auto-generated if omitted). Useful if you need to reference a specific dialog instance later, although the service primarily manages one dialog at a time.
     *
     * @example
     * // Simple Info Dialog
     * this.createCustomDialog({
     *   title: "Information",
     *   message: "Operation completed successfully.",
     *   type: 'info',
     *   buttons: ['ok']
     * });
     *
     * @example
     * // Confirmation Dialog with Custom Action on OK
     * this.createCustomDialog({
     *   title: "Confirm Deletion",
     *   message: "Are you sure you want to delete this item? This cannot be undone.",
     *   type: 'warning',
     *   buttons: ['ok', 'cancel'], // Use 'ok' for the confirm action
     *   callback: {
     *     general: (buttonInfo) => {
     *       if (buttonInfo.btn === 'ok') {
     *         console.log("Deletion confirmed by user.");
     *         // Call your deletion logic here
     *         // this.deleteItem(itemId);
     *       } else {
     *          console.log("Deletion cancelled.");
     *       }
     *     }
     *   }
     * });
     *
     * @example
     * // Dialog opening another dialog
     * this.createCustomDialog({
     *   title: "Step 1",
     *   message: "Click OK to proceed to Step 2.",
     *   type: 'info',
     *   buttons: ['ok', 'cancel'],
     *   callback: {
     *      general: (buttonInfo) => {
     *          if (buttonInfo.btn === 'ok') {
     *              this.createCustomDialog({ title: "Step 2", message: "You are now in Step 2.", buttons: ['ok'] });
     *          }
     *      }
     *   }
     * });
     */
    // --- Custom Dialog Method (remains the same) ---
    createCustomDialog(config) {
      if (!this.GlassContext) {
        console.error("GlassContext not initialized.");
        return;
      }
      if (!config || typeof config !== "object") {
        console.error("Invalid config object");
        return;
      }
      try {
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService) {
          console.error("Dialog service not available.");
          return;
        }
        dialogService.createDialog(config);
      } catch (error) {
        console.error("Error creating custom dialog:", error);
        if (this.GlassContext.showErrorMessage) {
          this.GlassContext.showErrorMessage(`Failed to create dialog: ${error.message}`, "Dialog Error");
        }
      }
    }

    // --- Example Usage (REVISED CALLBACKS - SPECIFIC ONLY) ---
    showExampleDialog() {
        const dialogConfig = {
            title: "Initial Example Dialog",
            message: "Click OK to see an info dialog, or Cancel to see a warning dialog.",
            type: 'info',
            width: '500px',
            buttons: [ 'ok', 'cancel' ],
            callback: {
                ok: () => { // Specific callback for OK
                    console.log("Specific OK callback executed. Scheduling INFO dialog...");
                    // Use setTimeout to decouple the next dialog creation
                    setTimeout(() => {
                        console.log("setTimeout: Creating INFO dialog now.");
                        const okDialogConfig = {
                            title: "Information",
                            message: "This dialog was triggered by clicking OK.",
                            type: 'info',
                            buttons: ['ok']
                        };
                        this.createCustomDialog(okDialogConfig);
                    }, 0); // Delay of 0ms pushes it to the next event loop tick
                },
                cancel: () => { // Specific callback for Cancel
                    console.log("Specific Cancel callback executed. Scheduling WARNING dialog...");
                    // Use setTimeout to decouple the next dialog creation
                    setTimeout(() => {
                        console.log("setTimeout: Creating WARNING dialog now.");
                        const cancelDialogConfig = {
                            title: "Warning Confirmation",
                            message: "This dialog was triggered by clicking Cancel.",
                            type: 'warning',
                            buttons: ['ok']
                        };
                        this.createCustomDialog(cancelDialogConfig);
                    }, 0); // Delay of 0ms pushes it to the next event loop tick
                }
                // No 'general' callback needed here
            },
            callbackScope: { ok: this, cancel: this },
             showCloseX: true,
             className: 'my-custom-dialog-class'
        };

        this.createCustomDialog(dialogConfig);
    }

    showSimplerDialog() {
      this.createCustomDialog({
        title: "Simple Info",
        message: "Just showing a basic message.",
        type: "info",
        buttons: ["ok"], // Only an OK button
      });
    }
  }

  return AdvancedControl;
});
//v11