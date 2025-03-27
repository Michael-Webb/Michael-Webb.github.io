define(["react", "react-dom"], function (React, ReactDOM) {
  "use strict";

  class AdvancedControl {
    // Load dependencies when the control initializes.
    initialize(oControlHost, fnDoneInitializing) {
        this.React = React
        this.ReactDOM = ReactDOM
      fnDoneInitializing();
    }

    // Render a React component that displays some text.
    draw(oControlHost) {
      // Define an inline React component
      const MyComponent = (props) => this.React.createElement("div", null, props.text);

      // Render the component into the provided container
      this.ReactDOM.render(
        this.React.createElement(MyComponent, { text: "Hello from React!" }),
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
