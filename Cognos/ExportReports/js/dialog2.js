define(() => {
    "use strict";
    
    // Action handler class to handle specific actions
    class ActionHandler {
      constructor(actionName) {
        this.actionName = actionName;
        this.timestamp = Date.now();
      }
      
      execute(buttonId) {
        console.log(`Executing '${this.actionName}' action (triggered by button '${buttonId}') at ${this.timestamp}.`);
        // Action-specific logic here
      }
  
      logDetails(buttonId) {
        console.log(`--- Details for ${this.actionName} (button: ${buttonId}) ---`);
        console.log(`   Timestamp: ${this.timestamp}`);
        console.log(`   'this' inside general callback refers to:`, this);
        console.log(`---------------------------------------------`);
      }
    }
    
    // Advanced control class to manage the dialog
    class AdvancedControl {
      constructor() {
        // Control initialization
      }
      
      initialize(oControlHost, fnDoneInitializing) {
        // Assuming Application is passed or available in the scope
        this.Application = window.Application; // Or however Application is accessed
        fnDoneInitializing();
      }
      
      draw(oControlHost) {
        // Create instances of action handlers
        const saveHandler = new ActionHandler("Save Operation");
        const cancelHandler = new ActionHandler("Cancel Operation");
        const maybeHandler = new ActionHandler("Maybe Operation");
        
        const dialogWithCallbackScope = {
          type: "info",
          title: "Confirm Action",
          message: "Please choose an action.",
          buttons: [
            { defaultId: "ok", text: "Save Changes", type: "primary" },
            { defaultId: "maybe", text: "Maybe Later" },
            "cancel",
          ],
          callback: {
            general: function (result) {
              console.log(`General callback triggered by button: ${result.btn}`);
              
              if (typeof this.execute === "function") {
                this.execute(result.btn);
              } else {
                console.warn(`No 'execute' method found on 'this' for button '${result.btn}'. Context:`, this);
              }
              
              if (typeof this.logDetails === "function") {
                this.logDetails(result.btn);
              }
            },
          },
          callbackScope: {
            ok: saveHandler,
            cancel: cancelHandler,
            maybe: maybeHandler,
          },
        };
        
        console.log("Opening dialog with callbackScope...");
        
        this.Application.GlassContext.appController.glassContext
          .getCoreSvc(".Dialog")
          .createDialog(dialogWithCallbackScope);
      }
    }
    
    return AdvancedControl;
  });