define(["jquery"], function ($) {
    "use strict";
  
    function Control() {}
  
    Control.prototype.initialize = function (oControlHost, fnDoneInitializing) {
      let o = oControlHost.configuration;
      var URL = o.URL;
      var element = o.Element;
      var overrideEFO = o.overrideExistingFiltersOnly;
      var matchMAS = o.matchMetadataAcrossSources;
      var prefx = o.prefix; // Add more prefixes if needed
      var prefixes = prefx.split(", ");
  
      var finalJSONObject = {
        options: {
          overrideExistingFiltersOnly: overrideEFO,
          matchMetadataAcrossSources: matchMAS,
        },
        filters: [],
      };
  
      const paramJsonObjects = [];
      const newObjects = [];
  
      prefixes.forEach((prefix) => {
        const paramSpans = document.querySelectorAll(
          `span[name^="${prefix}param"]`
        );
        const keySpans = [
          ...document.querySelectorAll(`span[name="${prefix}key"]`),
        ];
  
        paramSpans.forEach((span) => {
          const jsonObject = {};
          // Add prefix name as a value with key "name"
          jsonObject.name = prefix;
          Object.keys(span.dataset).forEach((key) => {
            let value = span.dataset[key];
            // Check if key is "value" and perform splitting and trimming
            if (key === "value") {
              value = value.split(",").map((item) => item.trim());
            }
  
            jsonObject[key] = value;
          });
  
          // Conditional statements based on filterType
          if (jsonObject.filtertype === "scope") {
            // Filter the values based on the jsonObject created from paramSpan
            const filteredValues = keySpans
              .map((paramSpan) => paramSpan.getAttribute("data-value"))
              .filter((value) => jsonObject.value.includes(value));
  
            // Create an array that groups unique filtered values separated by a comma by display
            const groupedValues = [];
            const paramValues = jsonObject.value;
  
            keySpans.forEach((paramSpan) => {
              const display = paramSpan.getAttribute("data-display");
              const value = paramSpan.getAttribute("data-value");
  
              // Filter the values based on the paramValues
              const filteredValues = value
                .split(",")
                .map((item) => item.trim())
                .filter((item) => paramValues.includes(item));
  
              // Check if there are any filtered values
              if (filteredValues.length > 0) {
                const existingGroup = groupedValues.find(
                  (group) => group.display === display
                );
  
                if (existingGroup) {
                  const uniqueValues = new Set(
                    existingGroup.value.concat(filteredValues)
                  );
                  existingGroup.value = Array.from(uniqueValues);
                } else {
                  groupedValues.push({ display, value: filteredValues });
                }
              }
            });
  
            // Create new objects using grouped filtered values and paramSpan values
            groupedValues.forEach((group) => {
              const newObject = {
                scope: jsonObject.scope,
                columnId: group.display,
                operator: jsonObject.operator,
                values: group.value.map((value) => ({
                  u: `${group.display} ->[${value.toString()}]`,
                  d: `${value.toString()}`,
                })),
              };
  
              newObjects.push(newObject);
            });
            //console.log(newObjects);
          } else if (jsonObject.filtertype === "global") {
            // Code to execute if filterType is "global"
          }
  
          paramJsonObjects.push(jsonObject);
        });
      });
  
      finalJSONObject.filters = newObjects;
  
      // Convert finalJSONObject to a string
      var jsonQueryString = encodeURIComponent(JSON.stringify(finalJSONObject));
  
      // Append the query parameter to the URL
      var urlWithQuery = URL + "&filters=" + jsonQueryString;
  
      console.log("Prompt Parameters: ", finalJSONObject);
      console.log("iFrame URL: ", urlWithQuery);
  
      const populate = (url, el) => {
        let iframe = document.querySelector(el);
        iframe.src = url;
        //    $(el).on('load',function(){
        //$('#v83').contentdocument.getElementById('filterDockContainer').classList.remove('show')
        // });
      };
      populate(urlWithQuery, element);
  
      fnDoneInitializing();
    };
  
    Control.prototype.draw = function (oControlHost) {
      let o = oControlHost.configuration;
      var time = o.Time
      function startupFilter(value) {
        var x = document.getElementsByTagName("iframe")[0];
        console.log("x is accessed ", x);
  
        
        var handleMessage = function(msg) {
            if(msg.data === 'dashboard.ready') {
                console.log("iframe is loaded");
            var x = document.getElementsByTagName("iframe");
            console.log("x: ", x[0]);
            var x2 = x[0].contentWindow
              .__getDashboardAPI()
              .triggerDashboardEvent("filterDock:collapse");
            console.log("x2 is done");
            x2
            }
        };
        window.addEventListener('message', handleMessage);
        
        x.onload = () => {
          setTimeout(() => {
            console.log("iframe is loaded");
            var x = document.getElementsByTagName("iframe");
            console.log("x: ", x[0]);
            var x2 = x[0].contentWindow
              .__getDashboardAPI()
              .triggerDashboardEvent("filterDock:collapse");
            console.log("x2 is done");
            x2
            console.log("Delayed for 1 second.");
          }, value);
        };
      }
  
      console.log("starting...");
      startupFilter(time);
    };
  
    return Control;
  });
