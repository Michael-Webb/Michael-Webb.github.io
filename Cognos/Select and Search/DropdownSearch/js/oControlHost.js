/**
 * @class AdvancedControl
 * @classdesc Represents a custom Cognos control with lifecycle methods.
 */
define(() => {
  "use strict";

  /**
   * Initializes the control. If implemented, fnDoneInitializing must be called 
   * when initialization is complete, or a Promise must be returned.
   *
   * @param {object} oControlHost - The host object for this control.
   * @param {Function} fnDoneInitializing - Callback to signal initialization completion.
   * @returns {void}
   */
  class AdvancedControl {
    initialize(oControlHost, fnDoneInitializing) {
      console.log("initialize", oControlHost);
      console.log("oControlHost", oControlHost);
      fnDoneInitializing();
    }

    /**
     * Draws the control's UI. This method is optional if the control has no UI.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    draw(oControlHost) {
      console.log("draw");
    }

    /**
     * Called when the control is being shown (displayed). This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    show(oControlHost) {
      console.log("show");
    }

    /**
     * Called when the control is being hidden (not displayed). This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    hide(oControlHost) {
      console.log("hide");
    }

    /**
     * Called when the control is being destroyed. Perform any necessary cleanup. This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    destroy(oControlHost) {
      console.log("destroy");
    }

    /**
     * Determines whether the control is in a valid state. This method is optional.
     * Used to control enabling of "Next" or "Finish" buttons in prompts.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    isInValidState(oControlHost) {
      console.log("isInValidState");
    }

    /**
     * Retrieves the current parameter values from the control. This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {void}
     */
    getParameters(oControlHost) {
      console.log("getParameters");
    }

    /**
     * Passes authored data into the control for use in the draw method. This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @param {object} oDataStore - The data store to be used by the control.
     * @returns {void}
     */
    setData(oControlHost, oDataStore) {
      console.log("setData");
      console.log("oDataStore", oDataStore);
      this.m_oDataStores[oDataStore.name] = oDataStore;
    }
  }

  return AdvancedControl;
});
