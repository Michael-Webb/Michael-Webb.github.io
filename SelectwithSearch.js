define(function () {
  "use strict";

  function MyStyledSelect() {
    this.isInputActive = false;
  }

  MyStyledSelect.prototype.draw = function (oControlHost) {
    this.m_oControlHost = oControlHost;

    //get configration
    var oConfig = oControlHost.configuration || {};
    var columnNumber = oConfig["Column Number"] || 0;
    var hasDisplay = oConfig["hasDisplay"] || false;
    var displayColumnNumber = hasDisplay ? columnNumber + 1 : columnNumber;

    var oControl =
      oConfig && oConfig["Control name"]
        ? oControlHost.page.getControlByName(oConfig["Control name"])
        : oControlHost.control;
    console.log("oControl:", oControl);
    var oDataStore =
      oConfig && oConfig["Data store name"]
        ? oControl.getDataStore(oConfig["Data store name"])
        : oControl.dataStores[0];

    console.log("oDataStore : ", oDataStore);
    // if label not present use default column name
    var sLabel = oConfig.Label || oDataStore.columnNames[columnNumber];

    // check for parameter name if not exist use default "pl"
    this.m_sParameter = oConfig["Parameter name"];
    console.log("Parameter Name : ", this.m_sParameter);

    // find parameter object
    var oParameter = oControlHost.getParameter(this.m_sParameter);
    console.log("Parameter Object : ", oParameter);

    // create a set of parameter values
    var oParameterValues = new Set();
    if (oParameter && oParameter.values.length > 0) {
      oParameter.values.forEach(function (o) {
        this.add(o.use);
      }, oParameterValues);
    }
    console.log("Parameter Values : ", oParameterValues);

    if (oParameterValues.size > 0) {
      sLabel += " &#9733;";
    }

    var el = oControlHost.container;
    var sID = "#" + el.id + " ";
    var sHtml = `
        <style>
        ${sID} BUTTON {
            position: relative;
            display: flex;
            margin-left: 0;
            padding-left: 18px;
            padding-right: 11px;
            padding-top: 6px;
            padding-bottom: 6px;
            background-color: ${oConfig.bgColor ? oConfig.bgColor : "white"};
            color: ${oConfig.txtColor ? oConfig.txtColor : "black"};
            border-color: ${oConfig.borderColor ? oConfig.borderColor : "black"};
            font-weight: bold;
            border-radius: ${oConfig.borderRadious ? oConfig.borderRadius : "2px"};
        }
        ${sID} BUTTON:hover {
            background-color: ${oConfig.hoverBGColor ? oConfig.hoverBGColor : "lightgrey"};
            color: ${oConfig.hoverTextColor ? oConfig.hoverTextColor : "white"};
        }
        ${sID} BUTTON.myBtn {
          cursor: pointer;
        }
        ${sID} BUTTON.myBtn > * {
          pointer-events: none;
        }
        ${sID} #main-container {
            position: absolute;
            z-index: 1;
            visibility: hidden;
            opacity: 0;
            transition: visibility 0s, opacity 0.3s linear;
            transition-delay: 0.5s, 0s;
            top: calc(100% + 2px);
            left: -2px;
            text-align: left;
            background-color: white;
            box-shadow: 0px 0px 12px 0px grey;
            font-weight: normal;
            width: ${oConfig.dropDownWidth ? oConfig.dropDownWidth : "250px"};
        }
        ${sID} BUTTON.open #main-container {
            visibility: visible;
            opacity: 1;
            transition-delay: 0s;
        }
        ${sID} #selectAll-btn, ${sID} #clearFilter-btn {
            cursor: pointer;
            color: #4178BE;
            font-size: 14px;
            background: none;
            border: none;
            padding: 0;
            margin: 0 10px;
            transition: color 0.3s ease;
            white-space: nowrap;
        }
        ${sID} #selectAll-btn:hover, ${sID} #clearFilter-btn:hover {
            color: #2a4d78;
        }
        ${sID} #container-header {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
            padding: 0 20px;
        }
        ${sID} #search-container {
            position: relative;
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        ${sID} #search-input-container {
            position: relative;
            flex-grow: 1;
            align-items: center;
        }
        ${sID} #myInput {
            flex-grow: 1;
            line-height: 2;
            border: 2px solid #595859;
            border-radius: 4px;
            padding-right: 40px;
            width: 100%;
        }
        ${sID} #search-icon {
            position: absolute;
            color: black;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
        }
        ${sID} #applyFilter-btn {
            cursor: pointer;
            color: #4178BE;
            font-size: 14px;
            padding: 6px 12px;
            background-color: white;
            border: 1px solid #4178BE;
            border-radius: 4px;
            margin-left: 10px;
            white-space: nowrap;
            transition: all 0.3s ease;
            width: 150px;
            text-align: center;
        }
        ${sID} #applyFilter-btn:hover {
            background-color: #4178BE;
            color: white;
        }
        ${sID} #container-body {
            color: #595859;
        }
        ${sID} BUTTON > svg {
            height: 13px;
            width: 13px;
            display: inline-block;
            margin-left: 5px;
            transition-duration: 0.3s;
            transition-timing-function: ease-out;
            transition-property: transform;
        }
        ${sID} BUTTON.open > svg {
            transform: scaleY(-1);
        }
        ${sID} #container-footer {
            display: flex;
            justify-content: flex-end;
            margin: 5px 20px;
            padding: 5px 0px;
            align-items: center;
        }
        ${sID} #filter-options {
            border-radius: 3px;
            padding: 4px 8px;
            width: 100%;
        }
        </style>
    `;

    // dataset row count
    var iRowCount = oDataStore.rowCount;
    console.log("iRowCount : ", iRowCount);

    // Get the number of columns
    var numColumns = oDataStore.columnNames.length;

    // Determine if the third column exists
    var hasThirdColumn = numColumns >= 3;

    // Collect data into an array
    var dataItems = [];
    var sValues = [];
    for (var iRow = 0; iRow < iRowCount; iRow++) {
      var sValue = oDataStore.getCellValue(iRow, columnNumber);
      var sDisplayValue = hasDisplay ? oDataStore.getCellValue(iRow, displayColumnNumber) : sValue;
      var sortValue = hasThirdColumn ? oDataStore.getCellValue(iRow, 2) : sValue;

      if (!sValues.includes(sValue)) {
        dataItems.push({
          sValue: sValue,
          sDisplayValue: sDisplayValue,
          sortValue: sortValue,
        });
        sValues.push(sValue);
      }
    }

    // Prepare variables for building checkboxValues
    var bMultiSelect = oConfig.MultiSelect !== false;
    var bSuppressSelection = false;
    var sClass = bMultiSelect ? "clsCheckbox" : "clsRadioButton";
    var sType = bMultiSelect ? "checkbox" : "radio";
    var sName = bMultiSelect ? "" : ' name="' + (el.id + "__radio__") + '"';
    var iScrollIfMoreThan = 12;

    // Now build checkboxValues
    var checkboxValues = "";
    for (var i = 0; i < dataItems.length; i++) {
      var item = dataItems[i];
      var sValue = item.sValue;
      var sDisplayValue = item.sDisplayValue;

      var bSelected = !bSuppressSelection && oParameterValues.has(sValue);
      if (bSelected && !bMultiSelect) {
        bSuppressSelection = true;
      }
      checkboxValues += `
    <label class="${sClass}" style="margin: 10px 20px;${i > 0 ? "margin-top:16px;" : ""}">
      <input type="${sType}" ${bSelected ? ' checked="true"' : ""} ${sName} value="${sValue}" />
      <span>${sDisplayValue}</span>
    </label>
  `;
    }

    sHtml += `
      <button class="myBtn" tabindex="-1">
        <div id="main-container">
          <div id="container-header">
            <div id="search-container">
              <div id="search-input-container">
                <input id="myInput" type="text" placeholder="Search.." autocomplete="off"/>
                <span id="search-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                  </svg>
                </span>
              </div>
            </div>
            <select id="filter-options">
              <option value="startAny">Starts with any of these Keywords</option>
              <option value="containAny">Contains any of these Keywords</option>
              <option value="start">Starts With The Keyword</option>
              <option value="contain">Contains the Keyword</option>  
            </select>
          </div>
          <div id="container-body" ${
            iRowCount > iScrollIfMoreThan ? 'style="overflow-y:auto; height:' + iScrollIfMoreThan * 32 + 'px"' : ""
          }>
            ${checkboxValues}
          </div>
          <hr>
          <div id="container-footer">
            <span id="clearFilter-btn">Deselect All</span>
            <span id="selectAll-btn">Select All</span>
            ${!oConfig.AutoSubmit ? '<span id="applyFilter-btn">Apply</span>' : ""}
          </div>
        </div>
        <span>${sLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    `;

    el.innerHTML = sHtml;

    // Add event listener to toggle 'open' class
    var myBtn = el.querySelector(".myBtn");
    myBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!e.target.closest("#main-container")) {
        myBtn.classList.toggle("open");
      }
    });

    document.addEventListener(
      "click",
      function (e) {
        if (!this.isInputActive && !el.contains(e.target)) {
          myBtn.classList.remove("open");
        }
      }.bind(this)
    );

    // Prevent clicks inside the dropdown from closing it
    var mainContainer = el.querySelector("#main-container");
    mainContainer.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    var labels = el.querySelectorAll("label");
    for (let x = 0; x < labels.length; x++) {
      labels[x].onclick = this.f_onChange.bind(this, oControlHost, oConfig.AutoSubmit);
    }

    var myInput = el.querySelector("#myInput");
    myInput.addEventListener(
      "keydown",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.isInputActive = true;
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          this.value += " ";
          this.f_onSearch(oControlHost);
        }
      }.bind(this)
    );

    myInput.addEventListener(
      "keyup",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.key !== " " && e.key !== "Spacebar") {
          this.f_onSearch(oControlHost);
        }
      }.bind(this)
    );

    myInput.addEventListener(
      "click",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.isInputActive = true;
      }.bind(this)
    );

    myInput.addEventListener(
      "focus",
      function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.isInputActive = true;
      }.bind(this)
    );

    el.querySelector("#filter-options").onchange = this.f_onFilterTypeChange.bind(this, oControlHost);

    el.querySelector("#clearFilter-btn").onclick = function (e) {
      e.stopPropagation();
      this.f_onClearFilter(oControlHost, e);
    }.bind(this);

    if (!oConfig.AutoSubmit) {
      el.querySelector("#applyFilter-btn").onclick = this.f_onApplyFilter.bind(this, oControlHost);
    }
    var selectAllBtn = el.querySelector("#selectAll-btn");
    if (selectAllBtn) {
      selectAllBtn.onclick = function (e) {
        e.stopPropagation(); // Prevent the click event from closing the dropdown
        this.f_onSelectAllFiltered(oControlHost);
      }.bind(this);
    } else {
      console.log("Select All button not found");
    }
  };

  MyStyledSelect.prototype.f_onApplyFilter = function (oControlHost) {
    oControlHost.valueChanged();
    oControlHost.next();
  };
  MyStyledSelect.prototype.f_onChange = function (oControlHost, bAutoSubmit) {
    oControlHost.valueChanged();
    if (bAutoSubmit) {
      oControlHost.next();
    }
  };

  MyStyledSelect.prototype.f_onSelectAllFiltered = function () {
    var labels = this.m_oControlHost.container.querySelectorAll(".myBtn label");
    var checkedCount = 0;
    var visibleCount = 0;

    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      var checkbox = label.querySelector("input");

      // Check if the label is currently visible
      if (label.style.display !== "none") {
        visibleCount++;
        checkbox.checked = true;
        checkedCount++;
      }
    }

    console.log(`Checked ${checkedCount} out of ${visibleCount} visible items`);

    this.m_oControlHost.valueChanged();
    if (this.m_oControlHost.configuration.AutoSubmit) {
      this.m_oControlHost.next();
    }
  };

  MyStyledSelect.prototype.f_onSearch = function (oControlHost) {
    var filterText = oControlHost.container.querySelector("#myInput").value.toUpperCase();
    var filterType = oControlHost.container.querySelector("#filter-options").value;
    var label = oControlHost.container.querySelectorAll(".myBtn label");

    if (filterText != "") {
      oControlHost.container.querySelector(
        "#search-icon"
      ).innerHTML = `<svg  xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>`;
      oControlHost.container.querySelector("#search-icon").onclick = function (e) {
        e.stopPropagation(); // Prevent closing the dropdown
        oControlHost.container.querySelector("#myInput").value = "";
        oControlHost.valueChanged();
        oControlHost.finish();
      };
    } else {
      oControlHost.container.querySelector(
        "#search-icon"
      ).innerHTML = `<svg  xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
        </svg>`;
    }

    this.applyFilter(oControlHost, filterText, filterType, label);
  };

  MyStyledSelect.prototype.f_onFilterTypeChange = function (oControlHost) {
    var filterText = oControlHost.container.querySelector("#myInput").value.toUpperCase();
    var filterType = oControlHost.container.querySelector("#filter-options").value;
    var label = oControlHost.container.querySelectorAll(".myBtn label");

    this.applyFilter(oControlHost, filterText, filterType, label);
  };

  MyStyledSelect.prototype.shouldDisplayItem = function (txtValue, filterText, filterType) {
    var keywords = filterText.split(/\s+/).filter(Boolean);

    switch (filterType) {
      case "start":
        return txtValue.indexOf(filterText) === 0;
      case "contain":
        return txtValue.indexOf(filterText) >= 0;
      case "startAny":
        return keywords.some((keyword) => txtValue.indexOf(keyword) === 0);
      case "containAny":
        return keywords.some((keyword) => txtValue.indexOf(keyword) >= 0);
      default:
        return true;
    }
  };

  MyStyledSelect.prototype.applyFilter = function (oControlHost, filterText, filterType, labels) {
    for (var i = 0; i < labels.length; i++) {
      var txtValue = labels[i].querySelector("span").textContent || labels[i].querySelector("span").innerText;
      txtValue = txtValue.trim().toUpperCase();

      labels[i].style.display = this.shouldDisplayItem(txtValue, filterText, filterType) ? "" : "none";
    }
  };

  MyStyledSelect.prototype.f_onClearFilter = function (oControlHost, e) {
    if (e) e.stopPropagation(); // Prevent the click event from closing the dropdown
    var nl = this.m_oControlHost.container.querySelectorAll("input");
    for (var i = 0; i < nl.length; i++) {
      var elInput = nl.item(i);
      if (elInput.checked) {
        elInput.checked = false;
      }
    }

    oControlHost.valueChanged();
    oControlHost.finish();
  };

  MyStyledSelect.prototype.getParameters = function () {
    var v_aValues = [];
    var nl = this.m_oControlHost.container.querySelectorAll("input");
    for (var i = 0; i < nl.length; i++) {
      var elInput = nl.item(i);
      if (elInput.checked) {
        v_aValues.push({ use: elInput.value });
      }
    }

    console.log("this.m_sParameter : ", this.m_sParameter);
    console.log("v_aValues : ", v_aValues);

    return [
      {
        parameter: this.m_sParameter,
        values: v_aValues,
      },
    ];
  };

  return MyStyledSelect;
});
