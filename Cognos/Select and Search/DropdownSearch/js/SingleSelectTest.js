define(() => {
  "use strict";

  class CustomControl {
    /**
     * Initialize the control. Get the initial parameter values here.
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.mainParamValues = [];
      this.groupParamValues = [];
      this.groupChildren = {}; // new line

      const mainParams = oControlHost.getParameter(oControlHost.configuration["Parameter Name"]);
      if (mainParams && mainParams.values && Array.isArray(mainParams.values)) {
        mainParams.values.forEach((val) => this.mainParamValues.push(val.use));
      }

      const groupParams = oControlHost.getParameter(oControlHost.configuration["Grouping Parent Name"]);
      if (groupParams && groupParams.values && Array.isArray(groupParams.values)) {
        groupParams.values.forEach((val) => this.groupParamValues.push(val.use));
      }
      //New Code - Find all the values in the Group
      if (this.m_oDataStore && this.m_oDataStore.rowCount) {
        for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
          const mainUse = this.m_oDataStore.getCellValue(i, 0);
          const groupUse = this.m_oDataStore.getCellValue(i, 2);
          if (!this.groupChildren[groupUse]) {
            this.groupChildren[groupUse] = [];
          }
          this.groupChildren[groupUse].push(mainUse);
        }
      }
      console.log("Initial mainParamValues:", this.mainParamValues);
      console.log("Initial groupParamValues:", this.groupParamValues);

      fnDoneInitializing(); // Or return a Promise if initialization is asynchronous
    }

    /**
     * Receives authored data from the data store.
     */
    setData(oControlHost, oDataStore) {
      this.m_oDataStore = oDataStore;
    }

    /**
     * Draw the control. Use the stored parameter values.
     */
    draw(oControlHost) {
      // Read configuration values.
      const isMultiple = !!oControlHost.configuration["Multiple Select"];
      const autoSubmit = oControlHost.configuration["AutoSubmit"] !== false;
      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const valueDispCol = oControlHost.configuration["Value Display Column"] ?? 0;

      // Grouping configuration.
      const groupingParamName = oControlHost.configuration["Grouping Parent Name"] ?? "";
      const groupVals = oControlHost.configuration["Group Values"] ?? false;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2; // Corrected to 2 based on config
      const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 2; // Corrected to 2 based on config

      this.isMultiple = isMultiple;
      this.autoSubmit = autoSubmit;
      // Grouping is enabled only when "Group Values" is true and a grouping parameter name is provided.
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
            // Build groups mapping.
            let groups = {};
            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
              const mainDisp = this.m_oDataStore.getCellValue(i, valueDispCol);
              const groupUse = this.m_oDataStore.getCellValue(i, groupingValUseCol);
              const groupDisp = this.m_oDataStore.getCellValue(i, groupingValDispCol);
              if (!groups[groupUse]) {
                groups[groupUse] = { display: groupDisp, options: [] };
              }
              groups[groupUse].options.push({ use: mainUse, display: mainDisp });
            }
            // Build the dropdown using <optgroup>.
            for (const groupKey in groups) {
              const group = groups[groupKey];
              sHtml += `<optgroup label="${group.display}">`;
              group.options.forEach((option) => {
                // Each option gets a data-group attribute.
                sHtml += `<option value="${option.use}" data-group="${groupKey}">${option.display}</option>`;
              });
              sHtml += `</optgroup>`;
            }
          } else {
            // No grouping: list each row as an option.
            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const useValue = this.m_oDataStore.getCellValue(i, valueUseCol);
              const dispValue = this.m_oDataStore.getCellValue(i, valueDispCol);
              sHtml += `<option value="${useValue}">${dispValue}</option>`;
            }
          }
        }
        sHtml += `</select>`;
        oControlHost.container.innerHTML = sHtml;

        this.m_sel = document.getElementById(selectId);

        // Prepopulate the dropdown using the stored main parameter value.
        if (this.mainParamValues && this.mainParamValues.length > 0) {
          this.m_sel.value = this.mainParamValues[0];
        }

        this.m_sel.addEventListener("change", () => {
          oControlHost.valueChanged();
          if (autoSubmit) {
            oControlHost.finish();
          }
        });
      } else {
        // ----- MULTIPLE-SELECT MODE -----
        const containerId = oControlHost.generateUniqueID();
        sHtml += `
            <style>
              .checkbox-container {
                border: 1px solid #ccc;
                padding: 10px;
                border-radius: 3px;
                max-height: 300px;
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
              /* Styles for grouped checkboxes */
              .group-container {
                margin-bottom: 10px;
              }
              .group-label {
                font-weight: bold;
              }
              .group-items {
                padding-left: 20px;
              }
            </style>
            <div id="${containerId}" class="checkbox-container">
          `;
        if (this.m_oDataStore && this.m_oDataStore.rowCount) {
          if (this.hasGrouping) {
            // Build groups mapping.
            let groups = {};

            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
              const mainDisp = this.m_oDataStore.getCellValue(i, valueDispCol);
              const groupUse = this.m_oDataStore.getCellValue(i, groupingValUseCol);
              const groupDisp = this.m_oDataStore.getCellValue(i, groupingValDispCol);

              if (!groups[groupUse]) {
                groups[groupUse] = { display: groupDisp, items: [] };
              }

              groups[groupUse].items.push({ use: mainUse, display: mainDisp });
            }

            // Render each group with a header checkbox and its items.
            for (const groupKey in groups) {
              const group = groups[groupKey];
              sHtml += `<div class="group-container">`;
              // Group header checkbox.
              sHtml += `<label class="checkbox-label group-label">
                              <input type="checkbox" class="group-checkbox" data-group="${groupKey}" /> ${group.display}
                            </label>`;
              sHtml += `<div class="group-items">`;
              group.items.forEach((item) => {
                sHtml += `<label class="checkbox-label">
                              <input type="checkbox" value="${item.use}" data-group="${groupKey}" /> ${item.display}
                            </label>`;
              });
              sHtml += `</div></div>`;
            }
          } else {
            // No grouping: simply list each row as a checkbox.
            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const useValue = this.m_oDataStore.getCellValue(i, valueUseCol);
              const dispValue = this.m_oDataStore.getCellValue(i, valueDispCol);
              sHtml += `<label class="checkbox-label">
                            <input type="checkbox" value="${useValue}" /> ${dispValue}
                          </label>`;
            }
          }
        }
        sHtml += `</div>`;
        sHtml += `<button class="MyApplyButton btnApply">Apply</button>`;
        oControlHost.container.innerHTML = sHtml;

        // Save references to checkboxes.
        if (this.hasGrouping) {
          this.m_groupCheckboxes = Array.from(oControlHost.container.querySelectorAll(".group-checkbox"));
          this.m_itemCheckboxes = Array.from(
            oControlHost.container.querySelectorAll('input[type="checkbox"]:not(.group-checkbox)')
          );
        } else {
          this.m_checkboxes = Array.from(
            oControlHost.container.querySelectorAll(`#${containerId} input[type="checkbox"]`)
          );
        }

        if (this.hasGrouping) {
          // Prepopulate group header checkboxes.
          this.m_groupCheckboxes.forEach((groupCb) => {
            const groupKey = groupCb.getAttribute("data-group");
            const shouldGroupBeChecked = this.groupParamValues.includes(groupKey);

            groupCb.checked = shouldGroupBeChecked; // Set the group checked state

            // Mark all child checkboxes as checked *or unchecked* based on group state and individual values.
            this.m_itemCheckboxes.forEach((itemCb) => {
              if (itemCb.getAttribute("data-group") === groupKey) {
                const itemValue = itemCb.value;
                if (shouldGroupBeChecked) {
                  itemCb.checked = true;
                }
                if (!this.mainParamValues.includes(itemValue)) {
                  itemCb.checked = false;
                }
              }
            });
          });

          //Make sure to select item values outside of the group parameter
          this.m_itemCheckboxes.forEach((itemCb) => {
            if (
              !this.mainParamValues.includes(itemCb.value) &&
              !itemCb.checked &&
              !this.groupParamValues.includes(itemCb.getAttribute("data-group"))
            ) {
              itemCb.checked = false;
            }
          });
        } else {
          // Without grouping, simply check the checkboxes whose values are in the current main parameter.
          this.m_checkboxes.forEach((cb) => {
            if (this.mainParamValues.includes(cb.value)) {
              cb.checked = true;
            }
          });
        }
        // Bind event listeners.
        if (this.hasGrouping) {
          // When a group header is toggled, toggle its child checkboxes.
          this.m_groupCheckboxes.forEach((cb) => {
            cb.addEventListener("change", () => {
              const group = cb.getAttribute("data-group");
              this.m_itemCheckboxes.forEach((itemCb) => {
                if (itemCb.getAttribute("data-group") === group) {
                  itemCb.checked = cb.checked;
                }
              });
              oControlHost.valueChanged();
            });
          });
          // Individual item checkboxes.
          this.m_itemCheckboxes.forEach((cb) => {
            cb.addEventListener("change", () => {
              oControlHost.valueChanged();
            });
          });
        } else {
          this.m_checkboxes.forEach((cb) => {
            cb.addEventListener("change", () => {
              oControlHost.valueChanged();
            });
          });
        }
        // Bind the Apply button.
        oControlHost.container.querySelector(".btnApply").onclick = () => {
          oControlHost.valueChanged();
          oControlHost.finish();
        };
      }
    }

    /**
     * Checks if the control is in a valid state.
     * - Single-select: valid if a non-empty option is chosen.
     * - Multiple-select:
     *   - With grouping: valid if at least one group or item checkbox is selected.
     *   - Without grouping: valid if at least one checkbox is selected.
     */
    isInValidState(oControlHost) {
      if (!this.isMultiple) {
        return this.m_sel && this.m_sel.value !== "";
      } else {
        if (this.hasGrouping) {
          const groupChecked = this.m_groupCheckboxes && this.m_groupCheckboxes.some((cb) => cb.checked);
          const itemChecked = this.m_itemCheckboxes && this.m_itemCheckboxes.some((cb) => cb.checked);
          return groupChecked || itemChecked;
        } else {
          return this.m_checkboxes && this.m_checkboxes.some((cb) => cb.checked);
        }
      }
    }

    /**
     * Returns the parameter(s) for submission.
     *
     * Single-select mode:
     * - With grouping: returns two parameter objects (one for the main parameter and one for the group parameter).
     * - Without grouping: returns one parameter object.
     *
     * Multiple-select mode:
     * - With grouping: returns both group and/or individual values depending on what is selected.
     * - Without grouping: returns one parameter object containing all selected values.
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
          if (this.hasGrouping) {
            let groupValues = [];
            let itemValues = [];
            if (this.m_groupCheckboxes) {
              this.m_groupCheckboxes.forEach(cb => {
                if (cb.checked) {
                  groupValues.push({ use: cb.getAttribute("data-group") });
                }
              });
            }
            if (this.m_itemCheckboxes) {
              this.m_itemCheckboxes.forEach(cb => {
                const group = cb.getAttribute("data-group");
                const groupCb = oControlHost.container.querySelector(`.group-checkbox[data-group="${group}"]`);
                if (groupCb && groupCb.checked) {
                  // Skip individual items if the group header is checked.
                } else if (cb.checked) {
                  itemValues.push({ use: cb.value });
                }
              });
            }
            const params = [];
            if (itemValues.length > 0) {
              params.push({
                parameter: sParamName,
                values: itemValues
              });
            }
            if (groupValues.length > 0) {
              params.push({
                parameter: oControlHost.configuration["Grouping Parent Name"],
                values: groupValues
              });
            }
            return params.length ? params : null;
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
      }

    /**
     * Optional destroy method.
     */
    //   destroy(oControlHost) {
    //     // Cleanup if necessary.
    //   }
  }

  return CustomControl;
});
