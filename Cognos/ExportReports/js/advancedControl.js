/*
# Cognos Custom Controls Documentation

This document provides an overview of the available APIs for creating Cognos custom controls. It covers the various control types, their members, methods, and examples of usage. Use this reference to help build, debug, and enhance your custom controls.

---

## Table of Contents

1. [Control Base API](#control-base-api)
2. [Control Extensions](#control-extensions)
   - [BlockControl](#blockcontrol)
   - [CustomControl](#customcontrol)
   - [ImageControl](#imagecontrol)
   - [ListControl](#listcontrol)
   - [PromptControl](#promptcontrol)
   - [TextItemControl](#textitemcontrol)
   - [ValuePromptControl](#valuepromptcontrol)
3. [Parameter Objects](#parameter-objects)
   - [ParameterValue JSON Object](#parametervalue-json-object)
   - [RangeParameter JSON Object](#rangeparameter-json-object)
4. [oControlHost API](#ocontrolhost-api)
   - [oControlHost Members](#ocontrolhost-members)
   - [oControlHost.control](#ocontrolhostcontrol)
   - [oControlHost.page](#ocontrolhostpage)
   - [oControlHost.page.application](#ocontrolhostpageapplication)
   - [Other oControlHost Methods](#other-ocontrolhost-methods)

---

## 1. Control Base API

**Possible Node Names:**  
`crosstab`, `fieldSet`, `hyperlink`, `image`, `repeaterTable`, `table`, `viz`, `threeDCombinationChart`, `threeDScatterChart`, `bubbleChart`, `v2_bubbleChart`, `bulletChart`, `combinationChart`, `v2_combinationChart`, `gaugeChart`, `marimekkoChart`, `metricsChart`, `paretoChart`, `v2_paretoChart`, `pieChart`, `v2_pieChart`, `polarChart`, `progressiveChart`, `v2_progressiveChart`, `radarChart`, `scatterChart`, `v2_scatterChart`, `winLossChart`, `mapChart`

### Members

- **`oControlHost.control.element`** (string, *read-only*):  
  The control's HTML element. **Note:** Do not assume anything about its node type or content.

- **`oControlHost.control.name`** (string, *read-only*):  
  The control’s authored name.

- **`oControlHost.control.nodeName`** (string, *read-only*):  
  The control's report specification node name.

### Methods

- **`.getDisplay(): {boolean}`**  
  Returns the current display state of the control.

- **`.getVisible(): {boolean}`**  
  Returns the current visibility state of the control.

- **`.setDisplay(sDisplay)`**  
  Sets the display style of the control.

- **`.setVisible(sVisible)`**  
  Sets the visibility of the control.

- **`.toggleDisplay()`**  
  Toggles the control’s display state.

- **`.toggleVisibility()`**  
  Toggles the control’s visibility.

---

## 2. Control Extensions

Each of the following control types extends the base control interface with additional members and methods.

---

### BlockControl

**Possible Node Name:** `"block"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)

#### Methods

- **`.setBackgroundColor(sColor)`**  
  Sets the background color.

- **`.setColor(sColor)`**  
  Sets the text color.

- **`.setDisplay(bDisplay)`**  
  Sets the display property (using a boolean).

- **`.setHeights(sCssLength, bTransition)`**  
  Sets the height (with an optional transition flag).

- **`.setWidths(sCssLength, bTransition)`**  
  Sets the width (with an optional transition flag).

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

### CustomControl

**Possible Node Name:** `"customControl"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)
- **`.instance`**: Promise (*async, read-only*)  
  The control’s module instance. Because modules load asynchronously, the instance might not be immediately available.

  **Examples:**
  
  1. **Single Instance:**
     ```javascript
     const oModuleInstance = await oControl.instance;
     // Module instance is now available.
     ```
  
  2. **Multiple Instances:**
     ```javascript
     const aPromises = [oControl1.instance, oControl2.instance, oControl3.instance];
     const aModuleInstances = await Promise.all(aPromises);
     // All module instances are now available.
     ```

#### Methods

- **`.getDataStore(sName)`**  
  Retrieves a data store by name from the control. Returns `null` if not found.

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

### ImageControl

**Possible Node Name:** `"image"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)
- **`.src`**: string  
  The image source URL.

#### Methods

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

### ListControl

**Possible Node Name:** `"list"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)

#### Methods

- **`.setColumnDisplay(iColumnIndex, bDisplay)`**  
  Sets the display state for a given column.  
  **Parameters:**
  - `iColumnIndex` (integer): Zero-based column index.
  - `bDisplay` (boolean): `true` to display the column; `false` to hide it.
  
  **Example:**
  ```javascript
  oPage.getControlByName("List1").setColumnDisplay(0, false);
  ```

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

### PromptControl

**Possible Node Names:**  
`selectWithSearch`, `selectDate`, `selectDateTime`, `selectTime`, `selectInterval`, `selectWithTree`, `textBox`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)
- **`.parameter`**: string (*read-only*)  
  The parameter name associated with the prompt.

#### Methods

- **`.addValues(aValues)`**  
  Adds an array of values to the control.

- **`.clearValues()`**  
  Clears all current values.

- **`.getValues(bAllOptions)`**  
  Retrieves the current values.
  - **Parameter:**  
    - `bAllOptions` (boolean, optional):  
      For value prompts, if `true` returns all options; if `false` or omitted, returns only selected options.

- **`.setValidator(fnValidationCallback)`**  
  Sets a custom validation function for the prompt.

- **`.setValues(aValues)`**  
  Sets the control’s values.

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

#### Types

- **ValidationCallbackFunction(aValues) → {Boolean}**  
  A callback that receives an array (from `ParameterValue` or `ParameterRangeValue`) and returns:
  - `true` if all values are valid
  - `false` if any value is invalid
  
  **Example:**
  ```javascript
  const fnPhoneNumberValidator = (aValues) =>
    !aValues.some(value => !value.use.match(/^\(\d\d\d\) \d\d\d\-\d\d\d\d$/));
  ```

---

### TextItemControl

**Possible Node Name:** `"textItem"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)
- **`.text`**: string  
  The text content of the item.
  
  **Examples:**
  1. Set text:
     ```javascript
     oPage.getControlByName("TextItem1").text = "Hello";
     ```
  2. Append text:
     ```javascript
     oPage.getControlByName("TextItem1").text += "Text to append";
     ```

#### Methods

- **`.setBackgroundColor(sColor)`**  
  Sets the background color.

- **`.setColor(sColor)`**  
  Sets the text color.

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

### ValuePromptControl

**Possible Node Name:** `"selectValue"`

#### Members

- **`.element`**: string (*read-only*)
- **`.name`**: string (*read-only*)
- **`.nodeName`**: string (*read-only*)
- **`.parameter`**: string (*read-only*)
- **`.autoSubmit`**: boolean  
  **Example:**
  ```javascript
  oPage.getControlByName("ValuePrompt1").autoSubmit = false;
  ```

#### Methods

- **`.addValues(aValues)`**  
  Adds an array of values. For controls that do not support multiple values, only the first value is used.
  
  **Parameter:**  
  - `aValues` (Array): Contains `ParameterValue` or `ParameterRangeValue` objects.

- **`.clearValues()`**  
  Clears or deselects all values (for text prompts, empties the text; for value prompts, removes all selections).

- **`.getValues(bAllOptions)`**  
  Retrieves the current values.
  - **Parameter:**  
    - `bAllOptions` (boolean, optional): If `true`, returns all available options; if `false` or omitted, returns only selected options.

- **`.setValidator(fnValidationCallback)`**  
  Sets a custom validation function.
  
  **Parameter:**  
  - `fnValidationCallback`: A function of type `PromptControl~ValidationCallbackFunction`.

- **`.setValues(aValues)`**  
  Sets the control’s values.

- **Inherited methods from Control:**  
  `.getDisplay()`, `.getVisible()`, `.setDisplay()`, `.setVisible()`, `.toggleDisplay()`, `.toggleVisibility()`

---

## 3. Parameter Objects

These JSON object structures represent the values passed to prompt controls.

### ParameterValue JSON Object

An example of a parameter value object:
```json
{
  "parameter": "countries",
  "values": [
    {
      "use": "[a].[b].[c]",
      "display": "Canada"
    },
    {
      "use": "[d].[e].[f]",
      "display": "United States"
    }
  ]
}
```

### RangeParameter JSON Object

An example of a range parameter value:
```json
{
  "parameter": "dates",
  "values": [
    {
      "start": {
        "use": "2007-01-01",
        "display": "January 1, 2007"
      },
      "end": {
        "use": "2007-12-31",
        "display": "December 31, 2007"
      }
    }
  ]
}
```

---

## 4. oControlHost API

The `oControlHost` object provides the interface for interacting with the Cognos environment from within a custom control.

### oControlHost Members

- **`oControlHost.configuration`**  
  The authored configuration JSON (or `null` if none was provided). Use this to parameterize your control.

- **`oControlHost.container`**  
  The HTML element into which the control is rendered.

- **`oControlHost.control`**  
  The public control interface (of type `CustomControl`).

- **`oControlHost.isDestroyed`** (boolean)  
  Indicates whether the control has been destroyed (`true` if destroyed, otherwise `false`). Useful in asynchronous operations.

- **`oControlHost.isVisible`** (boolean)  
  Indicates whether the control is visible.

- **`oControlHost.loadingText`** (string)  
  Text displayed until the control’s `draw` method is called. Useful during asynchronous initialization.

- **`oControlHost.locale`**  
  The locale string (*read-only*).

- **`oControlHost.page`**  
  The page object that contains the control.

---

### oControlHost.control

This is a shortcut for accessing the control’s public interface.

#### Members

- **`oControlHost.control.element`**: The control's HTML element.
- **`oControlHost.control.name`**: The control's authored name.
- **`oControlHost.control.nodeName`**: The report specification node name.

#### Methods

- `.getDisplay(): {boolean}`
- `.getVisible(): {boolean}`
- `.setDisplay(sDisplay)`
- `.setVisible(sVisible)`
- `.toggleDisplay()`
- `.toggleVisibility()`

---

### oControlHost.page

The page containing the control has additional members and methods:

#### Members

- **`application`**: The application object.
- **`hasBack`** (boolean):  
  Indicates whether back navigation is supported.  
  **Example:**
  ```javascript
  btnCustomBackButton.disabled = !oControlHost.page.hasBack;
  ```
- **`name`** (string):  
  The page name.
- **`pageModuleInstance`** (Promise, async, *read-only*):  
  The PageModule instance. Since modules are loaded asynchronously, the instance might not be immediately available.
  
  **Example:**
  ```javascript
  const oModuleInstance = await oPage.pageModuleInstance;
  // Now the module instance is available.
  ```

#### Methods

- **`.getAllPromptControls()`**  
  Returns all prompt controls on the page.  
  **Returns:** An array of `PromptControl` objects (empty if none found).

- **`.getControlByName(sName)`**  
  Returns the first control with the given name or `null` if not found.  
  **Returns:** A `Control` object.

- **`.getControlsByName(sName)`**  
  Returns all controls with the specified name.  
  **Returns:** An array of `Control` objects (empty if none found).

- **`.getControlsByNodeName(...sNodeName)`**  
  Retrieves controls by their node name(s). Only named specification nodes are found.
  - **Parameters:**  
    - One or more node names (strings).  
  - **Returns:** An array of `Control` objects.
  
  **Examples:**
  ```javascript
  const aControls = oPage.getControlsByNodeName("selectValue");
  const aControls = oPage.getControlsByNodeName("list", "crosstab", "table");
  ```

---

### oControlHost.page.application

The application object provides methods for controlling report-level actions.

#### Methods

- **`.clearParameterValues()`**  
  Clears all parameter values.

- **`.close(bAskToSaveFirst)`**  
  Closes the application.  
  **Parameters:**
  - `bAskToSaveFirst` (boolean, optional; default: `true`):  
    If `true`, the application will prompt to save changes; if `false`, it closes immediately.

- **`.f_closeCurrentPerspectiveImmediately()`**  
  Closes the current perspective and returns a promise for further actions post-close.

- **`.isSavedOutput()`**  
  Returns a boolean indicating whether the report is being rendered as saved output.
  
  **Example:**
  ```javascript
  const v_bIsSavedOutput = oControlHost.page.application.isSavedOutput();
  if (!v_bIsSavedOutput) {
    oControlHost.next();
  }
  ```

- **`.refresh()`**  
  Refreshes the report.

- **`.resetParameterValues()`**  
  Resets parameters to their initial values.

- **`.run()`**  
  Runs the report.

---

### Other oControlHost Methods

- **`oControlHost.back()`**  
  Navigates back one prompt page.

- **`oControlHost.cancel()`**  
  Cancels report execution.

- **`oControlHost.finish()`**  
  Submits parameter values and skips all remaining optional prompts and prompt pages.

- **`oControlHost.generateUniqueID()`**  
  Generates a unique HTML ID, useful when inserting HTML that requires unique IDs.
  
  **Warning:**  
  The uniqueness of the generated ID is based on the current IDs in the document. Repeated calls may produce the same ID if the previously generated ID is not yet inserted.
  
  **Examples:**
  
  _After Version 2:_
  ```javascript
  class CustomControl {
    draw(oControlHost) {
      oControlHost.container.innerHTML = `<div id="${oControlHost.generateUniqueID()}"></div>`;
    }
  }
  ```
  
  _Before Version 2:_
  ```javascript
  function generateUniqueID(sBase) {
    const d = document;
    let sID = sBase;
    let i = 1;
    while (d.getElementById(sID)) {
      sID = sBase + i++;
    }
    return sID;
  }
  ```

- **`oControlHost.getparameters(sParameter)`**  
  Retrieves the current value of a parameter.  
  **Returns:**  
  - An array of `Parameter` objects, or  
  - An array of `RangeParameter` objects  
  or `null` if the parameter does not exist.

- **`oControlHost.next()`**  
  Submits parameter values and advances to the next prompt page.

- **`oControlHost.refresh()`**  
  Refreshes the report.

- **`oControlHost.reprompt()`**  
  Displays the first prompt page (if the report contains prompt pages) or re-prompts for values if none exist.

- **`oControlHost.run()`**  
  Runs the report.

- **`oControlHost.validStateChanged()`**  
  Notifies the ControlHost that the valid state of the control has changed.

- **`oControlHost.valueChanged()`**  
  Notifies the ControlHost that a value has changed.
  
  **Example:**
  ```javascript
  class CustomControl {
    // ...
    onSelectChange(oControlHost) {
      oControlHost.valueChanged();
    }
  }
  ```

---

Use this documentation as your guide when implementing or troubleshooting Cognos custom controls. Each section details the available properties and methods, along with code examples to help you get started quickly.

Happy coding!
*/


