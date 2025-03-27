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
      // Load dependencies when the control initializes.
      initialize(oControlHost, fnDoneInitializing) {
        require(["react", "react-dom"], this.dependenciesLoaded.bind(this, fnDoneInitializing));
      }
  
      dependenciesLoaded(fnDoneInitializing, React, ReactDOM) {
        // Store the loaded dependencies for later use
        this.React = React;
        this.ReactDOM = ReactDOM;
        fnDoneInitializing();
      }
  
      // Render a React component that displays a dropdown select.
      draw(oControlHost) {
        // Capture React and ReactDOM in local variables
        const React = this.React;
        const ReactDOM = this.ReactDOM;
  
        // Define an inline React component for the dropdown select
        const Dropdown = (props) => {
          const { options, onChange, value } = props;
          return React.createElement(
            "select",
            {
              value: value,
              onChange: onChange
            },
            options.map((option, index) =>
              React.createElement("option", { key: index, value: option.value }, option.label)
            )
          );
        };
  
        // Container component to handle state and selection changes.
        class DropdownContainer extends React.Component {
          constructor(props) {
            super(props);
            // Initialize state with the first option selected by default.
            this.state = {
              selected: props.options[0].value
            };
            this.handleChange = this.handleChange.bind(this);
          }
  
          handleChange(e) {
            this.setState({ selected: e.target.value });
            // Optional: Pass the selected value to a callback if provided.
            if (this.props.onSelect) {
              this.props.onSelect(e.target.value);
            }
          }
  
          render() {
            return React.createElement(
              "div",
              null,
              React.createElement(Dropdown, {
                options: this.props.options,
                value: this.state.selected,
                onChange: this.handleChange
              })
            );
          }
        }
  
        // Define options for the dropdown select.
        const options = [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
          { value: "option3", label: "Option 3" }
        ];
  
        // Render the DropdownContainer component into the provided container.
        ReactDOM.render(
          React.createElement(DropdownContainer, { options: options }),
          oControlHost.container
        );
      }
  
      // Cleanup when the control is destroyed.
      destroy(oControlHost) {
        this.ReactDOM.unmountComponentAtNode(oControlHost.container);
      }
  
      // Optional additional methods
      show(oControlHost) {}
      hide(oControlHost) {}
      isInValidState(oControlHost) {}
      getParameters(oControlHost) {}
      setData(oControlHost, oDataStore) {}
    }
  
    return AdvancedControl;
  });
  