define(() => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
      this.React = null;
      this.ReactDOM = null;
      this.selectedValue = '';
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
      
      // Load React from CDN
      this.loadScriptsFromCDN(fnDoneInitializing);
    }
    
    loadScriptsFromCDN(fnDoneInitializing) {
      const reactScript = document.createElement('script');
      reactScript.src = 'https://unpkg.com/react@17/umd/react.production.min.js';
      reactScript.crossOrigin = 'anonymous';
      
      const reactDOMScript = document.createElement('script');
      reactDOMScript.src = 'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js';
      reactDOMScript.crossOrigin = 'anonymous';
      
      // Set up tracking for script loading
      let scriptsLoaded = 0;
      const totalScripts = 2;
      
      const checkAllScriptsLoaded = () => {
        scriptsLoaded++;
        if (scriptsLoaded === totalScripts) {
          // Both scripts loaded, check if React is now available
          if (window.React && window.ReactDOM) {
            console.log("Successfully loaded React from CDN");
            this.React = window.React;
            this.ReactDOM = window.ReactDOM;
            fnDoneInitializing();
          } else {
            console.error("React scripts loaded but React objects not found in window");
            fnDoneInitializing(); // Continue without React
          }
        }
      };
      
      // Set up event handlers
      reactScript.onload = checkAllScriptsLoaded;
      reactDOMScript.onload = checkAllScriptsLoaded;
      
      reactScript.onerror = (e) => {
        console.error("Failed to load React from CDN:", e);
        fnDoneInitializing(); // Continue without React
      };
      
      reactDOMScript.onerror = (e) => {
        console.error("Failed to load ReactDOM from CDN:", e);
        fnDoneInitializing(); // Continue without React
      };
      
      // Add scripts to document
      document.head.appendChild(reactScript);
      document.head.appendChild(reactDOMScript);
    }

    setData(oControlHost, oDataStore) {
      if (oDataStore.index === 0) {
        this._oDataStore = oDataStore;
      }
    }

    draw(oControlHost) {
      const c = oControlHost.container;
      c.innerHTML = "";
      
      if (!this._oDataStore) {
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "No data available.";
        c.appendChild(errorDiv);
        return;
      }
      
      // Create a simple button to open the dialog
      const buttonContainer = document.createElement("div");
      buttonContainer.style.margin = "10px 0";
      
      const button = document.createElement("button");
      button.textContent = "Open Dropdown Dialog";
      button.style.padding = "10px 15px";
      button.addEventListener("click", () => this.showExampleDialog());
      
      buttonContainer.appendChild(button);
      c.appendChild(buttonContainer);
    }

    showExampleDialog() {
      if (!this._oDataStore) {
        alert("No data available to build dropdown.");
        return;
      }

      const ds = this._oDataStore;
      const colName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(colName);
      
      // Extract options for dropdown
      const options = [];
      for (let i = 0; i < ds.rowCount; i++) {
        options.push(ds.getCellValue(i, colIndex));
      }
      
      // Create a unique ID for the select element
      const selectId = this.oControlHost.generateUniqueID();
      
      let htmlContent;
      
      // If React is available, use it to create the dialog content
      if (this.React && this.ReactDOM) {
        htmlContent = this.createReactDialogHTML(selectId, colName, options);
      } else {
        // Fall back to vanilla HTML
        htmlContent = this.createVanillaDialogHTML(selectId, colName, options);
      }
      
      // Store a reference to this for use in callbacks
      const self = this;
      
      const dialogConfig = {
        title: `Select a ${colName}`,
        message: htmlContent,
        htmlContent: true,
        type: "info",
        buttons: ["ok", "cancel"],
        callback: {
          general: function(response) {
            console.log("Button clicked:", response.btn);
            
            // Get the selected value directly from the DOM
            const selectElement = document.getElementById(selectId);
            const selectedValue = selectElement ? selectElement.value : "";
            
            if (response.btn === "ok") {
              // Store the selected value
              self.selectedValue = selectedValue;
              
              setTimeout(function() {
                self.createCustomDialog({
                  title: "Selection Made",
                  message: selectedValue ? 
                    `You selected: <strong>${selectedValue}</strong>` : 
                    "No value was selected.",
                  type: "info",
                  buttons: ["ok"],
                  htmlContent: true
                });
              }, 100);
            }
          }
        },
        width: "500px",
        className: "dropdown-selection-dialog"
      };

      this.createCustomDialog(dialogConfig);
    }
    
    // Method to create React-based dialog HTML (pre-rendered to string)
    createReactDialogHTML(selectId, columnName, options) {
      try {
        // Create a temporary div to render React to HTML
        const tempDiv = document.createElement('div');
        
        // Create a simple React component
        const DropdownComponent = () => {
          const [selectedValue, setSelectedValue] = this.React.useState('');
          
          const handleChange = (e) => {
            setSelectedValue(e.target.value);
            // Also update a global reference for the dialog callback
            window[`dialog_selected_value_${selectId}`] = e.target.value;
          };
          
          return this.React.createElement('div', { style: { margin: '10px 0' } },
            this.React.createElement('p', null, 'Please make a selection from the dropdown below:'),
            this.React.createElement('label', { htmlFor: selectId }, `Choose ${columnName}:`),
            this.React.createElement('br'),
            this.React.createElement('select', { 
              id: selectId,
              value: selectedValue,
              onChange: handleChange,
              style: { width: '100%', padding: '5px', marginTop: '5px' }
            },
              this.React.createElement('option', { value: '' }, '-- Select --'),
              options.map((option, index) => 
                this.React.createElement('option', { key: index, value: option }, option)
              )
            ),
            this.React.createElement('p', null, 
              this.React.createElement('small', null, 
                'Click ',
                this.React.createElement('strong', null, 'OK'),
                ' to continue or ',
                this.React.createElement('strong', null, 'Cancel'),
                ' to go back.'
              )
            )
          );
        };
        
        // Render to get HTML
        this.ReactDOM.render(this.React.createElement(DropdownComponent), tempDiv);
        return tempDiv.innerHTML;
      } catch (error) {
        console.error("Error creating React dialog content:", error);
        // Fall back to vanilla HTML
        return this.createVanillaDialogHTML(selectId, columnName, options);
      }
    }
    
    // Helper method to create vanilla HTML for the dialog
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
//v21