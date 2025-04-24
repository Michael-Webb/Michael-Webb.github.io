define([], function () {
  "use strict";

  class BasicControl {
    initialize(oControlHost, fnDoneInitializing) {
        console.log("Initialize",oControlHost.page.application)
      fnDoneInitializing();
    }

    draw(oControlHost) {
        console.log("Draw",oControlHost.page.application)
    }
  }

  return BasicControl;
});
//v1
