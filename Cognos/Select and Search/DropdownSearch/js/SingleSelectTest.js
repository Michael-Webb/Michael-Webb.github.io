define(() => {
    "use strict";
    
    class CustomControl {
      /**
       * Optional initialization. Here we simply call fnDoneInitializing.
       */
      initialize(oControlHost, fnDoneInitializing) {
        fnDoneInitializing();
      }
  
      /**
       * Called when authored data is passed into the control.
       * We store the data store for later use in the draw method.
       */
      setData(oControlHost, oDataStore) {
        // Store the data store for later use in draw()
        this.m_oDataStore = oDataStore;
      }
  
      /**
       * Draw the dropdown select prompt.
       * Any custom CSS is embedded directly in the HTML output.
       */
      draw(oControlHost) {
        // Generate a unique ID for the select element.
        const selectId = oControlHost.generateUniqueID();
  
        // Begin building the HTML with inline CSS for the dropdown.
        let sHtml = `
          <style>
            /* Inline CSS for the custom dropdown */
            .custom-dropdown {
              padding: 5px;
              font-size: 14px;
              border: 1px solid #ccc;
              border-radius: 3px;
            }
          </style>
          <select id="${selectId}" class="custom-dropdown">
            <option value="">-- Select an option --</option>
        `;
  
        // Populate the dropdown options using the data store.
        // Column 0: use value, Column 1: display value.
        if (this.m_oDataStore && this.m_oDataStore.rowCount) {
          for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
            const useValue  = this.m_oDataStore.getCellValue(iRow, 0);
            const dispValue = this.m_oDataStore.getCellValue(iRow, 1);
            sHtml += `<option value="${useValue}">${dispValue}</option>`;
          }
        }
        sHtml += `</select>`;
  
        // Render the HTML in the container.
        oControlHost.container.innerHTML = sHtml;
  
        // Save a reference to the select element for later use.
        this.m_sel = document.getElementById(selectId);
  
        // Add an event listener to handle selection changes.
        this.m_sel.addEventListener("change", (event) => {
          // When a selection is made, notify Cognos that the prompt value changed.
          oControlHost.valueChanged();
          // Automatically advance/refresh the report with the new parameter value.
          oControlHost.next();
        });
      }
  
      /**
       * Returns whether the control is in a valid state.
       * In this case, valid if a non-empty selection has been made.
       */
      isInValidState(oControlHost) {
        return this.m_sel && this.m_sel.value !== "";
      }
  
      /**
       * Returns the parameter value to be passed back to Cognos.
       * The parameter name is defined by oControlHost.configuration['Parameter Name'].
       */
      getParameters(oControlHost) {
        // If nothing is selected, return null so the parameter isn't set.
        if (!this.m_sel || this.m_sel.value === "") {
          return null;
        }
        
        // Retrieve the parameter name from the authored configuration.
        const sParamName = oControlHost.configuration['Parameter Name'];
        
        // Return the parameter object using the selected value as the "use" value.
        return [{
          parameter: sParamName,
          values: [{ use: this.m_sel.value }]
        }];
      }
      
      /**
       * Optional destroy method.
       */
      destroy(oControlHost) {
        // Clean up any resources or event listeners if needed.
      }
    }
    
    return CustomControl;
  });
  