define(() => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
      this._selectElementId = null; // Store the generated ID
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      const app = oControlHost.page && oControlHost.page.application;
      this.GlassContext = app && app.GlassContext ? app.GlassContext : null;
      console.log("DropdownControl Initialized. GlassContext available:", !!this.GlassContext);
      fnDoneInitializing();
    }

    setData(oControlHost, oDataStore) {
      if (oDataStore.index === 0) {
        console.log("DropdownControl: DataStore received.");
        this._oDataStore = oDataStore;
        // Optional: Redraw if data changes after initial draw
        // if (oControlHost.container) {
        //   this.draw(oControlHost);
        // }
      }
    }

    _getDataInfo() {
      if (!this._oDataStore) {
        console.warn("DropdownControl: No DataStore available for _getDataInfo.");
        throw new Error("No DataStore available");
      }
      const ds = this._oDataStore;
       // Ensure there's at least one column
      if (ds.columnCount < 1) {
          console.warn("DropdownControl: DataStore has no columns.");
          throw new Error("DataStore has no columns");
      }
      const columnName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(columnName);

      // Check if column index is valid
       if (colIndex < 0 || colIndex >= ds.columnCount) {
          console.warn(`DropdownControl: Invalid column index for ${columnName}.`);
          throw new Error(`Invalid column index for ${columnName}`);
       }

      const options = Array.from({ length: ds.rowCount }, (_, i) => ds.getCellValue(i, colIndex));
      console.log("DropdownControl: Data info retrieved:", { columnName, options });
      return { columnName, options };
    }

    draw(oControlHost) {
      console.log("DropdownControl: draw called.");
      const c = oControlHost.container;
      c.innerHTML = ""; // Clear previous content

      // Add a simple title or indicator
      const title = document.createElement('p');
      title.textContent = "Dropdown Control Area";
      title.style.fontWeight = 'bold';
      c.appendChild(title);


      this.createShowMessageButton(c); // Button 1: Uses simpler showMessage

      try {
        // Attempt to get data info to decide if the main dialog button should be enabled
        this._getDataInfo();
        this.createDialogButton(c); // Button 2: Uses full Dialog service
      } catch (error) {
          console.log("DropdownControl: No data available during draw, Dialog button will not be added.", error.message);
          const noDataMsg = document.createElement('p');
          noDataMsg.textContent = "Load data to enable the dropdown dialog.";
          noDataMsg.style.fontStyle = 'italic';
          noDataMsg.style.marginLeft = '5px';
          c.appendChild(noDataMsg);
      }
    }

    // Uses the simpler showMessage (might have limitations with complex buttons/callbacks)
    createShowMessageButton(container) {
        console.log("DropdownControl: Creating 'Show Message' button.");
        const btn = document.createElement("button");
        btn.textContent = "Show Simple Confirm";
        btn.className = "bp"; // Basic Cognos styling
        btn.style.margin = "5px";
        btn.addEventListener("click", () => {
            console.log("DropdownControl: 'Show Message' button clicked.");
            if (!this.GlassContext) {
                alert("GlassContext not available for showMessage.");
                return;
            }
            try {
                // Using the direct Dialog service call for consistency with custom buttons
                 this.GlassContext.getCoreSvc(".Dialog").createDialog({
                    title: "Please Confirm",
                    message: "Are you sure you want to proceed with this action?",
                    type: "warning",
                    buttons: [
                        { text: "Yes, go ahead", defaultId: "ok"}, // Use object format
                        { text: "No, take me back", defaultId: "cancel" } // Use object format
                    ],
                    width: "400px",
                    callback: {
                         // Use specific callbacks for clarity if general isn't needed
                        ok: () => {
                           console.log("User confirmed via showMessage-like dialog.");
                        },
                        cancel: () => {
                            console.log("User cancelled via showMessage-like dialog.");
                        }
                        // Or use general:
                        // general: (response) => {
                        //    if (response.btn === "ok") {
                        //        console.log("User confirmed via showMessage-like dialog.");
                        //    } else { // Assumes cancel or close
                        //        console.log("User cancelled via showMessage-like dialog.");
                        //    }
                        // }
                    },
                    htmlContent: false // Explicitly false
                });

            } catch (error) {
                 console.error("Error calling createDialog (for showMessage):", error);
                 alert(`Dialog Error: ${error.message}`);
            }
        });
        container.appendChild(btn);
    }


    // Uses the full .Dialog service
    createDialogButton(container) {
      console.log("DropdownControl: Creating 'Open Dialog' button.");
      const button = document.createElement("button");
      button.textContent = "Open Dropdown Dialog";
      button.className = "bp"; // Basic Cognos styling
      button.style.margin = "5px";
      button.addEventListener("click", () => {
        console.log("DropdownControl: 'Open Dialog' button clicked.");
        this.showExampleDialog();
      });
      container.appendChild(button);
    }

    showExampleDialog() {
      console.log("DropdownControl: showExampleDialog called.");
      let info;
      try {
        info = this._getDataInfo();
      } catch (error){
        console.error("DropdownControl: Cannot show dialog, error getting data:", error.message);
        // Use a GlassContext message if available, otherwise fallback
        this.createCustomDialog({
            title: "Data Error",
            message: `Could not retrieve data for the dropdown: ${error.message || 'Unknown error.'}`,
            type: "error",
            buttons: ["ok"]
        });
        return;
      }

      const { columnName, options } = info;
      this._selectElementId = this.oControlHost.generateUniqueID(); // Store the ID
      const htmlContent = this.createVanillaDialogHTML(this._selectElementId, columnName, options);

      const dialogConfig = {
        title: `Select a ${columnName}`,
        message: htmlContent, // The generated HTML string
        htmlContent: true,    // IMPORTANT: Tell the dialog to render HTML
        type: "info",         // Icon type
        buttons: [
          { text: "Finish", defaultId: "ok" },
          { text: "Cancel", defaultId: "cancel"},
        ],
        callback: {
          // Use arrow function for 'this' to correctly refer to DropdownControl instance
          general: (response) => {
            console.log("DropdownControl: Dialog general callback triggered, button:", response.btn);

            // --- Get the value BEFORE closing or showing another dialog ---
            const selectElement = document.getElementById(this._selectElementId); // Use stored ID
            const selectedValue = selectElement ? selectElement.value : "";
            console.log("DropdownControl: Value selected in dialog:", selectedValue);
            // --- ---

            if (response.btn === "ok") {
              // Show next dialog *without* setTimeout
              this.createCustomDialog({
                title: "Selection Made",
                message: selectedValue
                  ? `You selected: <strong>${selectedValue}</strong>`
                  : "No value was selected.",
                type: "info",
                buttons: ["ok"],
                htmlContent: true,
              });
            } else if (response.btn === "cancel") {
              // Show next dialog *without* setTimeout
              this.createCustomDialog({
                title: "Selection Cancelled",
                message: "You cancelled the selection process.",
                type: "warning",
                buttons: ["ok"],
                htmlContent: true,
              });
            }
             // The first dialog closes automatically after this callback finishes.
          },
        },
        width: "500px",
        className: "dropdown-selection-dialog", // Custom class for styling if needed
      };

      this.createCustomDialog(dialogConfig);
    }

    createVanillaDialogHTML(selectId, columnName, options) {
      console.log(`DropdownControl: Creating HTML for select ID: ${selectId}`);
      let optionsHtml = `<option value="">-- Select ${columnName} --</option>`; // More informative default
      options.forEach(value => {
        // Basic escaping for HTML attribute value and content
        const escapedValue = String(value).replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>');
        optionsHtml += `<option value="${escapedValue}">${escapedValue}</option>`;
      });

      // Using standard Cognos CSS classes where possible for better integration
      return `
        <div style="margin-bottom: 1rem;"> <!-- Use rem for spacing -->
          <p class="bp-text">Please make a selection from the dropdown below:</p>
          <label class="bp-label" for="${selectId}">Choose ${columnName}:</label><br/>
          <select id="${selectId}" class="bp-select" style="width:100%; margin-top: 0.5rem;">
            ${optionsHtml}
          </select>
           <p class="bp-text bp-text--sm" style="margin-top: 1rem;"><small>Click <strong>Finish</strong> to confirm or <strong>Cancel</strong> to exit.</small></p>
        </div>
      `;
    }

    // Centralized function to create dialogs using the service
    createCustomDialog(config) {
      if (!this.GlassContext) {
        console.error("DropdownControl: Cannot create dialog - GlassContext not available.");
        // Fallback to alert if GlassContext is missing entirely
        alert(`Dialog Error: GlassContext not available.\nTitle: ${config?.title}`);
        return;
      }
       if (!config || typeof config !== 'object' || !config.title ) { // Basic config validation
           console.error("DropdownControl: Invalid dialog config passed to createCustomDialog:", config);
           alert(`Internal Error: Invalid dialog configuration provided.`);
           return;
       }

      try {
        console.log("DropdownControl: Creating dialog with config:", config);
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService) {
            throw new Error("Dialog service (.Dialog) not found in GlassContext.");
        }
        dialogService.createDialog(config);
      } catch (error) {
        console.error("DropdownControl: Error creating custom dialog:", error);
        // Attempt to use GlassContext's error message display first
        if (this.GlassContext.showErrorMessage) {
          this.GlassContext.showErrorMessage(`Failed to create dialog: ${error.message}`, "Dialog Creation Error");
        } else {
          // Fallback if even showErrorMessage isn't available (less likely)
          alert(`Dialog Creation Error: ${error.message}\nTitle: ${config.title}`);
        }
      }
    }
  }

  return DropdownControl;
});
//v39