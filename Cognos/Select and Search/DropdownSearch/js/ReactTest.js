define(['react', 'react-dom', 'MyReactComponent'], function(React, ReactDOM, MyReactComponent) {
    "use strict";
    
    class AdvancedControl {
      initialize(oControlHost, fnDoneInitializing) {
        // Any initialization code can go here.
        fnDoneInitializing();
      }
      
      // This method is where you render your React component.
      draw(oControlHost) {
        // You can pass any props your React component needs.
        ReactDOM.render(
          React.createElement(MyReactComponent, { someProp: 'value' }),
          oControlHost.container
        );
      }
      
      // Always unmount your React component during cleanup.
      destroy(oControlHost) {
        ReactDOM.unmountComponentAtNode(oControlHost.container);
      }
      
      // You can implement the remaining methods (show, hide, etc.) as needed.
      show(oControlHost) { }
      hide(oControlHost) { }
      isInValidState(oControlHost) { }
      getParameters(oControlHost) { }
      setData(oControlHost, oDataStore) { }
    }
    
    return AdvancedControl;
  });
  