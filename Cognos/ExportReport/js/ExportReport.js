define([], function () {
  "use strict";

  class ExportReport {
    constructor() {
      this.supportedFormats = {
        excel: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "spreadsheetML",
          label: "Excel",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/sheet.svg`,
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        data: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
          label: "Excel Data",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-spreadsheet.svg`,
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        pdf: {
          mime: "application/pdf",
          ext: "pdf",
          format: "PDF",
          label: "PDF",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-text.svg`,
          primaryColor: "#FF0000",
          secondaryColor: "#FFFFFF",
        },
        csv: {
          mime: "text/csv",
          ext: "csv",
          format: "CSV",
          label: "CSV",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/table.svg`,
          primaryColor: "#4178BE",
          secondaryColor: "white",
        },
        xml: {
          mime: "application/xml",
          ext: "xml",
          format: "XML",
          label: "XML",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-code.svg`,
          primaryColor: "#4178BE",
          secondaryColor: "white",
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

      // Use colors from supportedFormats if config colors are null/undefined/empty
      let primaryColor = config["Primary Color"] || this.supportedFormats[exportType].primaryColor;
      let secondaryColor = config["Secondary Color"] || this.supportedFormats[exportType].secondaryColor;

      el.innerHTML = `
          <style>
            .myButton { 
              height: ${config["Height"] ?? "32px"}; 
              width: ${config["Width"] ?? "120px"}; 
              cursor: pointer; 
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
              height: ${config["Height"] ?? "32px"}; 
              width: ${config["Width"] ?? "120px"};
              filter: ${
                showIcon ? `invert(0) sepia(100%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)` : ""
              };
            }
            .myButton:hover img {
              height: ${config["Height"] ?? "32px"}; 
              width: ${config["Width"] ?? "32px"};
              filter: invert(1);
            }
            .lucide {
              color: ${primaryColor};
              width: ${config["IconHeight"] ?? "24px"};
              height: ${config["IconWidth"] ?? "24px"};
              stroke-width: ${config["Icon Stroke Width"] ?? "1px"};
            }
          </style>
          <button class="myButton btnExport" type="button">
            ${
              showIcon ? `<img src="${iconPath}" alt="${exportLabel}" title="${exportLabel}">` : `Export ${exportLabel}`
            }
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
