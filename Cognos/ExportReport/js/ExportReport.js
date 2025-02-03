define(function () {
  "use strict";

  class ExportReport {
    constructor() {
      this.supportedFormats = {
        excel: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "spreadsheetML",
        },
        data: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
        },
        pdf: { mime: "application/pdf", ext: "pdf", format: "PDF" },
        csv: { mime: "text/csv", ext: "csv", format: "CSV" },
        xml: { mime: "application/xml", ext: "xml", format: "XML" },
      };
    }

    draw(oControlHost) {
      let o = oControlHost;
      let el = o.container;
      let config = o.configuration;
      let exportType = config["Export Type"] ?? "excel";
      let exportObject = this.supportedFormats[exportType].format;
      console.log("OutputFormatExportObject",exportObject)
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
                          height: 32px; 
                          width: 120px; 
                          cursor: pointer; 
                          margin-left: 10px; 
                          color: #4178BE; 
                          font-size: 14px; 
                          padding: 6px 12px; 
                          background-color: white; 
                          border: 1px solid #4178BE; 
                      }
                      .myButton:hover { 
                          background-color: #4178BE; 
                          color: white; 
                          border: 1px solid #4178BE; 
                      }
                  </style>
                  <button class="myButton btnExport" type="button">Export ${exportType}</button>
                  <button class="myButton btnGetPromptControls" type="button">Prompt Controls</button>
                  <button class="myButton btnGetAllParameters" type="button">Get Params</button>
                  <button class="myButton btnGetoControlHost" type="button">Get Host</button>`;

      el.querySelector(".btnExport").onclick = this.f_ExportButtonClick.bind(this, o);
      el.querySelector(".btnGetPromptControls").onclick = this.f_getPromptControls.bind(this, o);
      el.querySelector(".btnGetAllParameters").onclick = this.f_getAllParameters.bind(this, o);
      el.querySelector(".btnGetoControlHost").onclick = this.f_Get_oControlHost.bind(this, o);
    }

    f_ExportButtonClick(oControlHost) {
      console.log("ExportReport", exportType);

      let runConfig = {
        Prompt: false,
        isApplication: false,
        Download: true,
      };

      switch (outputFormat.toLowerCase()) {
        case "pdf":
          runConfig.OutputFormat = "PDF";
          break;
        case "spreadsheetml":
        case "excel":
          runConfig.OutputFormat = "spreadsheetML";
          break;
        case "xlsxdata":
        case "exceldata":
        case "excel data":
          runConfig.OutputFormat = "xlsxData";
          break;
      }
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
      let xmlParams = Application.getParameterValues();
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
