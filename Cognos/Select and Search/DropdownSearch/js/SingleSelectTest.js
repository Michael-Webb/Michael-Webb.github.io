define(() => {
    "use strict";
  
    class CustomControl {
      /**
       * Initialize the control. Simply calls fnDoneInitializing.
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
       * Draws the control.
       *
       * Depending on configuration, this renders either:
       *  - A single-select dropdown (with auto submission if AutoSubmit is true), or
       *  - A multiple-select list of checkboxes with an Apply button.
       *
       * In multiple-select mode, each checkbox calls valueChanged() on change,
       * and the Apply button calls valueChanged() and (if AutoSubmit is true) next().
       */
      draw(oControlHost) {
        // Read configuration values.
        // "Multiple Select" is true when we want checkboxes with an Apply button.
        // "AutoSubmit" is true unless explicitly set to false.
        const isMultiple = !!oControlHost.configuration['Multiple Select'];
        const autoSubmit = (oControlHost.configuration['AutoSubmit'] !== false);
        this.isMultiple = isMultiple;
        this.autoSubmit = autoSubmit;
  
        let sHtml = "";
  
        if (!isMultiple) {
          // ----- SINGLE-SELECT MODE -----
          // Use a dropdown <select> element.
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
  
          // Populate the dropdown options using the data store.
          // Column 0: use value, Column 1: display value.
          if (this.m_oDataStore && this.m_oDataStore.rowCount) {
            for (let iRow = 0, nRows = this.m_oDataStore.rowCount; iRow < nRows; iRow++) {
              const useValue = this.m_oDataStore.getCellValue(iRow, 0);
              const dispValue = this.m_oDataStore.getCellValue(iRow, 1);
              sHtml += `<option value="${useValue}">${dispValue}</option>`;
            }
          }
          sHtml += `</select>`;
          oControlHost.container.innerHTML = sHtml;
  
          // Save a reference to the dropdown element.
          this.m_sel = document.getElementById(selectId);
  
          // When the selection changes, always notify that the value changed.
          // If AutoSubmit is true, also call next().
          this.m_sel.addEventListener("change", () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.next();
            }
          });
        } else {
          // ----- MULTIPLE-SELECT MODE -----
          // Render checkboxes inside a scrollable container plus an "Apply" button.
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
  
          // Loop through the data store rows and create a checkbox for each.
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
  
          // Save references to the checkboxes and the Apply button.
          this.m_checkboxes = Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]`));
          this.m_applyButton = document.getElementById(applyId);
  
          // In multiple-select mode, attach an event listener to each checkbox.
          // Each time a checkbox is checked or unchecked, call valueChanged().
          this.m_checkboxes.forEach(cb => {
            cb.addEventListener("change", () => {
              oControlHost.valueChanged();
            });
          });
  
          // The Apply button always calls valueChanged().
          // If AutoSubmit is true, clicking Apply will also trigger next().
          this.m_applyButton.addEventListener("click", () => {
            oControlHost.valueChanged();
            if (autoSubmit) {
              oControlHost.next();
            }
          });
        }
      }
  
      /**
       * Determines whether the control is in a valid state.
       * - For single-select: valid if a non-empty option is chosen.
       * - For multiple-select: valid if at least one checkbox is checked.
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
       * - For single-select: returns one value.
       * - For multiple-select: returns all selected values.
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
       * Optional cleanup if needed.
       */
      destroy(oControlHost) {
        // Cleanup code if necessary.
      }
    }
  
    return CustomControl;
  });
  