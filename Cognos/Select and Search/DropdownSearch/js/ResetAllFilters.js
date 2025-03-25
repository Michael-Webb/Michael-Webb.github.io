define(function () {
  "use strict";

  class ResetAllParameters {
    draw(oControlHost) {
      let controlNames = oControlHost.configuration.ControlNames;
      let controlNamesArray = controlNames.split(",").map((item) => item.trim());
      const el = oControlHost.container;
      el.innerHTML =
        "<style>" +
        ".myButton { height:32px; width:120px; cursor:pointer; margin-left:10px; color:#4178BE; font-size:14px; padding:6px 12px 6px 12px; background-color:white; border:1px solid #4178BE; }" +
        ".myButton:hover { background-color:#4178BE; color:white; border:1px solid #4178BE; }" +
        "</style>" +
        '<button class="myButton btnClear" type="button">Clear</button>';

      el.querySelector(".btnClear").onclick = this.f_clearButtonClick.bind(this, oControlHost, controlNamesArray);
    }

    f_clearButtonClick(oControlHost, controlArray) {
      // Loop through each control name in the array
      controlArray.forEach((controlName) => {
        const aControls = oControlHost.page.getControlsByName(controlName);
        console.log(`Controls for "${controlName}":`, aControls);
      });

      oControlHost.page.application.clearParameterValues();
      oControlHost.finish();
    }
  }

  return ResetAllParameters;
});
