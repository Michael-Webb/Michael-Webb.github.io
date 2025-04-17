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
        require([
          "Module"
        ], this.dependenciesLoaded.bind(this, fnDoneInitializing));
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
       this.oControlHost = oControlHost
       this.oPage = oControlHost.page
       this.application = oControlHost.page.application
       this.GlassContext = this.application.GlassContext
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
        oControlHost.container.innerHTML = '';

        // Button to open the simple dialog
        const simpleButton = document.createElement('button');
        simpleButton.textContent = 'Open Simple Dialog';
        simpleButton.style.marginRight = '10px'; // Add some spacing
        simpleButton.onclick = () => { // Use arrow function to preserve 'this'
            this.showSimplerDialog();
        };
        oControlHost.container.appendChild(simpleButton);

         // Button to open the example/advanced dialog
        const exampleButton = document.createElement('button');
        exampleButton.textContent = 'Open Example Dialog';
        exampleButton.onclick = () => { // Use arrow function to preserve 'this'
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
         * @param {string} config.title - The title displayed in the dialog header.
         * @param {string} [config.message] - Plain text message to display in the body. Use this OR htmlContent.
         * @param {string} [config.htmlContent] - HTML string to display in the body. Use this OR message.
         * @param {('info'|'error'|'warning'|'share'|'embed')} [config.type='info'] - The type of dialog, influencing styling and icon.
         * @param {Array.<(string|object)>} [config.buttons=['ok', 'cancel']] - An array defining the buttons.
         *   - Can be strings for standard buttons ('ok', 'cancel', 'close', 'copy', 'delete').
         *   - Can be objects for custom buttons: `{ text: 'My Button', handler: () => { ... }, type: 'primary'|'secondary', defaultId: 'customOk' }`
         * @param {string} [config.width] - CSS width for the dialog (e.g., '500px', 'small', 'large'). 'small'/'large' map to predefined sizes.
         * @param {object} [config.callback] - Callbacks for button actions.
         * @param {Function} [config.callback.general] - A general callback function triggered for *any* button click. Receives an object like `{ btn: 'ok' }` or `{ btn: 'customId' }`.
         * @param {Function} [config.callback.ok] - Specific callback for the 'ok' button.
         * @param {Function} [config.callback.cancel] - Specific callback for the 'cancel' button.
         * @param {Function} [config.callback.close] - Specific callback for the 'close' button.
         * @param {Function} [config.callback.delete] - Specific callback for the 'delete' button.
         * @param {object} [config.callbackScope] - Optional `this` context for the callbacks.
         * @param {boolean} [config.showCloseX=true] - Whether to show the 'X' close button in the header.
         * @param {string} [config.className] - Additional CSS class to add to the dialog blocker.
         * @param {string} [config.titleAriaLabel] - Aria-label for the title, defaults to the title text.
         * @param {string} [config.subTitle] - Optional subtitle to display below the main title.
         * @param {('default'|'small'|'large')} [config.size='default'] - Predefined size classes. Overrides width if both are set ambiguously.
         * @param {object} [config.payload] - Specific payload for 'share' or 'embed' types (e.g., `{ url: '...' }`).
         * @param {string} [config.id] - Optional unique ID for the dialog (auto-generated if omitted).
         */
        createCustomDialog(config) {
            if (!this.GlassContext) {
                console.error("GlassContext not initialized. Cannot create dialog.");
                return;
            }
             if (!config || typeof config !== 'object') {
                console.error("Invalid config object provided to createCustomDialog.");
                return;
            }

            try {
                 // Get the Dialog service
                 const dialogService = this.GlassContext.getCoreSvc(".Dialog");

                 if (!dialogService) {
                     console.error("Dialog service not available.");
                     return;
                 }
                // The config object passed by the user *is* the dialogObject
                // The underlying service expects this structure.
                dialogService.createDialog(config);

            } catch (error) {
                 console.error("Error creating custom dialog:", error);
                 // Optionally show an error message to the user via Glass
                 if (this.GlassContext.showErrorMessage) {
                    this.GlassContext.showErrorMessage(
                        `Failed to create dialog: ${error.message}`,
                        'Dialog Error'
                    );
                 }
            }
        }

        // --- Example Usage ---
        showExampleDialog() {
            const dialogConfig = {
                title: "Initial Example Dialog",
                message: "Click OK to see an info dialog, or Cancel to see a warning dialog.",
                type: 'info', // Initial dialog type
                width: '500px', // Adjusted width slightly
                buttons: [
                    'ok',     // Standard OK button
                    'cancel'  // Standard Cancel button
                ],
                callback: {
                    general: (buttonInfo) => {
                        console.log(`Initial Dialog button clicked: ${buttonInfo.btn}`); // Log which button was clicked

                        // The first dialog will close automatically after this callback runs
                        // because we used standard 'ok' and 'cancel' buttons.

                        if (buttonInfo.btn === 'ok') {
                            // --- Show the INFO dialog ---
                            console.log("OK clicked. Opening INFO dialog...");
                            const okDialogConfig = {
                                title: "Information",
                                message: "This dialog was triggered by clicking OK.",
                                type: 'info', // Set type to info
                                buttons: ['ok'] // Simple OK button for the second dialog
                            };
                            // IMPORTANT: Use 'this' which refers to the AdvancedControl instance
                            this.createCustomDialog(okDialogConfig);
                            // --- End INFO dialog ---

                        } else if (buttonInfo.btn === 'cancel') {
                            // --- Show the WARNING dialog ---
                            console.log("Cancel clicked. Opening WARNING dialog...");
                            const cancelDialogConfig = {
                                title: "Warning Confirmation",
                                message: "This dialog was triggered by clicking Cancel.",
                                type: 'warning', // Set type to warning
                                buttons: ['ok'] // Simple OK button for the second dialog
                            };
                            // IMPORTANT: Use 'this' which refers to the AdvancedControl instance
                            this.createCustomDialog(cancelDialogConfig);
                             // --- End WARNING dialog ---
                        }
                    },
                },
                 showCloseX: true,
                 className: 'my-custom-dialog-class'
            };

            this.createCustomDialog(dialogConfig);
        }


         showSimplerDialog() {
             this.createCustomDialog({
                 title: "Simple Info",
                 message: "Just showing a basic message.",
                 type: 'info',
                 buttons: ['ok'] // Only an OK button
             });
         }
    }
  
    return AdvancedControl;
  });
  //v4