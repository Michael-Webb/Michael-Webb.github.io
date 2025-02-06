define(() => {
  "use strict";

  class CustomControl {
    /**
     * Initialize the control. Get the initial parameter values here.
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.mainParamValues = [];
      // Removed groupParamValues since we no longer need group-level filter values.
      this.groupChildren = {};

      const mainParams = oControlHost.getParameter(oControlHost.configuration["Parameter Name"]);
      if (mainParams && mainParams.values && Array.isArray(mainParams.values)) {
        mainParams.values.forEach((val) => this.mainParamValues.push(val.use));
      }

      // Removed groupParams initialization.

      // Use configuration values for columns.
      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;

      // Build mapping of groups to their child “main” values.
      if (this.m_oDataStore && this.m_oDataStore.rowCount) {
        for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
          const mainUse = this.m_oDataStore.getCellValue(i, valueUseCol);
          const groupUse = this.m_oDataStore.getCellValue(i, groupingValUseCol);
          if (!this.groupChildren[groupUse]) {
            this.groupChildren[groupUse] = [];
          }
          this.groupChildren[groupUse].push(mainUse);
        }
      }
      console.log("Initial mainParamValues:", this.mainParamValues);

      fnDoneInitializing();
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
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;
      const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 2;

      // New Configuration Option: Group Initially Collapsed
      const groupInitiallyCollapsed = oControlHost.configuration["Group Initially Collapsed"] === true;

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
                  /* Group header row styles */
                  .group-header {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    margin-bottom: 5px;
                  }
                  .group-header input.group-checkbox {
                    margin-right: 8px;
                  }
                  .expand-collapse-indicator {
                    margin-right: 8px;
                    font-size: 14px;
                  }
                  .group-items {
                    padding-left: 24px;
                  }
                  .collapsed {
                    display: none;
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
            // Render each group with a header row and its items.
            for (const groupKey in groups) {
              const group = groups[groupKey];
              const isInitiallyExpanded = !groupInitiallyCollapsed;
              const expandCollapseIndicator = isInitiallyExpanded ? "▼" : "►";
              sHtml += `<div class="group-container" data-group="${groupKey}">`;
              sHtml += `<div class="group-header" data-group="${groupKey}">
                            <input type="checkbox" class="group-checkbox" data-group="${groupKey}" />
                            <span class="expand-collapse-indicator">${expandCollapseIndicator}</span>
                            <span class="group-label-text">${group.display}</span>
                          </div>`;
              sHtml += `<div class="group-items ${isInitiallyExpanded ? "" : "collapsed"}">`;
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
          this.m_groupContainers = Array.from(oControlHost.container.querySelectorAll(".group-container"));
          this.m_groupCheckboxes = Array.from(oControlHost.container.querySelectorAll(".group-checkbox"));
          // Get all individual item checkboxes (exclude the group-level ones)
          this.m_itemCheckboxes = Array.from(
            oControlHost.container.querySelectorAll('input[type="checkbox"]:not(.group-checkbox)')
          );
        } else {
          this.m_checkboxes = Array.from(
            oControlHost.container.querySelectorAll(`#${containerId} input[type="checkbox"]`)
          );
        }

        // Prepopulate item checkboxes using mainParamValues.
        if (this.hasGrouping) {
          this.m_itemCheckboxes.forEach((itemCb) => {
            itemCb.checked = this.mainParamValues.includes(itemCb.value);
          });

          // Recalculate group header state based on its child checkboxes.
          this.m_groupContainers.forEach((container) => {
            const groupCheckbox = container.querySelector(".group-checkbox");
            const itemCheckboxes = container.querySelectorAll('.group-items input[type="checkbox"]');
            const checkedCount = Array.from(itemCheckboxes).filter((cb) => cb.checked).length;
            const totalCount = itemCheckboxes.length;
            if (checkedCount === totalCount && totalCount > 0) {
              groupCheckbox.checked = true;
              groupCheckbox.indeterminate = false;
            } else if (checkedCount > 0) {
              groupCheckbox.checked = false;
              groupCheckbox.indeterminate = true;
            } else {
              groupCheckbox.checked = false;
              groupCheckbox.indeterminate = false;
            }
          });
        } else {
          // No grouping.
          this.m_checkboxes.forEach((cb) => {
            cb.checked = this.mainParamValues.includes(cb.value);
            cb.addEventListener("change", () => {
              console.log(`Checkbox with value ${cb.value} changed. Checked: ${cb.checked}`);
              oControlHost.valueChanged();
            });
          });
        }

        // Attach event listener to the group header for toggling expand/collapse.
        if (this.hasGrouping) {
          this.m_groupContainers.forEach((container) => {
            const header = container.querySelector(".group-header");
            header.addEventListener("click", (event) => {
              if (event.target.tagName.toLowerCase() !== "input") {
                const groupItems = container.querySelector(".group-items");
                const indicator = header.querySelector(".expand-collapse-indicator");
                groupItems.classList.toggle("collapsed");
                indicator.innerHTML = groupItems.classList.contains("collapsed") ? "►" : "▼";
              }
            });
          });

          // When a group header checkbox changes, update its child items.
          this.m_groupCheckboxes.forEach((groupCb) => {
            groupCb.addEventListener("change", () => {
              const groupKey = groupCb.getAttribute("data-group");
              const groupContainer = oControlHost.container.querySelector(`.group-container[data-group="${groupKey}"]`);
              const itemCheckboxes = groupContainer.querySelectorAll('.group-items input[type="checkbox"]');
              itemCheckboxes.forEach((itemCb) => {
                itemCb.checked = groupCb.checked;
              });
              // Recalculate header state.
              const checkedCount = Array.from(itemCheckboxes).filter((cb) => cb.checked).length;
              const totalCount = itemCheckboxes.length;
              if (checkedCount === totalCount && totalCount > 0) {
                groupCb.checked = true;
                groupCb.indeterminate = false;
              } else if (checkedCount > 0) {
                groupCb.checked = false;
                groupCb.indeterminate = true;
              } else {
                groupCb.checked = false;
                groupCb.indeterminate = false;
              }
              console.log(`Group checkbox [${groupKey}] changed`);
              oControlHost.valueChanged();
            });
          });

          // When an individual item checkbox changes, recalc its parent group header state.
          this.m_itemCheckboxes.forEach((itemCb) => {
            itemCb.addEventListener("change", () => {
              const groupKey = itemCb.getAttribute("data-group");
              const groupContainer = oControlHost.container.querySelector(`.group-container[data-group="${groupKey}"]`);
              const groupCheckbox = groupContainer.querySelector(".group-checkbox");
              const itemCheckboxes = groupContainer.querySelectorAll('.group-items input[type="checkbox"]');
              const checkedCount = Array.from(itemCheckboxes).filter((cb) => cb.checked).length;
              const totalCount = itemCheckboxes.length;
              if (checkedCount === totalCount && totalCount > 0) {
                groupCheckbox.checked = true;
                groupCheckbox.indeterminate = false;
              } else if (checkedCount > 0) {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = true;
              } else {
                groupCheckbox.checked = false;
                groupCheckbox.indeterminate = false;
              }
              console.log(`Item checkbox [${itemCb.value}] changed`);
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
     */
    isInValidState(oControlHost) {
      if (!this.isMultiple) {
        return this.m_sel && this.m_sel.value !== "";
      } else {
        if (this.hasGrouping) {
          // Only need to check that at least one main (child) item is checked.
          return this.m_itemCheckboxes && this.m_itemCheckboxes.some((cb) => cb.checked);
        } else {
          return this.m_checkboxes && this.m_checkboxes.some((cb) => cb.checked);
        }
      }
    }

    /**
     * Returns the parameter(s) for submission.
     * Only main parameter values are submitted.
     */
    getParameters(oControlHost) {
      const sParamName = oControlHost.configuration["Parameter Name"];
      let params = [];

      if (!sParamName) {
        return null;
      }

      if (!this.isMultiple) {
        if (!this.m_sel || this.m_sel.value === "") {
          return null;
        }
        params.push({
          parameter: sParamName,
          values: [{ use: this.m_sel.value }],
        });
      } else {
        let itemValues = [];
        if (this.hasGrouping) {
          this.m_itemCheckboxes.forEach((cb) => {
            if (cb.checked) {
              itemValues.push(cb.value);
            }
          });
        } else {
          this.m_checkboxes.forEach((cb) => {
            if (cb.checked) {
              itemValues.push(cb.value);
            }
          });
        }
        params.push({
          parameter: sParamName,
          values: itemValues.map((val) => ({ use: String(val) })),
        });
      }
      console.log("Parameters about to be sent:", JSON.stringify(params));
      return params.length > 0 ? params : null;
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
