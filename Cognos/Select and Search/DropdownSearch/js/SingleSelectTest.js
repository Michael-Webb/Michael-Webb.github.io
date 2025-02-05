define(() => {
    "use strict";
  
    class CustomControl {
      /**
       * Initialize the control; simply call fnDoneInitializing.
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
       * In single-select mode, renders a dropdown.
       * In multiple-select mode, renders a list of checkboxes and an Apply button.
       *
       * In multiple-select mode:
       * - Each checkbox calls valueChanged() on change.
       * - The Apply button is created similar to the sample you provided and, when clicked,
       *   calls valueChanged() and (if AutoSubmit is true) next().
       */
      draw(oControlHost) {
        // Read configuration values.
        const isMultiple = !!oControlHost.configuration['Multiple Select'];
        const autoSubmit = (oControlHost.configuration['AutoSubmit'] !== false);
        this.isMultiple = isMultiple;
        this.autoSubmit = autoSubmit;
  
        let sHtml = "";
  
        if (!isMultiple) {
          // ----- SINGLE-SELECT MODE -----
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
          if (this.m_oDataStore && this.m_oDataStore.rowCount) {
            for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
              const useValue = this.m_oDataStore.getCellValue(iRow, 0);
              const dispValue = this.m_oDataStore.getCellValue(iRow, 1);
              sHtml += `<option value="${useValue}">${dispValue}</option>`;
            }
          }
          sHtml += `</select>`;
          oControlHost.container.innerHTML = sHtml;
  
          this.m_sel = document.getElementById(selectId);
          this.m_sel.addEventListener("change", () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.finish();
            }
          });
        } else {
          // ----- MULTIPLE-SELECT MODE -----
          // Generate a unique container ID for the checkboxes.
          const containerId = oControlHost.generateUniqueID();
  
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
              /* Create the Apply button similarly to the sample, but with our own CSS */
              .MyApplyButton {
                background-color: #f0f0f0;
                border: 1px solid #aaa;
                color: #333;
                font-size: 14px;
                padding: 6px 12px;
                cursor: pointer;
                margin-top: 10px;
              }
              .MyApplyButton:hover {
                background-color: #ddd;
                color: #000;
              }
            </style>
            <div id="${containerId}" class="checkbox-container">
          `;
  
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
          // Create the Apply button using the same pattern as in the sample.
          sHtml += `<button class="MyApplyButton btnApply">Apply</button>`;
          oControlHost.container.innerHTML = sHtml;
  
          // Retrieve all checkbox elements.
          this.m_checkboxes = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`));
          // Bind each checkbox to call valueChanged() when toggled.
          this.m_checkboxes.forEach(cb => {
            cb.addEventListener("change", () => {
              oControlHost.valueChanged();
            });
          });
  
          // Bind the Apply button's onclick similar to the provided example.
          oControlHost.container.querySelector(".btnApply").onclick = () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.finish();
            }
          };
        }
      }
  
      /**
       * Checks if the control is in a valid state.
       * - In single-select mode, valid if a non-empty option is chosen.
       * - In multiple-select mode, valid if at least one checkbox is checked.
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
       * - For single-select, returns one value.
       * - For multiple-select, returns all selected values.
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
       * Optional destroy method.
       */
      destroy(oControlHost) {
        // Cleanup if necessary.
      }
    }
    return CustomControl;
});