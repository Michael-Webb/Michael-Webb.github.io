define([], function () {
  "use strict";
  // 1. Configure RequireJS paths at the top of your module file
  require.config({
    paths: {
      react: "https://unpkg.com/react@18/umd/react.production.min.js",
      "react-dom": "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
    },
    shim: {
      react: { exports: "React" },
      "react-dom": { exports: "ReactDOM" },
    },
  });
  class AdvancedControl {
    initialize(oControlHost, fnDoneInitializing) {
      // 2. Now that require.config is set, you can dynamically load react & react-dom
      require(["react", "react-dom"], (React, ReactDOM) => {
        // Store on 'this' so we can use them in draw/destroy
        this.React = React;
        this.ReactDOM = ReactDOM;

        // Finish initialization
        fnDoneInitializing();
      });
    }

    // Render the inline React component with a text prop
    draw(oControlHost) {
      const MyReactComponent = (props) => this.React.createElement("div", null, props.text);
      this.ReactDOM.render(
        this.React.createElement(MyReactComponent, { text: "Hello from React!" }),
        oControlHost.container
      );
    }

    // Unmount the component when the control is destroyed
    destroy(oControlHost) {
      this.ReactDOM.unmountComponentAtNode(oControlHost.container);
    }

    // Other lifecycle methods as needed
    show(oControlHost) {}
    hide(oControlHost) {}
    isInValidState(oControlHost) {}
    getParameters(oControlHost) {}
    setData(oControlHost, oDataStore) {}
  }

  return AdvancedControl;
});
