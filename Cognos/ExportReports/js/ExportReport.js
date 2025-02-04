define([Application.GlassContext.gateway + "/v1/ext/ExportReports/lib/lucideIcons/lucide.min.js"], (lucide) => {
  "use strict";

  class ExportReport {
    constructor() {
      this.supportedFormats = {
        excel: {
          name: "Excel",
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "spreadsheetML",
          label: "Excel",
          title: "Export as Excel",
          lucideIcon: "sheet",
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        data: {
          name: "Excel Data",
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
          label: "Excel Data",
          title: "Export as Excel Data",
          lucideIcon: "file-spreadsheet",
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        pdf: {
          name: "PDF",
          mime: "application/pdf",
          ext: "pdf",
          format: "PDF",
          label: "PDF",
          title: "Export as PDF",
          lucideIcon: "file-text",
          primaryColor: "#FF0000",
          secondaryColor: "#FFFFFF",
        },
        csv: {
          name: "CSV",
          mime: "text/csv",
          ext: "csv",
          format: "CSV",
          label: "CSV",
          title: "Export as CSV",
          lucideIcon: "table",
          primaryColor: "#4178BE",
          secondaryColor: "white",
        },
        xml: {
          name: "XML",
          mime: "application/xml",
          ext: "xml",
          format: "XML",
          label: "XML",
          title: "Export as XML",
          lucideIcon: "file-code",
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
      let showBorder = config["Show Icon Border"] ?? true;
      let borderVal = showBorder ? `1px solid ${primaryColor}` : "none";

      const uniqueId = oControlHost.generateUniqueID();

      // Use colors from supportedFormats if config colors are null/undefined/empty
      let primaryColor = config["Primary Color"] || this.supportedFormats[exportType].primaryColor;
      let secondaryColor = config["Secondary Color"] || this.supportedFormats[exportType].secondaryColor;

      el.innerHTML = `
      <style>
          .${uniqueId} { 
              height: ${config["Height"] ?? "32px"}; 
              width: ${config["Width"] ?? "120px"}; 
              cursor: pointer; 
              color: ${primaryColor};  
              font-size: ${config["Font"] ?? "14px"}; 
              padding: 0;
              background-color: ${secondaryColor};
              border: ${borderVal};
              display: flex;
              align-items: center;
              justify-content: center;
          }
          .${uniqueId}:hover { 
              background-color: ${primaryColor}; 
              border: ${borderVal};
          }
          .${uniqueId} div {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 100%;
          }
          .${uniqueId} .lucide {
              width: ${showIcon ? "24px" : config["Icon Width"] ?? "24px"};
              height: ${showIcon ? "24px" : config["Icon Height"] ?? "24px"};
              stroke: ${primaryColor};
              stroke-width: ${config["Icon Stroke Width"] ?? "1px"};
          }
          .${uniqueId} span {
              white-space: nowrap;
              font-size: 12px;
              color: ${primaryColor};
          }
          .${uniqueId}:hover span {
              color: ${secondaryColor};
          }
          .${uniqueId}:hover .lucide {
              stroke: ${secondaryColor};
              fill: ${primaryColor};
          }
      </style>
      <button class="${uniqueId} btnExport" type="button" title="${this.supportedFormats[exportType].title}">
          ${
            showIcon
              ? `<div>
                  <i data-lucide="${this.supportedFormats[exportType].lucideIcon}"></i>
                  <span>${this.supportedFormats[exportType].label}</span>
                </div>`
              : `Export ${exportLabel}`
          }
      </button>`;

      // Initialize the icons after adding to DOM
      lucide.createIcons();

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
