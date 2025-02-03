define(function () {
  "use strict";

  class ExportReport {
    constructor() {
      this.supportedFormats = {
        excel: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "spreadsheetML",
          label: "Excel",
          icon: "v1/ext/ExportReport/images/sheet.svg",
        },
        data: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
          label: "Excel Data",
          icon: "v1/ext/ExportReport/images/file-spreadsheet.svg",
        },
        pdf: {
          mime: "application/pdf",
          ext: "pdf",
          format: "PDF",
          label: "PDF",
          icon: "v1/ext/ExportReport/images/file-text.svg",
        },
        csv: {
          mime: "text/csv",
          ext: "csv",
          format: "CSV",
          label: "CSV",
          icon: "v1/ext/ExportReport/images/table.svg",
        },
        xml: {
          mime: "application/xml",
          ext: "xml",
          format: "XML",
          label: "XML",
          icon: "v1/ext/ExportReport/images/file-code.svg",
        },
      };
    }

    draw(oControlHost) {
      let o = oControlHost;
      let el = o.container;
      let config = o.configuration;
      let exportType = config["Export Type"] ?? "excel";
      let exportObject = this.supportedFormats[exportType].format;
      let exportLabel = this.supportedFormats[exportType].label;
      console.log("OutputFormatExportObject", exportObject);

      // In the draw method
      let primaryColor = config["Primary Color"] ?? "#4178BE";
      let secondaryColor = config["Secondary Color"] ?? "white";
      let outputFormat = "";

      switch (exportType) {
        case "excel":
          outputFormat = "spreadsheetML";
          break;
        case "exceldata":
        case "excel data":
        case "data":
          outputFormat = "xlsxData";
          break;
        case "pdf":
          outputFormat = "PDF";
          break;
        case "csv":
          outputFormat = "CSV";
          break;
        case "xml":
          outputFormat = "XML";
          break;
      }

      el.innerHTML = `
                  <style>
                      .myButton { 
                          height: ${config["Height"] ?? "32px"} ; 
                          width: ${config["Width"] ?? "120px"} ; 
                          cursor: pointer; 
                          margin-left: ${config["Margin Left"] ?? "10px"}; 
                          color: ${primaryColor};  
                          font-size: ${config["Font"] ?? "14px"} 
                          padding: ${config["Padding"] ?? "6px 12px"}; 
                          background-color: ${secondaryColor};
                          border: 1px solid ${primaryColor};
                      }
                      .myButton:hover { 
                          background-color: ${primaryColor}; 
                          color: ${secondaryColor}; 
                          border: 1px solid ${primaryColor};
                      }
                  </style>
                  <button class="myButton btnExport" type="button">Export ${exportLabel}</button>
                  <button class="myButton btnGetPromptControls" type="button">Prompt Controls</button>
                  <button class="myButton btnGetAllParameters" type="button">Get Params</button>
                  <button class="myButton btnGetoControlHost" type="button">Get Host</button>`;

      el.querySelector(".btnExport").onclick = this.f_ExportButtonClick.bind(this, o, exportType);
      el.querySelector(".btnGetPromptControls").onclick = this.f_getPromptControls.bind(this, o);
      el.querySelector(".btnGetAllParameters").onclick = this.f_getAllParameters.bind(this, o);
      el.querySelector(".btnGetoControlHost").onclick = this.f_Get_oControlHost.bind(this, o);
    }

    f_ExportButtonClick(oControlHost, exportType) {
      console.log("ExportReport", exportType);

      let runConfig = {
        Prompt: false,
        isApplication: false,
        Download: true,
      };

      let outputFormat = this.supportedFormats[exportType]?.format ?? "spreadsheetML";

      runConfig.OutputFormat = outputFormat;

      console.log("Running report with config:", runConfig);

      oControlHost.page.application.SharedState.Set(null, "runInNewWindow", true, false, runConfig);
    }

    f_getPromptControls(oControlHost) {
      let aControls = oControlHost.page.getAllPromptControls();

      console.log("All Prompt Controls", aControls);
    }

    f_Get_oControlHost(oControlHost) {
      let aControls = oControlHost;

      console.log("oControlHost", aControls);
    }

    f_getAllParameters(oControlHost) {
      // Get all parameters from the page
      let parameters = oControlHost.page.application.GlassView.getParameters();
      let xmlParams = oControlHost.page.application.GlassView.getParameterValues();
      console.log(parameters, `\r\n`, xmlParams);
    }

    getParameters(oControlHost) {
      if (this.m_sel.selectedIndex < 1) {
        return null;
      }
      const { value } = this.m_sel.options[this.m_sel.selectedIndex];
      return [
        {
          parameter: "parameter1",
          values: [{ use: value }],
        },
      ];
    }
  }

  return ExportReport;
});
