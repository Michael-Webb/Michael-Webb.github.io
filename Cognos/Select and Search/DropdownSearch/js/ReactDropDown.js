define([], function () {
  "use strict";

  // Configure RequireJS to load React and ReactDOM from the CDN
  require.config({
    paths: {
      react: "https://unpkg.com/react@18/umd/react.production.min",
      "react-dom": "https://unpkg.com/react-dom@18/umd/react-dom.production.min",
    },
  });

  class AdvancedControl {
    // Store React references
    React = null;
    ReactDOM = null;
    MultiselectDropdownComponent = null; // Renamed for clarity

    // Load dependencies when the control initializes.
    initialize(oControlHost, fnDoneInitializing) {
      let { isMultiSelect, isRequired, ParameterName } = oControlHost.configuration;

      this.isMultiSelect = isMultiSelect;
      this.isRequired = isRequired;
      this.parameterName = ParameterName

      require(["react", "react-dom"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
    }

    dependenciesLoaded(fnDoneInitializing, React, ReactDOM) {
      // React and ReactDOM are arguments here
      // Store the loaded dependencies for later use by AdvancedControl methods like draw/destroy
      this.React = React;
      this.ReactDOM = ReactDOM;

      // --- Define the Accessible Multiselect React Component ---
      // Use the 'React' variable directly from the function scope, NOT this.React
      class MultiselectDropdown extends React.Component {
        // Use React.Component
        constructor(props) {
          super(props);
          // Ensure initialValue is an array or default to empty array
          const initialSelected = Array.isArray(props.initialValue) ? props.initialValue : [];
          this.state = {
            selectedValues: initialSelected,
          };
          this.handleChange = this.handleChange.bind(this);
        }

        handleChange(event) {
          const selectedOptions = event.target.selectedOptions;
          const newSelectedValues = [];
          for (let i = 0; i < selectedOptions.length; i++) {
            newSelectedValues.push(selectedOptions[i].value);
          }
          this.setState({ selectedValues: newSelectedValues });
          if (this.props.onChange) {
            this.props.onChange(newSelectedValues);
          }
        }

        render() {
          const { options, label, id, required } = this.props;
          const { selectedValues } = this.state;

          if (!id) {
            console.error("MultiselectDropdown requires an 'id' prop for accessibility (label association).");
            // Use React.createElement directly
            return React.createElement("div", { style: { color: "red" } }, "Error: Missing ID for multiselect");
          }
          if (!label) {
            console.warn("MultiselectDropdown should have a 'label' prop for accessibility.");
          }

          // Create option elements using React.createElement directly
          const optionElements = (options || []).map((option) =>
            React.createElement(
              // Use React.createElement
              "option",
              { key: option.value, value: option.value },
              option.label
            )
          );

          // Create the label element using React.createElement directly
          const labelElement = React.createElement(
            // Use React.createElement
            "label",
            { htmlFor: id },
            label || "Select options"
          );

          // Create the multiselect element using React.createElement directly
          const selectElement = React.createElement(
            // Use React.createElement
            "select",
            {
              multiple: true,
              value: selectedValues,
              onChange: this.handleChange,
              id: id,
              "aria-multiselectable": "true",
              required: required || false,
              // size: 5 // Optional: uncomment to show more options
            },
            optionElements
          );

          // Return label and select using React.Fragment directly
          return React.createElement(
            React.Fragment, // Use React.Fragment
            null,
            labelElement,
            selectElement
          );
        }
      }
      // --- End of Multiselect React Component Definition ---

      this.MultiselectDropdownComponent = MultiselectDropdown; // Store the component class

      console.log("React and ReactDOM loaded successfully.");
      fnDoneInitializing();
    }

    // Render the React multiselect dropdown component.
    draw(oControlHost) {
      if (!this.React || !this.ReactDOM || !this.MultiselectDropdownComponent) {
        console.error("React dependencies not loaded yet.");
        oControlHost.container.textContent = "Loading dependencies...";
        return;
      }

      // --- Define options and handler for the multiselect dropdown ---
      const dropdownOptions = [
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana" },
        { value: "cherry", label: "Cherry" },
        { value: "date", label: "Date" },
        { value: "elderberry", label: "Elderberry" },
      ];

      // Example handler within AdvancedControl to react to changes
      const handleMultiselectChange = (selectedValuesArray) => {
        console.log("Multiselect selection changed to:", selectedValuesArray);
        // Store or use the array of selected values
        // e.g., this.currentSelection = selectedValuesArray;
      };

      // --- Define props for the component ---
      const componentProps = {
        options: dropdownOptions,
        onChange: handleMultiselectChange,
        label: "Select your favorite fruits:", // Visible label text
        id: "fruit-multiselect-" + Date.now(), // Generate a unique ID dynamically or use a fixed one if appropriate
        // Optional: Set initially selected values (must be an array)
        initialValue: ["banana", "date"],
        // Optional: Make it required
        // required: true
      };

      // --- Render the component ---
      this.ReactDOM.render(
        this.React.createElement(this.MultiselectDropdownComponent, componentProps),
        oControlHost.container
      );
    }

    // Cleanup when the control is destroyed.
    destroy(oControlHost) {
      if (this.ReactDOM && oControlHost.container) {
        this.ReactDOM.unmountComponentAtNode(oControlHost.container);
        console.log("React component unmounted.");
      }
    }

    // Optional additional methods (keep as is)
    show(oControlHost) {}
    hide(oControlHost) {}
    isInValidState(oControlHost) {
      if (!this.isRequired) {
        return true;
      }
    }
    getParameters(oControlHost) {
      if (this.m_sel.selectedIndex < 1) {
        return null;
      }
      const { value } = this.m_sel.options[this.m_sel.selectedIndex];
      console.log([{
        parameter: this.parameterName,
        values: [{ use: value }],
      }])
      return [
        {
          parameter: this.parameterName,
          values: [{ use: value }],
        },
      ];
    }
    setData(oControlhost, oDataStore) {
      this.m_oDataStore = oDataStore;
    }
  }

  return AdvancedControl;
});
