define(() => {
  "use strict";

  class CustomControl {
    /**
     * Initialize the control. Get the initial parameter values here.
     */
    initialize(oControlHost, fnDoneInitializing) {
      this.mainParamValues = [];
      this.groupChildren = {};

      const mainParams = oControlHost.getParameter(oControlHost.configuration["Parameter Name"]);
      if (mainParams && mainParams.values && Array.isArray(mainParams.values)) {
        mainParams.values.forEach((val) => this.mainParamValues.push(val.use));
      }

      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;

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
      const isMultiple = !!oControlHost.configuration["Multiple Select"];
      const autoSubmit = oControlHost.configuration["AutoSubmit"] !== false;
      const valueUseCol = oControlHost.configuration["Value Use Column"] ?? 0;
      const valueDispCol = oControlHost.configuration["Value Display Column"] ?? 0;

      const groupingParamName = oControlHost.configuration["Grouping Parent Name"] ?? "";
      const groupVals = oControlHost.configuration["Group Values"] ?? false;
      const groupingValUseCol = oControlHost.configuration["Parent Value Use Column"] ?? 2;
      const groupingValDispCol = oControlHost.configuration["Parent Value Display Column"] ?? 2;

      const groupInitiallyCollapsed = oControlHost.configuration["Group Initially Collapsed"] === true;

      this.isMultiple = isMultiple;
      this.autoSubmit = autoSubmit;
      this.hasGrouping = groupVals && groupingParamName !== "";

      let sHtml = "";

      if (!isMultiple) {
        const selectId = oControlHost.generateUniqueID();
        console.log("Unique ID: singleSelect ", selectId);
        sHtml += `
                <style>
                  .custom-dropdown {
                    padding: 5px;
                    font-size: 14px;
                    border: 1px solid #ccc;
                    border-radius: 3px;
                  }
                  .custom-dropdown option {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  }
                </style>
                <select id="${selectId}" class="custom-dropdown">
                  <option value="">-- Select an option --</option>
              `;
        if (this.m_oDataStore && this.m_oDataStore.rowCount) {
          if (this.hasGrouping) {
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
            for (const groupKey in groups) {
              const group = groups[groupKey];
              sHtml += `<optgroup label="${group.display}">`;
              group.options.forEach((option) => {
                sHtml += `<option value="${option.use}" data-group="${groupKey}" title="${option.display}">${option.display}</option>`;
              });
              sHtml += `</optgroup>`;
            }
          } else {
            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const useValue = this.m_oDataStore.getCellValue(i, valueUseCol);
              const dispValue = this.m_oDataStore.getCellValue(i, valueDispCol);
              sHtml += `<option value="${useValue}" title="${dispValue}">${dispValue}</option>`;
            }
          }
        }
        sHtml += `</select>`;
        oControlHost.container.innerHTML = sHtml;
        this.m_sel = oControlHost.container.querySelector(`#${selectId}`);
        console.log(this.m_sel)

        if (this.mainParamValues && this.mainParamValues.length > 0) {
          this.m_sel.value = this.mainParamValues[0];
        }

        this.m_sel.addEventListener("change", () => {
          console.log("singleSelect Changed")
          oControlHost.valueChanged();
          oControlHost.validStateChanged();
          if (autoSubmit) {
            oControlHost.finish();
          }
        });

        
      } else {
        const containerId = oControlHost.generateUniqueID();
        console.log("Unique ID: Container ", containerId);
        sHtml += `
                <style>
                  .checkbox-container {
                    border: 1px solid #ccc;
                    padding: 10px;
                    border-radius: 3px;
                    max-height: 300px;
                    overflow-y: auto;
                    margin-bottom: 10px;
                    overflow-x: hidden;
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
                  .group-header {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    margin-bottom: 5px;
                  }
                  .group-header:focus {
                    outline: 2px solid #0078d7;
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
                  .display-text {
                    display: inline-block;
                    max-width: 150px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    vertical-align: middle;
                  }
                </style>
                <div id="${containerId}" class="checkbox-container">
              `;
        if (this.m_oDataStore && this.m_oDataStore.rowCount) {
          if (this.hasGrouping) {
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
            for (const groupKey in groups) {
              const group = groups[groupKey];
              const isInitiallyExpanded = !groupInitiallyCollapsed;
              const expandCollapseIndicator = isInitiallyExpanded ? "▼" : "►";
              sHtml += `<div class="group-container" data-group="${groupKey}">`;
              sHtml += `<div class="group-header" data-group="${groupKey}" tabindex="0">
                            <input type="checkbox" class="group-checkbox" data-group="${groupKey}" />
                            <span class="expand-collapse-indicator">${expandCollapseIndicator}</span>
                            <span class="group-label-text display-text" title="${group.display}">${group.display}</span>
                          </div>`;
              sHtml += `<div class="group-items ${isInitiallyExpanded ? "" : "collapsed"}">`;
              group.items.forEach((item) => {
                sHtml += `<label class="checkbox-label">
                              <input type="checkbox" value="${item.use}" data-group="${groupKey}" />
                              <span class="display-text" title="${item.display}">${item.display}</span>
                            </label>`;
              });
              sHtml += `</div></div>`;
            }
          } else {
            for (let i = 0; i < this.m_oDataStore.rowCount; i++) {
              const useValue = this.m_oDataStore.getCellValue(i, valueUseCol);
              const dispValue = this.m_oDataStore.getCellValue(i, valueDispCol);
              sHtml += `<label class="checkbox-label">
                            <input type="checkbox" value="${useValue}" />
                            <span class="display-text" title="${dispValue}">${dispValue}</span>
                          </label>`;
            }
          }
        }
        sHtml += `</div>`;
        sHtml += `<button class="MyApplyButton btnApply">Apply</button>`;
        oControlHost.container.innerHTML = sHtml;

        if (this.hasGrouping) {
          this.m_groupContainers = Array.from(oControlHost.container.querySelectorAll(".group-container"));
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
          this.m_itemCheckboxes.forEach((itemCb) => {
            itemCb.checked = this.mainParamValues.includes(itemCb.value);
          });

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
          this.m_checkboxes.forEach((cb) => {
            cb.checked = this.mainParamValues.includes(cb.value);
            cb.addEventListener("change", () => {
              console.log(`Checkbox with value ${cb.value} changed. Checked: ${cb.checked}`);
              oControlHost.valueChanged();
            });
          });
        }

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
            header.addEventListener("keydown", (event) => {
              if (event.key === " " || event.key === "Spacebar" || event.keyCode === 32) {
                event.preventDefault();
                const groupItems = container.querySelector(".group-items");
                const indicator = header.querySelector(".expand-collapse-indicator");
                groupItems.classList.toggle("collapsed");
                indicator.innerHTML = groupItems.classList.contains("collapsed") ? "►" : "▼";
              }
            });
          });

          this.m_groupCheckboxes.forEach((groupCb) => {
            groupCb.addEventListener("change", () => {
              const groupKey = groupCb.getAttribute("data-group");
              const groupContainer = oControlHost.container.querySelector(`.group-container[data-group="${groupKey}"]`);
              const itemCheckboxes = groupContainer.querySelectorAll('.group-items input[type="checkbox"]');
              itemCheckboxes.forEach((itemCb) => {
                itemCb.checked = groupCb.checked;
              });
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
        return this.m_sel; //&& this.m_sel.value !== "";
      } else {
        if (this.hasGrouping) {
          return this.m_itemCheckboxes && this.m_itemCheckboxes.some((cb) => cb.checked);
        } else {
          return this.m_checkboxes && this.m_checkboxes.some((cb) => cb.checked);
        }
      }
    }

    /**
     * Returns the parameter(s) for submission.
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
/* 926 */
