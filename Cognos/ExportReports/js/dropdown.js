define(() => {
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
      // continue initialization immediately
      fnDoneInitializing();
    }

    setData(oControlHost, oDataStore) {
      // only store the first store
      if (oDataStore.index === 0) {
        this._oDataStore = oDataStore;
      }
    }

    _getDataInfo() {
      if (!this._oDataStore) {
        throw new Error("No DataStore available");
      }
      const ds = this._oDataStore;
      const columnName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(columnName);
      const options = Array.from({ length: ds.rowCount }, (_, i) => ds.getCellValue(i, colIndex));
      return { columnName, options };
    }

    draw(oControlHost) {
      const c = oControlHost.container;
      c.innerHTML = "";

      let info;
      try {
        info = this._getDataInfo();
      } catch {
        c.textContent = "No data available.";
        return;
      }

      this.createDialogButton(c, info.columnName, info.options);
    }

    createDialogButton(container, columnName, options) {
      const button = document.createElement("button");
      button.textContent = "Open Dialog";
      button.style.padding = "5px 10px";
      button.addEventListener("click", () => this.showExampleDialog());
      container.appendChild(button);
    }

    showExampleDialog() {
      let info;
      try {
        info = this._getDataInfo();
      } catch {
        alert("No data available to build dropdown.");
        return;
      }
      const { columnName, options } = info;
      const selectId = this.oControlHost.generateUniqueID();
      const htmlContent = this.createVanillaDialogHTML(selectId, columnName, options);

      const self = this;
      const dialogConfig = {
        title: `Select a ${columnName}`,
        message: htmlContent,
        htmlContent: true,
        type: "info",
        buttons: [
          { defaultId: "ok", text: "Finish" }, // keeps ID "ok" for your callback but shows "Finish"
          { defaultId: "cancel", text: "Cancel" }, // you can also override cancel if you like],
        ],
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

    createVanillaDialogHTML(selectId, columnName, options) {
      let optionsHtml = `<option value="">-- Select --</option>`;
      for (let i = 0; i < options.length; i++) {
        const value = options[i];
        optionsHtml += `<option value="${value}">${value}</option>`;
      }

      return `
        <div style="margin:10px 0;">
          <p>Please make a selection from the dropdown below:</p>
          <label for="${selectId}">Choose ${columnName}:</label><br/>
          <select id="${selectId}" style="width:100%; padding:5px; margin-top:5px;">
            ${optionsHtml}
          </select>
          <p><small>Click <strong>OK</strong> to continue or <strong>Cancel</strong> to go back.</small></p>
        </div>
      `;
    }

    createCustomDialog(config) {
      if (!this.GlassContext) {
        console.error("Cannot create dialog - GlassContext not available.");
        alert(`Dialog Error: GlassContext not available.\nTitle: ${config?.title}`);
        return;
      }
      if (!config.title || !config.message) {
        console.error("Invalid dialog config:", config);
        return;
      }
      try {
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        dialogService.createDialog(config);
      } catch (error) {
        console.error("Error creating custom dialog:", error);
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
//v32