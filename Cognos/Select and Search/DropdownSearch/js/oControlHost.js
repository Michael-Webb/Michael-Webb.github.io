define(() => {
  "use strict";

  class AdvancedControl {
    initialize(oControlHost, fnDoneInitializing) {
      console.log("initialize", oControlHost);
      console.log("oControlHost", oControlHost);
      fnDoneInitializing();
    }
    destroy(oControlHost) {
      console.log("draw");
    }
    draw(oControlHost) {
      console.log("draw");
    }
    show(oControlHost) {
      console.log("show");
    }
    hide(oControlHost) {
      console.log("hide");
    }
    isInValidState(oControlHost) {
      console.log("isInValidState");
    }
    getParameters(oControlHost) {
      console.log("getParameters");
    }
    setData(oControlHost, oDataStore) {
      console.log("setData");
      console.log("oDataStore", oDataStore);
    }
  }

  return AdvancedControl;
});
