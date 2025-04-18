define(('react','react-dom'),(React,ReactDOM) => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      // grab the GlassContext for dialogs (if available)
      const app = oControlHost.page && oControlHost.page.application;
      this.GlassContext = app && app.GlassContext ? app.GlassContext : null;
      fnDoneInitializing();
    }

    setData(oControlHost, oDataStore) {
      // we only care about the first (and only) store
      if (oDataStore.index === 0) {
        this._oDataStore = oDataStore;
      }
    }

    draw(oControlHost) {
      const c = oControlHost.container;
      c.innerHTML = "";
      const btn = document.createElement("button");
      btn.textContent = "Open Example Dialog";
      btn.addEventListener("click", () => this.showExampleDialog());
      c.appendChild(btn);
    }

    showExampleDialog() {
      if (!this._oDataStore) {
        alert("No data available to build dropdown.");
        return;
      }

      const ds = this._oDataStore;
      // assume exactly one column
      const colName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(colName);

      // build <option>s
      let optionsHtml = `<option value="">-- Select --</option>`;
      for (let i = 0; i < ds.rowCount; i++) {
        const v = ds.getCellValue(i, colIndex);
        optionsHtml += `<option value="${v}">${v}</option>`;
      }

      // unique ID so it won't collide
      const selectId = this.oControlHost.generateUniqueID();

      // Add instructions to explain the buttons
      const htmlContent = `
          <div style="margin:10px 0;">
            <p>Please make a selection from the dropdown below:</p>
            <label for="${selectId}">Choose ${colName}:</label><br/>
            <select id="${selectId}">
              ${optionsHtml}
            </select>
            <p><small>Click <strong>OK</strong> to continue or <strong>Cancel</strong> to go back.</small></p>
          </div>
        `;

      // Store a reference to this for use in callbacks
      const self = this;

      const dialogConfig = {
        title: `Select a ${colName}`,
        message: htmlContent,
        htmlContent: true,
        type: "info",
        buttons: ["ok", "cancel"], // Use standard button types
        callback: {
          general: function (response) {
            console.log("Button clicked:", response.btn);

            // Get the selected value
            const selectElement = document.getElementById(selectId);
            const selectedValue = selectElement ? selectElement.value : "";

            if (response.btn === "ok") {
              setTimeout(function () {
                self.createCustomDialog({
                  title: "Selection Made",
                  message: selectedValue ? `You selected: <strong>${selectedValue}</strong>` : "No value was selected.",
                  type: "info",
                  buttons: ["ok"],
                  htmlContent: true,
                });
              }, 100);
            } else if (response.btn === "cancel") {
              setTimeout(function () {
                self.createCustomDialog({
                  title: "Selection Cancelled",
                  message: "You cancelled the selection process.",
                  type: "warning",
                  buttons: ["ok"],
                  htmlContent: true,
                });
              }, 100);
            }
          },
        },
        width: "500px",
        className: "dropdown-selection-dialog",
      };

      this.createCustomDialog(dialogConfig);
    }

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
        console.error("AdvancedControl: Cannot create dialog - GlassContext not available.");
        alert(`Dialog Error: GlassContext not available.\nTitle: ${config?.title}`); // Fallback alert
        return;
      }
      if (!config || typeof config !== "object" || !config.title) {
        console.error("AdvancedControl: Invalid or missing config object (or title) passed to createCustomDialog.");
        return;
      }

      try {
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService || typeof dialogService.createDialog !== "function") {
          console.error("AdvancedControl: Glass Dialog service or createDialog method not found.");
          alert(`Dialog Error: Service unavailable.\nTitle: ${config.title}`);
          return;
        }
        console.log("AdvancedControl: Creating Glass dialog with config:", config);
        dialogService.createDialog(config);
      } catch (error) {
        console.error("AdvancedControl: Error creating custom dialog:", error);
        // Attempt to show error via Glass itself, otherwise fallback
        if (this.GlassContext.showErrorMessage) {
          this.GlassContext.showErrorMessage(`Failed to create dialog: ${error.message}`, "Dialog Creation Error");
        } else {
          alert(`Dialog Creation Error: ${error.message}\nTitle: ${config.title}`);
        }
      }
    }
  }

  return DropdownControl;
});
//v11