define(() => {
  "use strict";
  class AdvancedControl {
    /*
     * Initialize the control. This method is optional. If this method is implemented, fnDoneInitializing must be called when done initializing, or a Promise must be returned.
     * Parameters: oControlHost, fnDoneInitializing
     * Returns: (Type: Promise) An optional promise that will be waited on instead fo calling fnDoneInitializing(). Since Version 6
     *
     */
    initialize(oControlHost, fnDoneInitializing) {
      require(["Module"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
    }

    dependenciesLoaded(fnDoneInitializing, oModule) {
      fnDoneInitializing();
    }
    /*
     * The control is being destroyed so do any necessary cleanup. This method is optional.
     */
    destroy(oControlHost) {}
    /*
     *Draw the control. This method is optional if the control has no UI.
     */
    draw(oControlHost) {
      oControlHost.container.innerHTML = "Hello world";
    }
    /*
     * Called when the control is being shown (displayed). This method is optional.
     */
    show(oControlHost) {}
    /*
     * Called when the control is being hidden (not displayed). This method is optional.
     * Parameters: oControlHost
     * 
     */
    hide(oControlHost) {}

    /*
     * The valid state of the control. This method is optional. This is used to determine things like enabling "Next" and "Finish" prompt buttons.
     * Parameters: oControlHost
    */
    isInValidState(oControlHost) {
      return this.m_sel.selectedIndex > 0;
    }
    /**
     * getParameters(oControlHost) → (nullable) {Array.<Parameter>|Array.<RangeParameter>}
     * Called by the ControlHost to get the current values to use for parameters fulfilled by the control. This method is optional.
     * @param {*} oControlHost 
     * @returns An array of parameters.
     * 
     */
    getParameters(oControlHost) {
      if (this.m_sel.selectedIndex < 1) {
        return null;
      }
      const { value } = this.m_sel.options[this.m_sel.selectedIndex];
      return [
        {
          parameter: "parameter1",
          values: [{ use: value }],
        },
      ];
    }
    /*
     * Called to pass authored data into the control. This method is optional.
     * Parameters: oControlHost, oDataStore
     * Returns: 
     */
    setData(oControlHost, oDataStore) {
      // Method below is for a single data store to use later in the draw function
      this.m_oDataStore = oDataStore;

      // Method below is for a multiple data stores to use later in the draw function
      this.m_aDataStore[oDataStore.index] = oDataStore;

      // Method below is for a multiple data stores by name to use later in the draw function
      this.m_oDataStores[oDataStore.name] = oDataStore;
    }
  }

  return AdvancedControl;
});
