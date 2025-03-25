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

    f_clearButtonClick(oControlHost, controlArray) {
      // Call the global function exposed by MultiSelect.js
      if (typeof window.resetAllMultiSelects === "function") {
        const success = window.resetAllMultiSelects(controlArray.length > 0 ? controlArray : null);
        if (success) {
          console.log(`Cleared ${controlArray.length > 0 ? "specific" : "all"} MultiSelect controls`);
        } else {
          console.warn("No MultiSelect registry found. Make sure MultiSelect.js has been loaded.");
        }
      } else {
        console.warn(
          "resetAllMultiSelects function not found in global scope. Make sure MultiSelect.js has been loaded."
        );
      }

      // Still clear parameter values through the standard API
      oControlHost.page.application.clearParameterValues();
      oControlHost.finish();
    }
  }

  return ResetAllParameters;
});
//v825