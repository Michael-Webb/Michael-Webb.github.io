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
      
      // Try to import React as ES modules
      this.importReactModules(fnDoneInitializing);
    }
    
    importReactModules(fnDoneInitializing) {
      console.log("Attempting to import React modules");
      
      // Create an async function to use dynamic import
      const loadModules = async () => {
        try {
          // Try dynamic imports
          const reactModule = await import('https://esm.sh/react@17');
          const reactDOMModule = await import('https://esm.sh/react-dom@17');
          
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

    draw(oControlHost) {
      const c = oControlHost.container;
      c.innerHTML = "";
      
      if (!this._oDataStore) {
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "No data available.";
        c.appendChild(errorDiv);
        return;
      }
      
      // Get data from store
      const ds = this._oDataStore;
      const colName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(colName);
      
      // Extract options
      const options = [];
      for (let i = 0; i < ds.rowCount; i++) {
        options.push(ds.getCellValue(i, colIndex));
      }
      
      // If React is available, use it
      if (this.React && this.ReactDOM) {
        this.drawWithReact(c, colName, options);
      } else {
        // Fallback to vanilla JS
        this.drawWithVanillaJS(c, colName, options);
      }
    }
    
    drawWithReact(container, columnName, options) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;
      
      // Create a div for React to render into
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      
      // Create a simple React component
      const DropdownComponent = () => {
        const [selectedValue, setSelectedValue] = React.useState('');
        
        const handleChange = (e) => {
          setSelectedValue(e.target.value);
          // Store the selected value in the control
          this.selectedValue = e.target.value;
        };
        
        const handleClick = () => {
          this.showExampleDialog();
        };
        
        return React.createElement('div', { className: 'dropdown-container', style: { margin: '10px 0' } },
          React.createElement('label', { htmlFor: 'react-dropdown' }, `Choose ${columnName}:`),
          React.createElement('br'),
          React.createElement('select', {
            id: 'react-dropdown',
            value: selectedValue,
            onChange: handleChange,
            style: { width: '100%', padding: '5px', marginTop: '5px' }
          },
            React.createElement('option', { value: '' }, '-- Select --'),
            options.map((option, index) => 
              React.createElement('option', { key: index, value: option }, option)
            )
          ),
          React.createElement('div', { style: { marginTop: '10px' } },
            React.createElement('button', { 
              onClick: handleClick,
              style: { padding: '5px 10px' }
            }, 'Open Dialog')
          )
        );
      };
      
      try {
        // Render the React component
        ReactDOM.render(React.createElement(DropdownComponent), reactRoot);
        console.log("React component rendered successfully");
      } catch (error) {
        console.error("Error rendering React component:", error);
        // If React rendering fails, fall back to vanilla JS
        container.removeChild(reactRoot);
        this.drawWithVanillaJS(container, columnName, options);
      }
    }
    
    drawWithVanillaJS(container, columnName, options) {
      // Create dropdown container
      const dropdownContainer = document.createElement("div");
      dropdownContainer.className = "dropdown-container";
      dropdownContainer.style.margin = "10px 0";
      
      // Create label
      const label = document.createElement("label");
      label.setAttribute("for", "control-dropdown");
      label.textContent = `Choose ${columnName}:`;
      dropdownContainer.appendChild(label);
      
      // Add line break
      dropdownContainer.appendChild(document.createElement("br"));
      
      // Create select element
      const select = document.createElement("select");
      select.id = "control-dropdown";
      select.style.width = "100%";
      select.style.padding = "5px";
      select.style.marginTop = "5px";
      
      // Add default option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "-- Select --";
      select.appendChild(defaultOption);
      
      // Add options from data
      options.forEach((value, index) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
      
      // Add change event listener
      select.addEventListener("change", (e) => {
        this.selectedValue = e.target.value;
        console.log("Selected value:", this.selectedValue);
      });
      
      // Add select to container
      dropdownContainer.appendChild(select);
      
      // Create button
      const buttonContainer = document.createElement("div");
      buttonContainer.style.marginTop = "10px";
      
      const button = document.createElement("button");
      button.textContent = "Open Dialog";
      button.style.padding = "5px 10px";
      button.addEventListener("click", () => this.showExampleDialog());
      
      buttonContainer.appendChild(button);
      dropdownContainer.appendChild(buttonContainer);
      
      // Add dropdown container to main container
      container.appendChild(dropdownContainer);
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
      
      // Create dialog HTML content with React component if available
      let htmlContent;
      
      if (this.React && this.ReactDOM) {
        // Use React to generate HTML string
        const tempDiv = document.createElement('div');
        
        const DialogContent = () => {
          const React = this.React;
          const [value, setValue] = React.useState('');
          
          // Create a global reference for accessing the value from the dialog callback
          window[`dialog_selected_value_${selectId}`] = value;
          
          const handleChange = (e) => {
            const newValue = e.target.value;
            setValue(newValue);
            window[`dialog_selected_value_${selectId}`] = newValue;
          };
          
          return React.createElement('div', { style: { margin: '10px 0' } },
            React.createElement('p', null, 'Please make a selection from the dropdown below:'),
            React.createElement('label', { htmlFor: selectId }, `Choose ${colName}:`),
            React.createElement('br'),
            React.createElement('select', { 
              id: selectId,
              value: value,
              onChange: handleChange,
              style: { width: '100%', padding: '5px', marginTop: '5px' }
            },
              React.createElement('option', { value: '' }, '-- Select --'),
              options.map((option, index) => 
                React.createElement('option', { key: index, value: option }, option)
              )
            ),
            React.createElement('p', null, 
              React.createElement('small', null, 
                'Click ',
                React.createElement('strong', null, 'OK'),
                ' to continue or ',
                React.createElement('strong', null, 'Cancel'),
                ' to go back.'
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
          htmlContent = this.createVanillaDialogHTML(selectId, colName, options);
        }
      } else {
        // Use vanilla HTML
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
            } else if (response.btn === "cancel") {
              setTimeout(function() {
                self.createCustomDialog({
                  title: "Selection Cancelled",
                  message: "You cancelled the selection process.",
                  type: "warning",
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
//v19