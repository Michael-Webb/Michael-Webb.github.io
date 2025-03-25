// ResetAllFilters.js
define(function () {
  "use strict";

  class ResetAllParameters {
    constructor() {
      this.isValid = false; // Track validity state
    }

    initialize(oControlHost, fnDoneInitializing) {
      fnDoneInitializing();
    }
    draw(oControlHost) {
      let controlNames = oControlHost.configuration.ControlNames || "";
      let controlNamesArray = controlNames
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
      const el = oControlHost.container;

      // Create the styles and container first
      el.innerHTML =
        "<style>" +
        ".buttonContainer { display: flex; gap: 10px; }" +
        ".myButton { min-height:36px; min-width:64px; cursor:pointer; margin-left:16px; color:#4178BE; font-size:14px; padding:0px 24px; background-color:white; border:1px solid #4178BE; }" +
        ".myButton:hover { background-color:#4178BE; color:white; border:1px solid #4178BE; }" +
        ".btnSubmit:disabled { opacity: 0.5; cursor: default; }" +
        "</style>" +
        '<div class="buttonContainer">' +
        '<button class="myButton btnClear" type="button" title="Clear all filter values">Clear All</button>' +
        '<button class="myButton btnReset" type="button" title="Reset all filters to initial state">Reset All</button>' +
        '<button id="submitButton" class="myButton btnSubmit" type="button" title="Apply the selected filters" disabled>Submit</button>' +
        "</div>";

      // Add event listeners to buttons
      el.querySelector(".btnClear").onclick = this.f_clearButtonClick.bind(this, oControlHost, controlNamesArray);
      el.querySelector(".btnReset").onclick = this.f_resetButtonClick.bind(this, oControlHost, controlNamesArray);

      // Get a reference to the existing submit button and add its event listener
      const submitButton = el.querySelector("#submitButton");
      submitButton.onclick = async () => {
        const isValid = await this.checkAllControlsValidity(oControlHost);
        if (isValid) {
          oControlHost.finish();
        }
      };

      // Set up a debounced check validity function if needed.
      this.debouncedCheckValidity = debounce(() => {
        this.checkAllControlsValidity(oControlHost);
      }, 100);

      // Optionally, you can still have your MutationObserver here if you want to catch other DOM changes:
      const observer = new MutationObserver(() => {
        this.debouncedCheckValidity();
      });
      observer.observe(oControlHost.container, {
        subtree: true,
        attributes: true,
        childList: true,
      });
      this.observer = observer;

      // Set the global callback so that MultiSelect changes trigger a validity check.
      window.onMultiSelectChange = () => {
        this.checkAllControlsValidity(oControlHost);
      };

      // Perform the initial validity check.
      this.checkAllControlsValidity(oControlHost);
    }

    async f_clearButtonClick(oControlHost, controlArray) {
      try {
        console.log(`Attempting to clear ${controlArray.length} controls: ${controlArray.join(", ")}`);

        // Process each control
        const controlPromises = controlArray.map(async (controlName) => {
          try {
            const control = oControlHost.page.getControlByName(controlName);
            if (!control) {
              console.warn(`Control not found: ${controlName}`);
              return false;
            }

            const instance = await control.instance;
            if (instance && typeof instance.clearAllSelections === "function") {
              instance.clearAllSelections();
              console.log(`Cleared control: ${controlName}`);
              return true;
            } else {
              console.warn(`Control ${controlName} does not have clearAllSelections method`);
              return false;
            }
          } catch (err) {
            console.error(`Error accessing control ${controlName}:`, err);
            return false;
          }
        });

        // Wait for all promises to resolve
        const results = await Promise.all(controlPromises);
        const successCount = results.filter((result) => result).length;

        console.log(`Successfully cleared ${successCount} out of ${controlArray.length} controls`);
      } catch (err) {
        console.error("Error clearing controls:", err);
      }

      // Clear parameter values through the standard API
    //   oControlHost.page.application.clearParameterValues();
      oControlHost.finish();
    }

    async f_resetButtonClick(oControlHost, controlArray) {
      try {
        console.log(`Attempting to reset ${controlArray.length} controls: ${controlArray.join(", ")}`);

        // Process each control
        const controlPromises = controlArray.map(async (controlName) => {
          try {
            const control = oControlHost.page.getControlByName(controlName);
            if (!control) {
              console.warn(`Control not found: ${controlName}`);
              return false;
            }

            const instance = await control.instance;
            if (instance && typeof instance.resetToInitial === "function") {
              instance.resetToInitial();
              console.log(`Reset control: ${controlName}`);
              return true;
            } else {
              console.warn(`Control ${controlName} does not have resetToInitial method`);
              return false;
            }
          } catch (err) {
            console.error(`Error accessing control ${controlName}:`, err);
            return false;
          }
        });

        // Wait for all promises to resolve
        const results = await Promise.all(controlPromises);
        const successCount = results.filter((result) => result).length;

        console.log(`Successfully reset ${successCount} out of ${controlArray.length} controls`);
      } catch (err) {
        console.error("Error resetting controls:", err);
      }

      // Reset parameter values to initial values through the standard API
    //   oControlHost.ValidStateChanged()
      oControlHost.finish();
    }

    async checkAllControlsValidity(oControlHost) {
      try {
        // Get control names from configuration.
        let controlNames = oControlHost.configuration.ControlNames || "";
        let controlNamesArray = controlNames
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);

        // Use control names from configuration only.
        let customControls = controlNamesArray.map((name) => oControlHost.page.getControlByName(name)).filter((c) => c);
        console.log(`Using ${customControls.length} controls from configuration`,customControls,controlNamesArray);

        // Determine overall validity:
        // If any MultiSelect control (identified by having clearAllSelections) has changed from its initial state,
        // then overall validity is true.
        let overallValidity = false;
        const controlPromises = customControls.map(async (control) => {
          try {
            const controlName = control.name || "unnamed";
            const instance = await control.instance;
            if (instance && typeof instance.clearAllSelections === "function") {
              // Use the instance’s isInValidState() method if available,
              // otherwise fall back on a stored change flag (hasChanged)
              const controlValid = instance.isInValidState
                ? instance.isInValidState()
                : instance.hasChanged !== undefined
                ? instance.hasChanged
                : false;
              console.log(`Control ${controlName} validity: ${controlValid}`);
              if (controlValid) {
                overallValidity = true;
              }
            }
          } catch (err) {
            console.error(`Error checking control ${control?.name}:`, err);
          }
        });
        await Promise.all(controlPromises);
        console.log(`Overall form validity: ${overallValidity}`);
        this.isValid = overallValidity;

        // Update the submit button's disabled state.
        const submitButton = document.getElementById("submitButton");
        if (submitButton) {
          submitButton.disabled = !overallValidity;
          console.log(`Submit button ${overallValidity ? "enabled" : "disabled"}`);
        }
        return overallValidity;
      } catch (err) {
        console.error("Error checking controls validity:", err);
        oControlHost.validStateChanged();
        return false;
      }
    }

    // Make sure to clean up the interval in destroy method
    destroy(oControlHost) {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  return ResetAllParameters;
});
//v1144