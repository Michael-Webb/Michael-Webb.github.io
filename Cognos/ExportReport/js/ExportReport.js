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
                  <button class="myButton btnGetPromptControls" type="button">GetPromptControls</button>
                  <button class="myButton btnGetAllParameters" type="button">GetPromptControls</button>`;
  
        el.querySelector(".btnExport").onclick = this.f_ExportButtonClick.bind(
          this,
          o
        );
        el.querySelector(".btnGetPromptControls").onclick = this.f_getPromptControls.bind(
          this,
          o
        );
        el.querySelector(".btnGetAllParameters").onclick = this.f_getAllParameters.bind(
          this,
          o
        );
      }
  
      f_ExportButtonClick(oControlHost) {
        console.log('ExportReport','exportType')
      }
      
      f_getPromptControls(oControlHost) {
        let aControls = oControlHost.page.getAllPromptControls();
  
        console.log('All Prompt Controls',aControls);
      }
  
      f_getAllParameters(oControlHost) {
        let aControls = this.getParameters(oControlHost);
  
        console.log('All Parameters',aControls);
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
  