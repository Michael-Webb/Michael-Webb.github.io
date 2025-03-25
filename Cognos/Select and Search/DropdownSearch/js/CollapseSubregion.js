define(function () {
  "use strict";

  class Control {
    constructor() {}

    initialize(oControlHost, fnDoneInitializing) {
      this.m_oControlHost = oControlHost;
      this.m_sControlName = this.getConfigurationValue("Control name", "Block1");
      this.m_bVertical = this.getConfigurationValue("Vertical", false);
      fnDoneInitializing();
    }

    destroy() {
      this.m_oControlHost = null;
    }

    getConfigurationValue(sName, sDefaultValue) {
      const o = this.m_oControlHost.configuration;
      return o && o[sName] !== undefined ? o[sName] : sDefaultValue;
    }

    draw(oControlHost) {
      const elContainer = oControlHost.container;
      const sUniqueSelector = "myDisplayButton_" + elContainer.id;
      const sBorderColor = this.getConfigurationValue("Border color", null);
      const sHoverBackgroundColor = this.getConfigurationValue("Hover background color", null);
      const sHoverColor = this.getConfigurationValue("Hover foreground color", null);

      elContainer.innerHTML =
        "<style>" +
        "." +
        sUniqueSelector +
        "\n" +
        "{" +
        "background-color:" +
        this.getConfigurationValue("Background color", "transparent") +
        ";" +
        "color:" +
        this.getConfigurationValue("Foreground color", "currentcolor") +
        ";" +
        "font-size:" +
        this.getConfigurationValue("Font size", "inherit") +
        ";" +
        "padding:" +
        this.getConfigurationValue("Padding", "0px 6px 0px 6px") +
        ";" +
        (sBorderColor ? "border:1px solid " + sBorderColor : "border:0") +
        ";" +
        "}" +
        "." +
        sUniqueSelector +
        ":hover\n" +
        "{" +
        (sHoverBackgroundColor ? "background-color:" + sHoverBackgroundColor + ";" : "") +
        (sHoverColor ? "color:" + sHoverColor + ";" : "") +
        (sBorderColor ? "border:1px solid " + this.getConfigurationValue("Hover border color", "#EAEAEA") : "") +
        ";" +
        "}" +
        "</style>" +
        '<button class="' +
        sUniqueSelector +
        '"></button>';

      this.m_btn = elContainer.lastChild;
      this.m_btn.onclick = this.onClick.bind(this);
      this.updateButton();
    }

    onClick() {
      this.m_oControlHost.page.getControlByName(this.m_sControlName).toggleDisplay();
      this.updateButton();
    }

    updateButton() {
      const b = this.m_oControlHost.page.getControlByName(this.m_sControlName).getDisplay();

      if (b) {
        this.m_btn.innerHTML = this.m_bVertical
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${this.getConfigurationValue("Icon Width", "24px")}" height="${this.getConfigurationValue("Icon Height", "24px")}"  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" disabled><path d="m6 9 6 6 6-6"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${this.getConfigurationValue("Icon Width", "24px")}" height="${this.getConfigurationValue("Icon Height", "24px")}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left" disabled><path d="m15 18-6-6 6-6"/></svg>`;
      } else {
        this.m_btn.innerHTML = this.m_bVertical
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${this.getConfigurationValue("Icon Width", "24px")}" height="${this.getConfigurationValue("Icon Height", "24px")}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-up" disabled><path d="m6 15 6-6 6 6"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${this.getConfigurationValue("Icon Width", "24px")}" height="${this.getConfigurationValue("Icon Height", "24px")}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right" disabled><path d="m9 18 6-6-6-6"/></svg>`;
      }

      this.m_btn.title = b ? "Hide" : "Show";
    }
  }

  return Control;
});
