// ResetAllFilters.js
define(function () {
    "use strict";
  
    class ResetAllParameters {
      draw(oControlHost) {
        let controlNames = oControlHost.configuration.ControlNames || "";
        let controlNamesArray = controlNames.split(",").map((item) => item.trim()).filter(item => item);
        const el = oControlHost.container;
        el.innerHTML =
          "<style>" +
          ".buttonContainer { display: flex; gap: 10px; }" +
          ".myButton { height:32px; width:120px; cursor:pointer; margin-left:10px; color:#4178BE; font-size:14px; padding:6px 12px 6px 12px; background-color:white; border:1px solid #4178BE; }" +
          ".myButton:hover { background-color:#4178BE; color:white; border:1px solid #4178BE; }" +
          "</style>" +
          '<div class="buttonContainer">' +
          '<button class="myButton btnClear" type="button">Clear All</button>' +
          '<button class="myButton btnReset" type="button">Reset Prompts</button>' +
          '</div>';
  
        el.querySelector(".btnClear").onclick = this.f_clearButtonClick.bind(this, oControlHost, controlNamesArray);
        el.querySelector(".btnReset").onclick = this.f_resetButtonClick.bind(this, oControlHost, controlNamesArray);
      }
  
      async f_clearButtonClick(oControlHost, controlArray) {
        try {
          // If no specific controls are provided, find all custom controls
          if (controlArray.length === 0) {
            const customControls = oControlHost.page.getControlsByNodeName("customControl");
            console.log(`Found ${customControls.length} custom controls`);
            controlArray = customControls.map(control => control.name);
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
              if (instance && typeof instance.clearAllSelections === 'function') {
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
          const successCount = results.filter(result => result).length;
          
          console.log(`Successfully cleared ${successCount} out of ${controlArray.length} controls`);
          
        } catch (err) {
          console.error("Error clearing controls:", err);
        }
        
        // Clear parameter values through the standard API
        oControlHost.page.application.clearParameterValues();
        oControlHost.finish();
      }
  
      async f_resetButtonClick(oControlHost, controlArray) {
        try {
          // If no specific controls are provided, find all custom controls
          if (controlArray.length === 0) {
            const customControls = oControlHost.page.getControlsByNodeName("customControl");
            console.log(`Found ${customControls.length} custom controls`);
            controlArray = customControls.map(control => control.name);
          }
          
          console.log(`Attempting to reset ${controlArray.length} controls: ${controlArray.join(", ")}`);
          
          // Process each control
          const controlPromises = controlArray.map(async (controlName) => {
            try {
              const control = oControlHost.page.getControlByName(controlName);
              if (!control) {
                console.warn(`Control not found: ${controlName}`);
                return false;
              }
              
              const instance = await control.instance;
              if (instance && typeof instance.resetToInitial === 'function') {
                instance.resetToInitial();
                console.log(`Reset control: ${controlName}`);
                return true;
              } else {
                console.warn(`Control ${controlName} does not have resetToInitial method`);
                return false;
              }
            } catch (err) {
              console.error(`Error accessing control ${controlName}:`, err);
              return false;
            }
          });
          
          // Wait for all promises to resolve
          const results = await Promise.all(controlPromises);
          const successCount = results.filter(result => result).length;
          
          console.log(`Successfully reset ${successCount} out of ${controlArray.length} controls`);
          
        } catch (err) {
          console.error("Error resetting controls:", err);
        }
        
        // Reset parameter values to initial values through the standard API
        oControlHost.page.application.resetParameterValues();
        oControlHost.finish();
      }
    }
  
    return ResetAllParameters;
  });