define(function () {
  "use strict";

  class ResetAllParameters {
    draw(oControlHost) {
      const el = oControlHost.container;
      el.innerHTML =
        "<style>" +
        ".myButton { height:32px; width:120px; cursor:pointer; margin-left:10px; color:#4178BE; font-size:14px; padding:6px 12px 6px 12px; background-color:white; border:1px solid #4178BE; }" +
        ".myButton:hover { background-color:#4178BE; color:white; border:1px solid #4178BE; }" +
        "</style>" +
        '<button class="myButton btnClear" type="button">Clear</button>';

      el.querySelector(".btnClear").onclick = this.f_clearButtonClick.bind(this, oControlHost);
    }
    f_clearButtonClick(oControlHost) {
      const aControls = oControlHost.page.getControlsByName(true);
      console.log("aControls",aControls)
      oControlHost.page.application.clearParameterValues();
      oControlHost.finish();
    }
  }

  return ResetAllParameters;
});
