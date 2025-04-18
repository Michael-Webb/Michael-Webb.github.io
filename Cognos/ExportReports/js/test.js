/**
 * Simple Custom Control Definition using AMD (Asynchronous Module Definition)
 * This control demonstrates launching a standard dialog via GlassContext.
 */
define([], // No explicit dependencies needed beyond what Cognos provides
    function() {
      'use strict';
  
      class SimpleDialogControl {
        constructor() {
          this.oControlHost = null;
          this.GlassContext = null;
          console.log("SimpleDialogControl instance created.");
        }
  
        /**
         * Called by the Cognos framework to initialize the control.
         * @param {object} oControlHost - The control host object provided by Cognos.
         * @param {function} fnDoneInitializing - Callback function to signal initialization is complete.
         */
        initialize(oControlHost, fnDoneInitializing) {
          console.log("SimpleDialogControl initializing...");
          this.oControlHost = oControlHost;
  
          // Standard way to get the GlassContext
          const app = oControlHost.page && oControlHost.page.application;
          this.GlassContext = app && app.GlassContext ? app.GlassContext : null;
  
          if (!this.GlassContext) {
            console.error("SimpleDialogControl: CRITICAL - GlassContext not found during initialization! Dialogs will not work.");
            // Optionally, display an error in the control container itself
            if (oControlHost.container) {
                oControlHost.container.innerHTML = '<p style="color: red; font-weight: bold;">Error: GlassContext not available.</p>';
            }
          } else {
             console.log("SimpleDialogControl: GlassContext found.");
          }
  
  
          // Signal that initialization is complete
          if (typeof fnDoneInitializing === 'function') {
            fnDoneInitializing();
          }
           console.log("SimpleDialogControl initialization complete.");
        }
  
        /**
         * Called by the Cognos framework when data is bound to the control.
         * Not used in this simple example.
         * @param {object} oControlHost - The control host object.
         * @param {object} oDataStore - The data store object.
         */
        setData(oControlHost, oDataStore) {
          // console.log("SimpleDialogControl: setData called (not used in this example).");
          // In a real control, you might store oDataStore or process data here.
        }
  
        /**
         * Called by the Cognos framework to render the control's UI.
         * @param {object} oControlHost - The control host object.
         */
        draw(oControlHost) {
          console.log("SimpleDialogControl: draw called.");
          const container = oControlHost.container;
  
          // Clear any previous content
          container.innerHTML = "";
  
          // Create a simple button to trigger the dialog
          const button = document.createElement("button");
          button.textContent = "Open Standard Dialog";
          button.className = "bp"; // Apply basic Cognos button styling
          button.style.padding = "8px 15px";
          button.style.margin = "10px";
  
          // Add event listener to the button
          button.addEventListener("click", () => {
            console.log("SimpleDialogControl: Button clicked.");
            this.showDialog(); // Call the method to show the dialog
          });
  
          // Append the button to the control's container
          container.appendChild(button);
           console.log("SimpleDialogControl: Button added to container.");
        }
  
        /**
         * Method to configure and display the dialog using the .Dialog service.
         */
        showDialog() {
          console.log("SimpleDialogControl: showDialog initiated.");
  
          // --- Essential Check ---
          if (!this.GlassContext) {
            console.error("SimpleDialogControl: Cannot show dialog, GlassContext is not available.");
            alert("Error: Dialog functionality is unavailable."); // Fallback alert
            return;
          }
          // --- End Check ---
  
          // --- Define the Dialog Configuration ---
          const dialogConfig = {
            title: "Standard Dialog Example",
            message: "This dialog uses standard 'ok' and 'cancel' buttons. Click one to see the console log.",
            type: "info", // Icon type (info, warning, error)
            buttons: ["ok", "cancel"], // <-- Use STANDARD STRING IDs
            callback: {
              // <-- Callbacks are keyed by the STANDARD STRING IDs
              ok: () => {
                console.log("SimpleDialogControl: 'OK' button callback executed!");
                // Add any action you want to perform when OK is clicked
                this.showResultDialog("OK Clicked!");
              },
              cancel: () => {
                console.log("SimpleDialogControl: 'Cancel' button callback executed!");
                // Add any action you want to perform when Cancel is clicked
                 this.showResultDialog("Cancel Clicked!");
              }
              // You could also use a 'general' callback here if preferred
              // general: (response) => {
              //   console.log(`SimpleDialogControl: General callback executed for button: ${response.btn}`);
              //   if (response.btn === 'ok') { /* ... */ }
              //   else { /* ... */ }
              // }
            },
            width: "450px", // Optional width
            // className: "my-custom-dialog-class" // Optional custom CSS class
          };
          // --- End Dialog Configuration ---
  
          // --- Call the Dialog Service ---
          try {
            console.log("SimpleDialogControl: Attempting to get .Dialog service...");
            const dialogService = this.GlassContext.getCoreSvc(".Dialog");
  
            if (!dialogService || typeof dialogService.createDialog !== 'function') {
               throw new Error("Dialog service (.Dialog) or its createDialog method not found.");
            }
            console.log("SimpleDialogControl: Calling createDialog with config:", dialogConfig);
            dialogService.createDialog(dialogConfig);
             console.log("SimpleDialogControl: createDialog called successfully.");
  
          } catch (error) {
            console.error("SimpleDialogControl: Error creating dialog:", error);
            // Fallback error display if GlassContext is broken
            alert(`Dialog Creation Error: ${error.message}\nTitle: ${dialogConfig.title}`);
          }
          // --- End Service Call ---
        }
  
          /**
           * Helper to show a follow-up confirmation.
           */
          showResultDialog(message) {
              if (!this.GlassContext) return; // Guard clause
               try {
                  const dialogService = this.GlassContext.getCoreSvc(".Dialog");
                   if (!dialogService) { throw new Error("Dialog service missing"); }
                  dialogService.createDialog({
                      title: "Action Result",
                      message: message,
                      type: "success",
                      buttons: ["ok"] // Just an acknowledgement
                  });
              } catch (error) {
                  console.error("SimpleDialogControl: Error showing result dialog:", error);
              }
          }
  
      } // End of SimpleDialogControl class
  
      // Return the class constructor for the AMD module system
      return SimpleDialogControl;
    }
  );