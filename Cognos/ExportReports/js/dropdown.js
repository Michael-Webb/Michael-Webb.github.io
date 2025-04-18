define(() => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
      this.React = null;
      this.ReactDOM = null;
      this.selectedValue = "";
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      // grab the GlassContext for dialogs (if available)
      const app = oControlHost.page && oControlHost.page.application;
      this.GlassContext = app && app.GlassContext ? app.GlassContext : null;

      // First check if React is already available globally
      if (window.React && window.ReactDOM) {
        console.log("Found React in global scope");
        this.React = window.React;
        this.ReactDOM = window.ReactDOM;
        fnDoneInitializing();
        return;
      }

      // Try to import React as ES modules
      this.importReactModules(fnDoneInitializing);
    }

    importReactModules(fnDoneInitializing) {
      console.log("Attempting to import React modules");

      // Create an async function to use dynamic import
      const loadModules = async () => {
        try {
          // Try dynamic imports
          const reactModule = await import("https://esm.sh/react@17");
          const reactDOMModule = await import("https://esm.sh/react-dom@17");

          console.log("Successfully imported React modules");
          this.React = reactModule.default;
          this.ReactDOM = reactDOMModule.default;

          // Also make them available globally (but in a safe way)
          if (!window.React) window.React = this.React;
          if (!window.ReactDOM) window.ReactDOM = this.ReactDOM;
        } catch (error) {
          console.error("Failed to import React modules:", error);
          // We'll continue without React in this case
        } finally {
          // Always call the callback to continue initialization
          fnDoneInitializing();
        }
      };

      // Execute the async function
      loadModules();
    }

    setData(oControlHost, oDataStore) {
      if (oDataStore.index === 0) {
        this._oDataStore = oDataStore;
      }
    }

    /**
     * Read the DataStore, pick the first column,
     * and return { ds, columnName, options }
     */
    _getDataInfo() {
      if (!this._oDataStore) {
        throw new Error("No DataStore available");
      }
      const ds = this._oDataStore;
      const columnName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(columnName);
      // build the options array in one go
      const options = Array.from({ length: ds.rowCount }, (_, i) => ds.getCellValue(i, colIndex));
      return { ds, columnName, options };
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

      // now just pass info.options & info.columnName
      if (this.React && this.ReactDOM) {
        this.drawWithReact(c, info.columnName, info.options);
      } else {
        this.drawWithVanillaJS(c, info.columnName, info.options);
      }
    }

    drawWithReact(container, columnName, options) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;

      const DialogButton = () => {
        const handleClick = () => this.showExampleDialog();
        return React.createElement(
          "button",
          {
            onClick: handleClick,
            style: { padding: "5px 10px" },
          },
          "Open Dialog"
        );
      };

      // mount it
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      ReactDOM.render(React.createElement(DialogButton), reactRoot);
    }

    drawWithVanillaJS(container, columnName, options) {

      // create only the button
      const button = document.createElement("button");
      button.textContent = "Open Dialog";
      button.style.padding = "5px 10px";
      button.addEventListener("click", () => this.showExampleDialog());

      // append to the container
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
      // Create a unique ID for the select element
      const selectId = this.oControlHost.generateUniqueID();

      // Create dialog HTML content with React component if available
      let htmlContent;

      if (this.React && this.ReactDOM) {
        // Use React to generate HTML string
        const tempDiv = document.createElement("div");

        const DialogContent = () => {
          const React = this.React;
          const [value, setValue] = React.useState("");

          // Create a global reference for accessing the value from the dialog callback
          window[`dialog_selected_value_${selectId}`] = value;

          const handleChange = (e) => {
            const newValue = e.target.value;
            setValue(newValue);
            window[`dialog_selected_value_${selectId}`] = newValue;
          };

          return React.createElement(
            "div",
            { style: { margin: "10px 0" } },
            React.createElement("p", null, "Please make a selection from the dropdown below:"),
            React.createElement("label", { htmlFor: selectId }, `Choose ${columnName}:`),
            React.createElement("br"),
            React.createElement(
              "select",
              {
                id: selectId,
                value: value,
                onChange: handleChange,
                style: { width: "100%", padding: "5px", marginTop: "5px" },
              },
              React.createElement("option", { value: "" }, "-- Select --"),
              options.map((option, index) => React.createElement("option", { key: index, value: option }, option))
            ),
            React.createElement(
              "p",
              null,
              React.createElement(
                "small",
                null,
                "Click ",
                React.createElement("strong", null, "OK"),
                " to continue or ",
                React.createElement("strong", null, "Cancel"),
                " to go back."
              )
            )
          );
        };

        try {
          // Render to get HTML
          this.ReactDOM.render(this.React.createElement(DialogContent), tempDiv);
          htmlContent = tempDiv.innerHTML;
        } catch (error) {
          console.error("Error rendering React dialog content:", error);
          // Fall back to vanilla HTML
          htmlContent = this.createVanillaDialogHTML(selectId, columnName, options);
        }
      } else {
        // Use vanilla HTML
        htmlContent = this.createVanillaDialogHTML(selectId, columnName, options);
      }

      // Store a reference to this for use in callbacks
      const self = this;

      const dialogConfig = {
        title: `Select a ${columnName}`,
        message: htmlContent,
        htmlContent: true,
        type: "info",
        buttons: ["ok", "cancel"],
        callback: {
          general: function (response) {
            console.log("Button clicked:", response.btn);

            // Get the selected value
            let selectedValue;

            // Try to get from global var first (if React was used)
            if (window[`dialog_selected_value_${selectId}`]) {
              selectedValue = window[`dialog_selected_value_${selectId}`];
              // Clean up
              delete window[`dialog_selected_value_${selectId}`];
            } else {
              // Fall back to getting from DOM
              const selectElement = document.getElementById(selectId);
              selectedValue = selectElement ? selectElement.value : "";
            }

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
      // Build options HTML
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
      if (!config || typeof config !== "object" || !config.title) {
        console.error("Invalid or missing config object (or title) passed to createCustomDialog.");
        return;
      }

      try {
        const dialogService = this.GlassContext.getCoreSvc(".Dialog");
        if (!dialogService || typeof dialogService.createDialog !== "function") {
          console.error("Glass Dialog service or createDialog method not found.");
          alert(`Dialog Error: Service unavailable.\nTitle: ${config.title}`);
          return;
        }
        console.log("Creating Glass dialog with config:", config);
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
//v26