define([], function () {
    "use strict";
  
    // Configure RequireJS to load React and ReactDOM from the CDN
    require.config({
      paths: {
        react: "https://unpkg.com/react@18/umd/react.production.min",
        "react-dom": "https://unpkg.com/react-dom@18/umd/react-dom.production.min",
      }
    });
  
    class AdvancedControl {
      // Store React references
      React = null;
      ReactDOM = null;
      MultiselectDropdownComponent = null; // Renamed for clarity
  
      // Load dependencies when the control initializes.
      initialize(oControlHost, fnDoneInitializing) {
        require(["react", "react-dom"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
      }
  
      dependenciesLoaded(fnDoneInitializing, React, ReactDOM) {
        this.React = React;
        this.ReactDOM = ReactDOM;
  
        // --- Define the Accessible Multiselect React Component ---
        class MultiselectDropdown extends this.React.Component {
          constructor(props) {
            super(props);
            // Ensure initialValue is an array or default to empty array
            const initialSelected = Array.isArray(props.initialValue) ? props.initialValue : [];
            this.state = {
              selectedValues: initialSelected // State now holds an array
            };
            this.handleChange = this.handleChange.bind(this);
          }
  
          // Handle change event for multiselect
          handleChange(event) {
            const selectedOptions = event.target.selectedOptions;
            const newSelectedValues = [];
            // Iterate through the HTMLCollection of selected options
            for (let i = 0; i < selectedOptions.length; i++) {
              newSelectedValues.push(selectedOptions[i].value);
            }
  
            this.setState({ selectedValues: newSelectedValues });
  
            // Call the onChange prop with the array of selected values
            if (this.props.onChange) {
              this.props.onChange(newSelectedValues);
            }
          }
  
          render() {
            const { options, label, id, required } = this.props; // Get id and label from props
            const { selectedValues } = this.state;
  
            // --- Accessibility Check ---
            if (!id) {
                console.error("MultiselectDropdown requires an 'id' prop for accessibility (label association).");
                // Potentially render an error or nothing
                return this.React.createElement('div', { style: { color: 'red' } }, 'Error: Missing ID for multiselect');
            }
             if (!label) {
                console.warn("MultiselectDropdown should have a 'label' prop for accessibility.");
                // Proceed but warn
            }
  
            // Create option elements
            const optionElements = (options || []).map(option =>
              this.React.createElement(
                "option",
                { key: option.value, value: option.value },
                option.label
              )
            );
  
            // Create the label element
            const labelElement = this.React.createElement(
              "label",
              { htmlFor: id }, // Associate label with the select using 'id'
              label || 'Select options' // Use provided label or a default fallback
            );
  
            // Create the multiselect element
            const selectElement = this.React.createElement(
              "select",
              {
                multiple: true, // Enable multi-selection
                value: selectedValues, // Pass the array of selected values
                onChange: this.handleChange,
                id: id, // Set the id for the label association
                "aria-multiselectable": "true", // Explicit ARIA attribute
                required: required || false, // Add required attribute if needed
                // You might want to add 'size' attribute to show multiple options at once
                // size: 5
              },
              optionElements
            );
  
            // Return label and select, wrapped in a Fragment to avoid extra divs
            return this.React.createElement(
                this.React.Fragment,
                null, // No props for Fragment
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
              { value: "elderberry", label: "Elderberry" }
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
      isInValidState(oControlHost) {}
      getParameters(oControlHost) {}
      setData(oControlHost, oDataStore) {}
    }
  
    return AdvancedControl;
  });