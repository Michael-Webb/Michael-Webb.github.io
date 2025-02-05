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
       * In single-select mode, renders a dropdown (with optional grouping).
       * In multiple-select mode, renders a list of checkboxes and an Apply button.
       */
      draw(oControlHost) {
        // Read configuration values.
        const isMultiple = !!oControlHost.configuration['Multiple Select'];
        const autoSubmit = (oControlHost.configuration['AutoSubmit'] !== false);
        const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
        const valueDispCol = oControlHost.configuration["Value Display Column"] ?? 0;
        
        // Grouping configuration
        const groupVals = oControlHost.configuration["Group Values"] ?? false;
        const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 1;
        const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 1;
        const groupingParamName = oControlHost.configuration["Grouping Parent Name"] ?? "";
        
        this.isMultiple = isMultiple;
        this.autoSubmit = autoSubmit;
        // Flag that grouping is enabled if "Group Values" is truthy and a grouping parameter name is provided.
        this.hasGrouping = groupVals && groupingParamName !== "";
        
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
            if (this.hasGrouping) {
              // Build a mapping from group key to group information and an array of main options.
              const groups = {};
              for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
                // Main parameter values
                const mainUse = this.m_oDataStore.getCellValue(iRow, valueUseCol);
                const mainDisp = this.m_oDataStore.getCellValue(iRow, valueDispCol);
                // Grouping parameter values
                const groupUse = this.m_oDataStore.getCellValue(iRow, groupingValUseCol);
                const groupDisp = this.m_oDataStore.getCellValue(iRow, groupingValDispCol);
  
                // Create a new group if needed.
                if (!groups[groupUse]) {
                  groups[groupUse] = {
                    display: groupDisp,
                    options: []
                  };
                }
                groups[groupUse].options.push({
                  use: mainUse,
                  display: mainDisp
                });
              }
  
              // Generate the grouped dropdown list using <optgroup>
              for (const groupKey in groups) {
                const group = groups[groupKey];
                sHtml += `<optgroup label="${group.display}">`;
                group.options.forEach(option => {
                  // Add a data attribute so we can later submit the group value.
                  sHtml += `<option value="${option.use}" data-group="${groupKey}">${option.display}</option>`;
                });
                sHtml += `</optgroup>`;
              }
            } else {
              // No grouping – just output a simple option for each row.
              for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
                const useValue = this.m_oDataStore.getCellValue(iRow, valueUseCol);
                const dispValue = this.m_oDataStore.getCellValue(iRow, valueDispCol);
                sHtml += `<option value="${useValue}">${dispValue}</option>`;
              }
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
          // (Grouping is not applied in multiple-select mode in this example.)
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
              const useValue = this.m_oDataStore.getCellValue(iRow, valueUseCol);
              const dispValue = this.m_oDataStore.getCellValue(iRow, valueDispCol);
              sHtml += `
                <label class="checkbox-label">
                  <input type="checkbox" value="${useValue}" /> ${dispValue}
                </label>
              `;
            }
          }
          sHtml += `</div>`;
          sHtml += `<button class="MyApplyButton btnApply">Apply</button>`;
          oControlHost.container.innerHTML = sHtml;
  
          this.m_checkboxes = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`));
          this.m_checkboxes.forEach(cb => {
            cb.addEventListener("change", () => {
              oControlHost.valueChanged();
            });
          });
          oControlHost.container.querySelector(".btnApply").onclick = () => {
            oControlHost.valueChanged();
            oControlHost.finish();
          };
        }
      }
  
      /**
       * Checks if the control is in a valid state.
       * - Single-select: valid if a non-empty option is chosen.
       * - Multiple-select: valid if at least one checkbox is checked.
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
       * - In single-select mode, returns one value (or two if grouping is enabled).
       * - In multiple-select mode, returns all selected values.
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
          // If grouping is enabled, return both the main parameter and the group parameter.
          if (this.hasGrouping) {
            const selectedOption = this.m_sel.options[this.m_sel.selectedIndex];
            const groupValue = selectedOption.getAttribute("data-group") || "";
            return [{
              parameter: sParamName,
              values: [{ use: this.m_sel.value }]
            }, {
              parameter: oControlHost.configuration["Grouping Parent Name"],
              values: [{ use: groupValue }]
            }];
          } else {
            return [{
              parameter: sParamName,
              values: [{ use: this.m_sel.value }]
            }];
          }
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
  