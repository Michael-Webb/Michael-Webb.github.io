// ResetAllFilters.js
define(function () {
  "use strict";

  class ResetAllParameters {
    draw(oControlHost) {
      let controlNames = oControlHost.configuration.ControlNames || "";
      let controlNamesArray = controlNames
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);
      const el = oControlHost.container;
      el.innerHTML =
        "<style>" +
        ".myButton { height:32px; width:120px; cursor:pointer; margin-left:10px; color:#4178BE; font-size:14px; padding:6px 12px 6px 12px; background-color:white; border:1px solid #4178BE; }" +
        ".myButton:hover { background-color:#4178BE; color:white; border:1px solid #4178BE; }" +
        "</style>" +
        '<button class="myButton btnClear" type="button">Clear All Filters</button>';

      el.querySelector(".btnClear").onclick = this.f_clearButtonClick.bind(this, oControlHost, controlNamesArray);
    }

    async f_clearButtonClick(oControlHost, controlArray) {
      try {
        // If no specific controls are provided, we need to find all custom controls
        // that might be MultiSelect controls
        if (controlArray.length === 0) {
          // Since there's no direct way to get all controls, we can try identifying
          // them by node name for custom controls
          const customControls = oControlHost.page.getControlsByNodeName("customControl");
          console.log(`Found ${customControls.length} custom controls`);

          // We'll use all custom controls if no specific ones were provided
          controlArray = customControls.map((control) => control.name);
        }

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

      // Optionally clear parameter values through the standard API
      oControlHost.page.application.clearParameterValues();
      oControlHost.finish();
    }
  }

  return ResetAllParameters;
});
//v846
