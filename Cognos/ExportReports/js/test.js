/**
 * Simple Custom Control Definition using AMD (Asynchronous Module Definition)
 * This control demonstrates launching a standard dialog via GlassContext.
 */
define(["jquery"], function ($) {
  // No explicit dependencies needed beyond what Cognos provides
  "use strict";

  class SimpleDialogControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._globalCheckPerformed = false; // Flag to ensure one-time check
      this._boundPerformGlobalCheck = this._performGlobalCheck.bind(this); // Pre-bind for ready()
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
      this.GlassContext = Application.GlassContext.appController.glassContext;

      if (!this.GlassContext) {
        console.error(
          "SimpleDialogControl: CRITICAL - GlassContext not found during initialization! Dialogs will not work."
        );
        // Optionally, display an error in the control container itself
        if (oControlHost.container) {
          oControlHost.container.innerHTML =
            '<p style="color: red; font-weight: bold;">Error: GlassContext not available.</p>';
        }
      } else {
        console.log("SimpleDialogControl: GlassContext found.");
      }

      // Signal that initialization is complete
      if (typeof fnDoneInitializing === "function") {
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
      this.GlassContext = Application.GlassContext.appController.glassContext;
      console.log("SimpleDialogControl: draw called.",this.GlassContext);
      const container = oControlHost.container;

      // --- Schedule the check to run ONCE after DOM ready, triggered by the FIRST draw ---
      if (!this._globalCheckPerformed) {
        this._globalCheckPerformed = true; // Set flag immediately to prevent rescheduling
        console.log("SimpleDialogControl: Scheduling global context check for DOM ready (on first draw)...");
        // Use jQuery's ready handler. It executes immediately if DOM is already ready,
        // otherwise it queues the function until DOMContentLoaded fires.
        $(document).ready(this._boundPerformGlobalCheck);
      }
        console.log("Application", Application);


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
      if (!this.GlassContext) {
        console.error("SimpleDialogControl: Cannot show dialog, GlassContext is not available.");
        alert("Error: Dialog functionality is unavailable.");
        return;
      }

      const dialogConfig = {
        title: "Standard Dialog Example",
        message: "This dialog uses standard 'ok' and 'cancel' buttons. Click one to see the console log.",
        type: "info",
        buttons: [
          { text: "Finish", defaultId: "ok" },
          { text: "Cancel", defaultId: "cancel" },
        ],
        callback: {
          general: (response) => {
            console.log(`SimpleDialogControl: General callback executed for button: ${response.btn}`);

            // --- Defer actions using setTimeout ---
            // Use a very short delay (0 or 1ms) to allow the current execution
            // stack (potentially including BaseDialog.hide) to finish before
            // trying to show the next dialog.
            setTimeout(() => {
              console.log(`SimpleDialogControl: setTimeout executing for button: ${response.btn}`);
              if (response.btn === "ok") {
                console.log("SimpleDialogControl: Processing 'OK' action inside setTimeout.");
                this.showResultDialog("OK Clicked!");
              } else if (response.btn === "cancel") {
                console.log("SimpleDialogControl: Processing 'Cancel' action inside setTimeout.");
                this.showResultDialog("Cancel Clicked!");
              } else {
                console.log(
                  `SimpleDialogControl: Processing '${response.btn}' action (likely 'close') inside setTimeout.`
                );
                // Potentially show a "closed" message or do nothing
              }
            }, 1); // Use a minimal delay (0 or 1 often works)
            // --- End Deferral ---

            // IMPORTANT: The original dialog is likely already closing *before*
            // the setTimeout callback runs due to BaseDialog.hide().
            // The logic inside the setTimeout essentially runs *after* the close.
          },
        },
        width: "450px",
      };

      try {
        console.log("SimpleDialogControl: Attempting to get .Dialog service...");
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService || typeof dialogService.createDialog !== "function") {
          throw new Error("Dialog service (.Dialog) or its createDialog method not found.");
        }
        console.log("SimpleDialogControl: Calling createDialog with config:", dialogConfig);
        dialogService.createDialog(dialogConfig);
        console.log("SimpleDialogControl: createDialog called successfully.");
      } catch (error) {
        console.error("SimpleDialogControl: Error creating dialog:", error);
        alert(`Dialog Creation Error: ${error.message}\nTitle: ${dialogConfig.title}`);
      }
    }

    /**
     * Helper to show a follow-up confirmation.
     */
    showResultDialog(message) {
      if (!this.GlassContext) {
        console.log("SimpleDialogControl: Cannot show result dialog, GlassContext missing.");
        return;
      }
      try {
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService) {
          throw new Error("Dialog service missing for result dialog.");
        }
        console.log(`SimpleDialogControl: Showing result dialog with message: "${message}"`);
        dialogService.createDialog({
          title: "Action Result",
          message: message,
          type: "info",
          buttons: ["ok"],
        });
      } catch (error) {
        console.error("SimpleDialogControl: Error showing result dialog:", error);
      }
    }
    /**
     * The actual check function, executed once the DOM is ready.
     * This is separated out for clarity and bound in the constructor.
     */
    _performGlobalCheck() {
      console.log("SimpleDialogControl (_performGlobalCheck): DOM ready, performing one-time global check...");
      if (window.__glassAppController && window.__glassAppController.glassContext) {
        console.log(
          "SimpleDialogControl (_performGlobalCheck): window.__glassAppController.glassContext FOUND:",
          window.__glassAppController.glassContext
        );
        // Optional: Compare with the context obtained during initialize
        // console.log("SimpleDialogControl (_performGlobalCheck): Compare with this.GlassContext:",
        //     this.GlassContext === window.__glassAppController.glassContext);
      } else if (window.__glassAppController) {
        console.warn(
          "SimpleDialogControl (_performGlobalCheck): window.__glassAppController FOUND, but .glassContext is MISSING."
        );
      } else {
        console.warn("SimpleDialogControl (_performGlobalCheck): window.__glassAppController is MISSING.");
      }
      // No need to set the flag here, it was set in draw()
    }
    _performCheckWhenAppReadyPolling() {
      console.log("Checking for specific AppController (Polling)...");
      const targetController = window.SomeReportStudioGlobal?.AppController; // Adjust path
      if (targetController) {
        console.log("Specific AppController found via polling:", targetController);
        if (this._pollIntervalId) {
          clearInterval(this._pollIntervalId);
          this._pollIntervalId = null;
        }
      } else {
        console.log("Specific AppController not found yet...");
      }
    }
  }

  // Return the class constructor for the AMD module system
  return SimpleDialogControl;
});
//v9
