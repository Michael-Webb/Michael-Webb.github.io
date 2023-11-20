define(["baglass/core-client/js/core-client/ui/ProgressToast"], function (n) {
  "use strict";

  var CognosModule = (function () {


    CognosModule.prototype.initialize = function initialize() {
      var _this = this;

      var mapContent = this.canvas.getContent(STORE_MAP_CONTENT_ID);
      var state = mapContent.getFeature("state");
      state.whenStatusChanges(state.STATUS.RENDERED).then(function () {
        window.parent.postMessage("dashboard.ready", "*");
        __getDashboardAPI();
      });

      this._createProgressToast = function () {
        return new n();
      };

      try {
        this.progressBar = this._createProgressToast();
        this.progressBar.show({
          type: "file",
          id: "idUploadUIElement",
          name: "uploadfiles",
          style: "display: none;",
          multiple: !1,
        });
        this.progressBar.progress();
      } catch (error) {
        console.log(error);
      }
    };

    return CognosModule;
  })();

});
