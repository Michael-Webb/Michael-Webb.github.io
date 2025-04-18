define(() => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
      this.React = null;
      this.ReactDOM = null;
      this.componentLibraries = {};
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
        
        // Load component libraries after React is available
        this.loadComponentLibraries().then(() => {
          fnDoneInitializing();
        });
        return;
      }
      
      // Load React from CDN, then load component libraries
      this.loadReactFromCDN().then(() => {
        return this.loadComponentLibraries();
      }).finally(() => {
        fnDoneInitializing();
      });
    }
    
    loadReactFromCDN() {
      return new Promise((resolve, reject) => {
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
              resolve();
            } else {
              console.error("React scripts loaded but React objects not found in window");
              reject(new Error("React not found in window"));
            }
          }
        };
        
        // Set up event handlers
        reactScript.onload = checkAllScriptsLoaded;
        reactDOMScript.onload = checkAllScriptsLoaded;
        
        reactScript.onerror = (e) => {
          console.error("Failed to load React from CDN:", e);
          reject(new Error("Failed to load React"));
        };
        
        reactDOMScript.onerror = (e) => {
          console.error("Failed to load ReactDOM from CDN:", e);
          reject(new Error("Failed to load ReactDOM"));
        };
        
        // Add scripts to document
        document.head.appendChild(reactScript);
        document.head.appendChild(reactDOMScript);
      });
    }
    
    loadComponentLibraries() {
      // Only try to load component libraries if React is available
      if (!this.React || !this.ReactDOM) {
        return Promise.resolve();
      }
      
      return Promise.all([
        // Example: Load Material-UI
        this.loadLibrary('https://unpkg.com/@material-ui/core@4.12.4/umd/material-ui.production.min.js', 'MaterialUI'),
        
        // Example: Load React Bootstrap (requires jQuery and Popper.js)
        this.loadLibrary('https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js', 'jQuery')
          .then(() => this.loadLibrary('https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js', 'Popper'))
          .then(() => this.loadLibrary('https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.min.js', 'Bootstrap'))
          .then(() => this.loadLibrary('https://cdn.jsdelivr.net/npm/react-bootstrap@1.6.1/dist/react-bootstrap.min.js', 'ReactBootstrap')),
        
        // Example: Load Ant Design
        this.loadLibrary('https://cdn.jsdelivr.net/npm/antd@4.16.13/dist/antd.min.js', 'antd')
          .then(() => {
            // Load Ant Design CSS
            const antdCSS = document.createElement('link');
            antdCSS.rel = 'stylesheet';
            antdCSS.href = 'https://cdn.jsdelivr.net/npm/antd@4.16.13/dist/antd.min.css';
            document.head.appendChild(antdCSS);
          })
      ]).catch(error => {
        console.error("Error loading component libraries:", error);
        // Continue even if some libraries fail to load
      });
    }
    
    loadLibrary(url, globalName) {
      return new Promise((resolve, reject) => {
        // Skip if already loaded
        if (window[globalName] || this.componentLibraries[globalName]) {
          console.log(`${globalName} already loaded`);
          
          // Store reference if it exists globally
          if (window[globalName]) {
            this.componentLibraries[globalName] = window[globalName];
          }
          
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = url;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          if (window[globalName]) {
            console.log(`Successfully loaded ${globalName}`);
            this.componentLibraries[globalName] = window[globalName];
            resolve();
          } else {
            console.warn(`${globalName} script loaded but global not found`);
            resolve(); // Continue anyway
          }
        };
        
        script.onerror = (e) => {
          console.error(`Failed to load ${globalName} from ${url}:`, e);
          reject(new Error(`Failed to load ${globalName}`));
        };
        
        document.head.appendChild(script);
      });
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
      
      // Use any loaded component library to enhance the UI
      if (this.React && this.componentLibraries.MaterialUI) {
        this.drawWithMaterialUI(c);
      } else if (this.React && this.componentLibraries.antd) {
        this.drawWithAntDesign(c);
      } else if (this.React && this.componentLibraries.ReactBootstrap) {
        this.drawWithReactBootstrap(c);
      } else if (this.React) {
        // Fallback to regular React
        this.drawWithReact(c);
      } else {
        // Fallback to vanilla JS
        const button = document.createElement("button");
        button.textContent = "Open Dropdown Dialog";
        button.style.padding = "10px 15px";
        button.addEventListener("click", () => this.showExampleDialog());
        
        buttonContainer.appendChild(button);
        c.appendChild(buttonContainer);
      }
    }
    
    drawWithMaterialUI(container) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;
      const MaterialUI = this.componentLibraries.MaterialUI;
      
      // Create root element for React
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      
      // Create a component using Material-UI
      const MaterialUIComponent = () => {
        return React.createElement(
          MaterialUI.Button, 
          { 
            variant: 'contained', 
            color: 'primary',
            onClick: () => this.showExampleDialog()
          }, 
          'Open Dropdown Dialog'
        );
      };
      
      try {
        ReactDOM.render(React.createElement(MaterialUIComponent), reactRoot);
      } catch (error) {
        console.error("Error rendering Material-UI component:", error);
        // Fallback
        container.removeChild(reactRoot);
        this.drawWithReact(container);
      }
    }
    
    drawWithAntDesign(container) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;
      const antd = this.componentLibraries.antd;
      
      // Create root element for React
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      
      // Create a component using Ant Design
      const AntComponent = () => {
        return React.createElement(
          antd.Button, 
          { 
            type: 'primary',
            onClick: () => this.showExampleDialog()
          }, 
          'Open Dropdown Dialog'
        );
      };
      
      try {
        ReactDOM.render(React.createElement(AntComponent), reactRoot);
      } catch (error) {
        console.error("Error rendering Ant Design component:", error);
        // Fallback
        container.removeChild(reactRoot);
        this.drawWithReact(container);
      }
    }
    
    drawWithReactBootstrap(container) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;
      const ReactBootstrap = this.componentLibraries.ReactBootstrap;
      
      // Create root element for React
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      
      // Create a component using React Bootstrap
      const BootstrapComponent = () => {
        return React.createElement(
          ReactBootstrap.Button, 
          { 
            variant: 'primary',
            onClick: () => this.showExampleDialog()
          }, 
          'Open Dropdown Dialog'
        );
      };
      
      try {
        ReactDOM.render(React.createElement(BootstrapComponent), reactRoot);
      } catch (error) {
        console.error("Error rendering React Bootstrap component:", error);
        // Fallback
        container.removeChild(reactRoot);
        this.drawWithReact(container);
      }
    }
    
    drawWithReact(container) {
      const React = this.React;
      const ReactDOM = this.ReactDOM;
      
      // Create a div for React to render into
      const reactRoot = document.createElement("div");
      container.appendChild(reactRoot);
      
      // Create a simple React button component
      const ButtonComponent = () => {
        return React.createElement(
          'button',
          {
            onClick: () => this.showExampleDialog(),
            style: { padding: '10px 15px', cursor: 'pointer' }
          },
          'Open Dropdown Dialog'
        );
      };
      
      try {
        // Render the React component
        ReactDOM.render(React.createElement(ButtonComponent), reactRoot);
      } catch (error) {
        console.error("Error rendering React component:", error);
        // If React rendering fails, fall back to vanilla JS
        container.removeChild(reactRoot);
        const button = document.createElement("button");
        button.textContent = "Open Dropdown Dialog";
        button.style.padding = "10px 15px";
        button.addEventListener("click", () => this.showExampleDialog());
        container.appendChild(button);
      }
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
      
      // If React and a component library are available, use them
      if (this.React && this.componentLibraries.MaterialUI) {
        htmlContent = this.createMaterialUIDialogHTML(selectId, colName, options);
      } else if (this.React && this.componentLibraries.antd) {
        htmlContent = this.createAntDesignDialogHTML(selectId, colName, options);
      } else if (this.React && this.componentLibraries.ReactBootstrap) {
        htmlContent = this.createReactBootstrapDialogHTML(selectId, colName, options);
      } else if (this.React) {
        // Fallback to basic React
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
    
    createMaterialUIDialogHTML(selectId, columnName, options) {
      try {
        const React = this.React;
        const ReactDOM = this.ReactDOM;
        const MaterialUI = this.componentLibraries.MaterialUI;
        
        // Create a temporary div to render React to HTML
        const tempDiv = document.createElement('div');
        
        // Create a Material-UI component
        const MaterialUIDropdown = () => {
          const [value, setValue] = React.useState('');
          
          const handleChange = (event) => {
            setValue(event.target.value);
          };
          
          return React.createElement(
            'div',
            { style: { margin: '10px 0' } },
            React.createElement(
              'p',
              null,
              'Please make a selection from the dropdown below:'
            ),
            React.createElement(
              MaterialUI.FormControl,
              { fullWidth: true, variant: 'outlined' },
              React.createElement(
                MaterialUI.InputLabel,
                { id: `${selectId}-label` },
                `Choose ${columnName}`
              ),
              React.createElement(
                MaterialUI.Select,
                {
                  labelId: `${selectId}-label`,
                  id: selectId,
                  value: value,
                  onChange: handleChange,
                  label: `Choose ${columnName}`
                },
                React.createElement(
                  MaterialUI.MenuItem,
                  { value: '' },
                  '-- Select --'
                ),
                options.map((option, index) => 
                  React.createElement(
                    MaterialUI.MenuItem,
                    { key: index, value: option },
                    option
                  )
                )
              )
            ),
            React.createElement(
              'p',
              null,
              React.createElement(
                'small',
                null,
                'Click ',
                React.createElement('strong', null, 'OK'),
                ' to continue or ',
                React.createElement('strong', null, 'Cancel'),
                ' to go back.'
              )
            )
          );
        };
        
        // Render to get HTML
        ReactDOM.render(React.createElement(MaterialUIDropdown), tempDiv);
        return tempDiv.innerHTML;
      } catch (error) {
        console.error("Error creating Material-UI dialog content:", error);
        // Fall back to vanilla HTML
        return this.createVanillaDialogHTML(selectId, columnName, options);
      }
    }
    
    createAntDesignDialogHTML(selectId, columnName, options) {
      try {
        const React = this.React;
        const ReactDOM = this.ReactDOM;
        const antd = this.componentLibraries.antd;
        
        // Create a temporary div to render React to HTML
        const tempDiv = document.createElement('div');
        
        // Create an Ant Design component
        const AntDropdown = () => {
          const [value, setValue] = React.useState('');
          
          const handleChange = (value) => {
            setValue(value);
            // Also update the DOM element for the dialog callback
            setTimeout(() => {
              const selectElement = document.getElementById(selectId);
              if (selectElement) {
                selectElement.value = value;
              }
            }, 0);
          };
          
          // Create a hidden select element for the dialog to access the value
          const hiddenSelect = React.createElement(
            'select',
            {
              id: selectId,
              style: { display: 'none' },
              value: value
            },
            options.map((option, index) => 
              React.createElement('option', { key: index, value: option }, option)
            )
          );
          
          return React.createElement(
            'div',
            { style: { margin: '10px 0' } },
            React.createElement(
              'p',
              null,
              'Please make a selection from the dropdown below:'
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                { htmlFor: `${selectId}-antd` },
                `Choose ${columnName}:`
              ),
              React.createElement('br'),
              React.createElement(
                antd.Select,
                {
                  id: `${selectId}-antd`,
                  style: { width: '100%' },
                  placeholder: '-- Select --',
                  onChange: handleChange,
                  value: value
                },
                options.map((option, index) => 
                  React.createElement(
                    antd.Select.Option,
                    { key: index, value: option },
                    option
                  )
                )
              ),
              hiddenSelect
            ),
            React.createElement(
              'p',
              null,
              React.createElement(
                'small',
                null,
                'Click ',
                React.createElement('strong', null, 'OK'),
                ' to continue or ',
                React.createElement('strong', null, 'Cancel'),
                ' to go back.'
              )
            )
          );
        };
        
        // Render to get HTML
        ReactDOM.render(React.createElement(AntDropdown), tempDiv);
        return tempDiv.innerHTML;
      } catch (error) {
        console.error("Error creating Ant Design dialog content:", error);
        // Fall back to vanilla HTML
        return this.createVanillaDialogHTML(selectId, columnName, options);
      }
    }
    
    createReactBootstrapDialogHTML(selectId, columnName, options) {
      try {
        const React = this.React;
        const ReactDOM = this.ReactDOM;
        const ReactBootstrap = this.componentLibraries.ReactBootstrap;
        
        // Create a temporary div to render React to HTML
        const tempDiv = document.createElement('div');
        
        // Create a React Bootstrap component
        const BootstrapDropdown = () => {
          const [value, setValue] = React.useState('');
          
          const handleChange = (e) => {
            setValue(e.target.value);
          };
          
          return React.createElement(
            'div',
            { style: { margin: '10px 0' } },
            React.createElement(
              'p',
              null,
              'Please make a selection from the dropdown below:'
            ),
            React.createElement(
              ReactBootstrap.Form.Group,
              null,
              React.createElement(
                ReactBootstrap.Form.Label,
                null,
                `Choose ${columnName}:`
              ),
              React.createElement(
                ReactBootstrap.Form.Control,
                {
                  id: selectId,
                  as: 'select',
                  value: value,
                  onChange: handleChange
                },
                React.createElement(
                  'option',
                  { value: '' },
                  '-- Select --'
                ),
                options.map((option, index) => 
                  React.createElement(
                    'option',
                    { key: index, value: option },
                    option
                  )
                )
              )
            ),
            React.createElement(
              'p',
              null,
              React.createElement(
                'small',
                null,
                'Click ',
                React.createElement('strong', null, 'OK'),
                ' to continue or ',
                React.createElement('strong', null, 'Cancel'),
                ' to go back.'
              )
            )
          );
        };
        
        // Render to get HTML
        ReactDOM.render(React.createElement(BootstrapDropdown), tempDiv);
        return tempDiv.innerHTML;
      } catch (error) {
        console.error("Error creating React Bootstrap dialog content:", error);
        // Fall back to vanilla HTML
        return this.createVanillaDialogHTML(selectId, columnName, options);
      }
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
//v22