define(["baglass/core-client/js/core-client/ui/ProgressToast"], function (
  toast
) {
  "use strict";
  function adminModule() {}

  adminModule.prototype.initialize = function (
    oControlHost,
    fnDoneInitializing
  ) {
    console.log("start");
    this.pToastdSR = new toast();
    this.pToastdSR.show("Download Specifications: Collecting objects");
    this.pToastdSR.hideButton("cancel");
    this.pToastdSR.setMessage("Download Specifications: Writing file");
    this.pToastdSR.setComplete(0x64, {
      isComplete: 0x1,
    });
    console.log('End')
  };

  return adminModule;
});
