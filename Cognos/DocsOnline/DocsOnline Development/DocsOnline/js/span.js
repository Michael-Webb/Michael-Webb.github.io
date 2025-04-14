define(() => {
    "use strict";
    class AdvancedControl {
      initialize(oControlHost, fnDoneInitializing) {
        fnDoneInitializing();
      }
  
      draw(oControlHost) {
        let spanNodeList = document.querySelectorAll('span[data-id^="cc_"]');
        console.log(spanNodeList)
      }
    }
  
    return AdvancedControl;
  });
  