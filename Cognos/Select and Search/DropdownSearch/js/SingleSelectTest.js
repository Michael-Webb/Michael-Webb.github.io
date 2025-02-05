define(() => {
    "use strict";
  
    class CustomControl {
      /**
       * Initialization. Simply calls fnDoneInitializing.
       */
      initialize(oControlHost, fnDoneInitializing) {
        fnDoneInitializing();
      }
  
      /**
       * Receives authored data from the data store.
       */
      setData(oControlHost, oDataStore) {
        this.m_oDataStore = oDataStore;
      }
  
      /**
       * Draw the control.
       * Renders either a single-select dropdown or a multiple-select list of checkboxes,
       * depending on oControlHost.configuration['Multiple Select'].
       * Also reads the AutoSubmit configuration to determine if the control should
       * call next() automatically after selection.
       */
      draw(oControlHost) {
        // Read configuration values.
        const isMultiple = !!oControlHost.configuration['Multiple Select'];
        const autoSubmit = (oControlHost.configuration['AutoSubmit'] !== false);
        this.isMultiple = isMultiple;
        this.autoSubmit = autoSubmit;
        
        let sHtml = "";
        
        if (!isMultiple) {
          // Single-select mode: use a dropdown <select>.
          const selectId = oControlHost.generateUniqueID();
          sHtml += `
            <style>
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
          
          // Loop through the data store rows. Column 0 holds the "use" value;
          // column 1 holds the "display" value.
          if (this.m_oDataStore && this.m_oDataStore.rowCount) {
            for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
              const useValue = this.m_oDataStore.getCellValue(iRow, 0);
              const dispValue = this.m_oDataStore.getCellValue(iRow, 1);
              sHtml += `<option value="${useValue}">${dispValue}</option>`;
            }
          }
          
          sHtml += `</select>`;
          oControlHost.container.innerHTML = sHtml;
          
          // Save reference to the select element.
          this.m_sel = document.getElementById(selectId);
          // On change, notify Cognos and (if autoSubmit) advance the report.
          this.m_sel.addEventListener("change", () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.next();
            }
          });
        } else {
          // Multiple-select mode: use checkboxes plus an "Apply" button.
          const containerId = oControlHost.generateUniqueID();
          const applyId = oControlHost.generateUniqueID();
          
          sHtml += `
            <style>
              .checkbox-container {
                border: 1px solid #ccc;
                padding: 10px;
                border-radius: 3px;
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 10px;
              }
              .checkbox-label {
                display: block;
                margin: 3px 0;
                font-size: 14px;
              }
              .apply-button {
                padding: 5px 10px;
                font-size: 14px;
                border: 1px solid #ccc;
                border-radius: 3px;
                background: #eee;
                cursor: pointer;
              }
            </style>
            <div id="${containerId}" class="checkbox-container">
          `;
          
          // Loop through the data store and create a checkbox for each row.
          if (this.m_oDataStore && this.m_oDataStore.rowCount) {
            for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
              const useValue = this.m_oDataStore.getCellValue(iRow, 0);
              const dispValue = this.m_oDataStore.getCellValue(iRow, 1);
              sHtml += `
                <label class="checkbox-label">
                  <input type="checkbox" value="${useValue}" /> ${dispValue}
                </label>
              `;
            }
          }
          
          sHtml += `</div>`;
          sHtml += `<button id="${applyId}" class="apply-button">Apply</button>`;
          oControlHost.container.innerHTML = sHtml;
          
          // Store references to the checkboxes.
          this.m_checkboxes = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`));
          // Save reference to the Apply button.
          this.m_applyButton = document.getElementById(applyId);
          // When Apply is clicked, notify Cognos and if autoSubmit is enabled, advance the report.
          this.m_applyButton.addEventListener("click", () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.next();
            }
          });
        }
      }
  
      /**
       * Determines if the control is in a valid state.
       * For single-select, valid if a non-empty option is chosen.
       * For multiple-select, valid if at least one checkbox is checked.
       */
      isInValidState(oControlHost) {
        if (!this.isMultiple) {
          return this.m_sel && this.m_sel.value !== "";
        } else {
          return this.m_checkboxes && this.m_checkboxes.some(cb => cb.checked);
        }
      }
  
      /**
       * Returns the parameter(s) for submission.
       * Uses the parameter name defined in oControlHost.configuration['Parameter Name'].
       * For single-select, returns one value; for multiple-select, returns all selected values.
       */
      getParameters(oControlHost) {
        const sParamName = oControlHost.configuration['Parameter Name'];
        if (!sParamName) {
          return null;
        }
        
        if (!this.isMultiple) {
          if (!this.m_sel || this.m_sel.value === "") {
            return null;
          }
          return [{
            parameter: sParamName,
            values: [{ use: this.m_sel.value }]
          }];
        } else {
          if (!this.m_checkboxes) {
            return null;
          }
          const selectedValues = this.m_checkboxes
            .filter(cb => cb.checked)
            .map(cb => ({ use: cb.value }));
          if (selectedValues.length === 0) {
            return null;
          }
          return [{
            parameter: sParamName,
            values: selectedValues
          }];
        }
      }
  
      /**
       * Clean up any event listeners or resources if needed.
       */
      destroy(oControlHost) {
        // Optional cleanup code.
      }
    }
  
    return CustomControl;
  });
  