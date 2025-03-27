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
  