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
      DropdownSelectComponent = null; // To store our component class
  
      // Load dependencies when the control initializes.
      initialize(oControlHost, fnDoneInitializing) {
        require(["react", "react-dom"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
      }
  
      dependenciesLoaded(fnDoneInitializing, React, ReactDOM) {
        // Store the loaded dependencies for later use
        this.React = React;
        this.ReactDOM = ReactDOM;
  
        // --- Define the Dropdown React Component ---
        // Using React.createElement syntax as JSX is not available here
        class DropdownSelect extends this.React.Component {
          constructor(props) {
            super(props);
            // Initialize state with the first option's value or an empty string
            const initialValue = props.options && props.options.length > 0 ? props.options[0].value : "";
            this.state = {
              selectedValue: props.initialValue !== undefined ? props.initialValue : initialValue
            };
            // Bind the event handler
            this.handleChange = this.handleChange.bind(this);
          }
  
          handleChange(event) {
            const newValue = event.target.value;
            this.setState({ selectedValue: newValue });
            // Call the onChange prop if provided
            if (this.props.onChange) {
              this.props.onChange(newValue);
            }
          }
  
          render() {
            const { options, placeholder } = this.props;
            const { selectedValue } = this.state;
  
            // Create option elements
            const optionElements = (options || []).map(option =>
              this.React.createElement(
                "option",
                { key: option.value, value: option.value },
                option.label
              )
            );
  
            // Add a placeholder option if specified
            if (placeholder) {
                optionElements.unshift(
                    this.React.createElement(
                        "option",
                        { key: "placeholder", value: "", disabled: true },
                        placeholder
                    )
                );
            }
  
            // Create the select element
            return this.React.createElement(
              "select",
              { value: selectedValue, onChange: this.handleChange },
              optionElements // Pass the array of option elements as children
            );
          }
        }
        // --- End of Dropdown React Component Definition ---
  
        this.DropdownSelectComponent = DropdownSelect; // Store the component class
  
        console.log("React and ReactDOM loaded successfully.");
        fnDoneInitializing();
      }
  
      // Render the React dropdown component.
      draw(oControlHost) {
          if (!this.React || !this.ReactDOM || !this.DropdownSelectComponent) {
              console.error("React dependencies not loaded yet.");
              // Optionally render a loading message or wait
              oControlHost.container.textContent = "Loading dependencies...";
              return;
          }
  
          // --- Define options and handler for the dropdown ---
          const dropdownOptions = [
              { value: "apple", label: "Apple" },
              { value: "banana", label: "Banana" },
              { value: "cherry", label: "Cherry" },
              { value: "date", label: "Date" }
          ];
  
          // Example handler within AdvancedControl to react to changes
          const handleDropdownChange = (selectedValue) => {
              console.log("Dropdown selection changed to:", selectedValue);
              // You could potentially store this value or trigger other actions
              // Maybe update oControlHost properties or interact with Cognos Analytics APIs
              // For example: oControlHost.valueChanged(selectedValue); // If applicable
          };
  
          // --- Render the component ---
          this.ReactDOM.render(
              this.React.createElement(this.DropdownSelectComponent, {
                  options: dropdownOptions,
                  onChange: handleDropdownChange,
                  // Optional: Add a placeholder
                  placeholder: "Select a fruit...",
                  // Optional: Set an initial value (must match one of the option values)
                  // initialValue: "banana"
              }),
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