/**
 * @typedef {Object} Parameter
 * @property {string} parameter - The parameter name.
 * @property {Array.<{use: string, display?: string}>} values - The array of value objects.
 */

/**
 * @typedef {Object} RangeParameter
 * @property {string} parameter - The parameter name.
 * @property {Array.<{start: {use: string, display?: string}, end: {use: string, display?: string}}>} values - The array of range value objects.
 */

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
      // Example: create a <select> element and store as this.m_sel
      // this.m_sel = document.createElement("select");
      // oControlHost.container.appendChild(this.m_sel);
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
     * @returns {boolean} True if the control is in a valid state, false otherwise.
     */
    isInValidState(oControlHost) {
      console.log("isInValidState");
      // Replace with actual validation logic; example returns true if a selection exists
      return (this.m_sel && this.m_sel.selectedIndex > 0);
    }

    /**
     * Retrieves the current parameter values from the control. This method is optional.
     *
     * @param {object} oControlHost - The host object for this control.
     * @returns {Array.<Parameter>|Array.<RangeParameter>|null} The array of Parameter or RangeParameter objects, or null if none.
     */
    getParameters(oControlHost) {
      console.log("getParameters");
      // Example implementation using a <select> stored in this.m_sel
      if (!this.m_sel || this.m_sel.selectedIndex < 1) {
        return null;
      }
      const { value } = this.m_sel.options[this.m_sel.selectedIndex];
      return [
        {
          parameter: "parameter1",
          values: [{ use: value }]
        }
      ];
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
      this.m_oDataStores = this.m_oDataStores || {};
      this.m_oDataStores[oDataStore.name] = oDataStore;
    }
  }

  return AdvancedControl;
});
