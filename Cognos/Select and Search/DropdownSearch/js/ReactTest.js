require.config({
  paths: {
    // Note: Omit the ".js" extension because RequireJS appends it automatically.
    react: "https://unpkg.com/react@18/umd/react.production.min",
    "react-dom": "https://unpkg.com/react-dom@18/umd/react-dom.production.min",
  },
  shim: {
    // If needed, these shims tell RequireJS what globals to use.
    react: { exports: "React" },
    "react-dom": { exports: "ReactDOM" },
  },
});

define(["react", "react-dom", "MyReactComponent"], function (React, ReactDOM) {
  "use strict";

  class AdvancedControl {
    initialize(oControlHost, fnDoneInitializing) {
      fnDoneInitializing();
    }

    // This method is where you render your React component.
    draw(oControlHost) {
      // You can pass any props your React component needs.
      ReactDOM.render(React.createElement(MyReactComponent, { someProp: "value" }), oControlHost.container);
    }

    // Always unmount your React component during cleanup.
    destroy(oControlHost) {
      ReactDOM.unmountComponentAtNode(oControlHost.container);
    }

    // You can implement the remaining methods (show, hide, etc.) as needed.
    show(oControlHost) {}
    hide(oControlHost) {}
    isInValidState(oControlHost) {}
    getParameters(oControlHost) {}
    setData(oControlHost, oDataStore) {}
  }

  return AdvancedControl;
});
