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
          icon: Application.GlassContext.gateway +`/v1/ext/ExportReport/images/sheet.svg`,
        },
        data: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
          label: "Excel Data",
          icon: Application.GlassContext.gateway +`/v1/ext/ExportReport/images/file-spreadsheet.svg`,
        },
        pdf: {
          mime: "application/pdf",
          ext: "pdf",
          format: "PDF",
          label: "PDF",
          icon: Application.GlassContext.gateway +`/v1/ext/ExportReport/images/file-text.svg`,
        },
        csv: {
          mime: "text/csv",
          ext: "csv",
          format: "CSV",
          label: "CSV",
          icon: Application.GlassContext.gateway +`/v1/ext/ExportReport/images/table.svg`,
        },
        xml: {
          mime: "application/xml",
          ext: "xml",
          format: "XML",
          label: "XML",
          icon: Application.GlassContext.gateway +`/v1/ext/ExportReport/images/file-code.svg`,
        },
      };
    }

    draw(oControlHost) {
        let o = oControlHost;
        let el = o.container;
        let config = o.configuration;
        let exportType = config["Export Type"] ?? "excel";
        let exportLabel = this.supportedFormats[exportType].label;
        let showIcon = config["Show Icon"] ?? false;
        let iconPath = this.supportedFormats[exportType].icon;
      
        let primaryColor = config["Primary Color"] ?? "#4178BE";
        let secondaryColor = config["Secondary Color"] ?? "white";
      
        el.innerHTML = `
          <style>
            .myButton { 
              height: ${config["Height"] ?? "32px"}; 
              width: ${config["Width"] ?? "120px"}; 
              cursor: pointer; 
              margin-left: ${config["Margin Left"] ?? "10px"}; 
              color: ${primaryColor};  
              font-size: ${config["Font"] ?? "14px"}; 
              padding: ${config["Padding"] ?? "6px 12px"}; 
              background-color: ${secondaryColor};
              border: 1px solid ${primaryColor};
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .myButton:hover { 
              background-color: ${primaryColor}; 
              color: ${secondaryColor}; 
              border: 1px solid ${primaryColor};
            }
            .myButton img {
              height: ${config["Icon Size"] ?? "16px"};
              width: ${config["Icon Size"] ?? "16px"};
              filter: ${showIcon ? `invert(0) sepia(100%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)` : ''};
            }
            .myButton:hover img {
              filter: invert(1);
            }
          </style>
          <button class="myButton btnExport" type="button">
            ${showIcon 
              ? `<img src="${iconPath}" alt="${exportLabel}" title="${exportLabel}">` 
              : `Export ${exportLabel}`}
          </button>`;
      
        el.querySelector(".btnExport").onclick = this.f_ExportButtonClick.bind(this, o, exportType);
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
  }

  return ExportReport;
});
