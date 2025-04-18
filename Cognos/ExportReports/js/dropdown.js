define(() => {
  "use strict";

  class DropdownControl {
    constructor() {
      this.oControlHost = null;
      this.GlassContext = null;
      this._oDataStore = null;
    }

    initialize(oControlHost, fnDoneInitializing) {
      this.oControlHost = oControlHost;
      // grab the GlassContext for dialogs (if available)
      const app = oControlHost.page && oControlHost.page.application;
      this.GlassContext = app && app.GlassContext ? app.GlassContext : null;
      fnDoneInitializing();
    }

    setData(oControlHost, oDataStore) {
      // we only care about the first (and only) store
      if (oDataStore.index === 0) {
        this._oDataStore = oDataStore;
      }
    }

    draw(oControlHost) {
      const c = oControlHost.container;
      c.innerHTML = "";
      const btn = document.createElement("button");
      btn.textContent = "Open Example Dialog";
      btn.addEventListener("click", () => this.showExampleDialog());
      c.appendChild(btn);
    }

    showExampleDialog() {
      if (!this._oDataStore) {
        alert("No data available to build dropdown.");
        return;
      }

      const ds = this._oDataStore;
      // assume exactly one column
      const colName = ds.columnNames[0];
      const colIndex = ds.getColumnIndex(colName);

      // build <option>s
      let optionsHtml = `<option value="">-- Select --</option>`;
      for (let i = 0; i < ds.rowCount; i++) {
        const v = ds.getCellValue(i, colIndex);
        optionsHtml += `<option value="${v}">${v}</option>`;
      }

      // unique ID so it won’t collide
      const selectId = this.oControlHost.generateUniqueID();
      const htmlContent = `
          <div style="margin:10px 0;">
            <label for="${selectId}">Choose ${colName}:</label><br/>
            <select id="${selectId}">
              ${optionsHtml}
            </select>
          </div>
        `;

      const dialogConfig = {
        title: `Select a ${colName}`,
        message: htmlContent,
        htmlContent: true,
        type: "info",
        buttons: ["ok", "cancel"],
        callback: {
          ok: () => {
            const sel = document.getElementById(selectId);
            const chosen = sel ? sel.value : null;
            console.log("User selected:", chosen);
            // this.oControlHost.valueChanged();
            // and stash `chosen` on `this` for getParameters()
          },
          cancel: () => {
            this.createCustomDialog({
              title: "Warning Confirmation",
              message: "Triggered by clicking Cancel.",
              type: "warning",
              buttons: ["ok"],
            });
          },
        },
        callbackScope: { ok: this, cancel: this },
      };

      if (this.GlassContext && this.GlassContext.getCoreSvc && typeof this.GlassContext.getCoreSvc === "function") {
        const dlgSvc = this.GlassContext.getCoreSvc(".Dialog");
        dlgSvc.createDialog(dialogConfig);
      } else {
        alert("Dialog service unavailable.");
      }
    }

    // (optional stubs you can implement if you need them)
    destroy(oControlHost) {}
    show(oControlHost) {}
    hide(oControlHost) {}
    isInValidState(oControlHost) {
      return true;
    }
    getParameters(oControlHost) {
      return null;
    }
  }

  return DropdownControl;
});
//v5