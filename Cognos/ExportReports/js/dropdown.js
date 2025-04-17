define(() => {
    "use strict";
  
    class DropdownControl {
      constructor() {
        this.oControlHost = null;
        this._rows = [];
      }
  
      // 1. Grab the host and signal ready
      initialize(oControlHost, fnDoneInitializing) {
        this.oControlHost = oControlHost;
        fnDoneInitializing();
      }
  
      // 2. Capture the first (and only) data store
      setData(oControlHost, oDataStore) {
        if (oDataStore.index === 0) {
          this._rows = oDataStore.getData();
        }
      }
  
      // 3. Draw a single button to open our “example” dialog
      draw(oControlHost) {
        this.oControlHost = oControlHost;
        const c = oControlHost.container;
        c.innerHTML = "";
        const btn = document.createElement("button");
        btn.textContent = "Open Example Dialog";
        btn.addEventListener("click", () => this.showExampleDialog());
        c.appendChild(btn);
      }
  
      // 4. Build and launch a Glass dialog whose htmlContent is our <select>
      showExampleDialog() {
        // unique ID so multiple dialogs never clash
        const selectId = this.oControlHost.generateUniqueID();
        // assume each row object has exactly one property — grab its first key
        const options = this._rows
          .map(row => {
            const key = Object.keys(row)[0];
            const v = row[key];
            return `<option value="${v}">${v}</option>`;
          })
          .join("");
  
        const htmlContent = `
          <div style="margin:10px 0;">
            <label for="${selectId}">Choose a value:</label><br/>
            <select id="${selectId}">
              <option value="">-- Select --</option>
              ${options}
            </select>
          </div>`;
  
        const dialogConfig = {
          title: "Select from Data Store",
          htmlContent,
          type: "default",
          buttons: ["ok", "cancel"],
          callback: {
            ok: () => {
              const sel = document.getElementById(selectId);
              const chosen = sel ? sel.value : null;
              console.log("User selected:", chosen);
              // If you want this control to pass parameters back:
              // this.oControlHost.valueChanged();
              // store chosen somewhere for getParameters()
            }
          }
        };
  
        // GlassContext must have been grabbed by Cognos; this is standard
        const dlgSvc = this.oControlHost
          .page
          .application
          .GlassContext
          .getCoreSvc(".Dialog");
        dlgSvc.createDialog(dialogConfig);
      }
    }
  
    return DropdownControl;
  });
  