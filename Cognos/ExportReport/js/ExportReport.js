define(["https://unpkg.com/lucide@latest"], function ({createIcons, Sheet, FileText, FileSpreadsheet, Table, FileCode}) {
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
          lucideIcon:"Sheet",
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        data: {
          mime: "application/vnd.ms-excel",
          ext: "xlsx",
          format: "xlsxData",
          label: "Excel Data",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-spreadsheet.svg`,
          lucideIcon:"FileSpreadsheet",
          primaryColor: "#10793F",
          secondaryColor: "#FFFFFF",
        },
        pdf: {
          mime: "application/pdf",
          ext: "pdf",
          format: "PDF",
          label: "PDF",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-text.svg`,
          lucideIcon:"FileText",
          primaryColor: "#FF0000",
          secondaryColor: "#FFFFFF",
        },
        csv: {
          mime: "text/csv",
          ext: "csv",
          format: "CSV",
          label: "CSV",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/table.svg`,
          lucideIcon:"Table",
          primaryColor: "#4178BE",
          secondaryColor: "white",
        },
        xml: {
          mime: "application/xml",
          ext: "xml",
          format: "XML",
          label: "XML",
          icon: Application.GlassContext.gateway + `/v1/ext/ExportReports/images/lucide-icons/file-code.svg`,
          lucideIcon:"FileCode ",
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
      let borderVal = ''

      switch(showBorder){
        case true:
            borderVal = `1px solid  ${primaryColor}`;
        case false:
            borderVal = 'none'
      }
        
      // Use colors from supportedFormats if config colors are null/undefined/empty
      let primaryColor = config["Primary Color"] || this.supportedFormats[exportType].primaryColor;
      let secondaryColor = config["Secondary Color"] || this.supportedFormats[exportType].secondaryColor;

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
        .lucide {
          width: ${config["IconHeight"] ?? "24px"};
          height: ${config["IconWidth"] ?? "24px"};
          stroke: ${primaryColor};
          stroke-width: ${config["Icon Stroke Width"] ?? "1px"};
        }
        .myButton:hover .lucide {
          stroke: ${secondaryColor};
        }
      </style>
      <button class="myButton btnExport" type="button">
        ${showIcon 
          ? `<i data-lucide="${this.supportedFormats[exportType].lucideIcon}"></i>` 
          : `Export ${exportLabel}`}
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
