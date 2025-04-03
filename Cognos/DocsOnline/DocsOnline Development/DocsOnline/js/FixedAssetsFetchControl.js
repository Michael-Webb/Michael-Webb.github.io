(async function () {
  // Grab sessionID, token, appURL, and jobURL from the first span with an id starting with "documentOnline-"
  let sessionID = "";
  let token = "";
  let appBaseURL = "https://cppfosapp.fdn.cpp.edu/";
  let jobBaseURL = "https://cppfosjob.fdn.cpp.edu/";

  const firstSpan = document.querySelector(`span[id^="documentOnline-"]`);
  if (firstSpan) {
    sessionID = firstSpan.getAttribute("data-sessionId") || "";
    token = firstSpan.getAttribute("data-token") || "";
    // Extract and decode app and job URLs if they exist
    const appURLFromSpan = firstSpan.getAttribute("data-appURL");
    const jobURLFromSpan = firstSpan.getAttribute("data-jobURL");
    if (appURLFromSpan) {
      appBaseURL = decodeURIComponent(appURLFromSpan);
    }
    if (jobURLFromSpan) {
      jobBaseURL = decodeURIComponent(jobURLFromSpan);
    }
    console.log("Extracted values:", { sessionID, token, appBaseURL, jobBaseURL });
  } else {
    console.error("No span found with id starting with documentOnline- to extract sessionID, token, and URLs.");
  }

  // Define icon dimensions and SVGs
  const ICON_DIMENSIONS = { height: "14px", width: "14px" };
  const MASK_NAME = "FAUPAS"
  const MODAL_LABEL = "Asset ID: "
  // Function to generate SVG for specific file type and size
  function getSvgForType(fileType, size) {
    const height = size.height;
    const width = size.width;

    switch (fileType) {
      case "pdf":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
      case "csv":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-spreadsheet-icon lucide-file-spreadsheet"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>`;
      case "excel":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-x-icon lucide-file-x"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m14.5 12.5-5 5"/><path d="m9.5 12.5 5 5"/></svg>`;
      case "image":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-image-icon lucide-file-image"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg>`;
      case "doc":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
      case "txt":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`;
      case "paperclip":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>`;
      case "clock":
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      default:
        return `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${width}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-icon lucide-file"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
    }
  }

  // Function to create and show a custom modal with document links
  // Replace the showDocumentModal function with this data table implementation
  function showDocumentModal(documentData,RefId) {
    try {
      const modalOverlay = document.createElement("div");
      modalOverlay.style.position = "fixed";
      modalOverlay.style.top = "0";
      modalOverlay.style.left = "0";
      modalOverlay.style.width = "100%";
      modalOverlay.style.height = "100%";
      modalOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      modalOverlay.style.display = "flex";
      modalOverlay.style.justifyContent = "center";
      modalOverlay.style.alignItems = "center";
      modalOverlay.style.zIndex = "9999";
  
      const modalContent = document.createElement("div");
      modalContent.style.backgroundColor = "white";
      modalContent.style.borderRadius = "5px";
      modalContent.style.width = "80%";
      modalContent.style.maxWidth = "50%";
      modalContent.style.maxHeight = "50%";
      modalContent.style.display = "flex";
      modalContent.style.flexDirection = "column";
      modalContent.style.position = "relative";
      modalContent.style.fontSize = ".875em"
  
      const modalHeader = document.createElement("div");
      modalHeader.style.display = "flex";
      modalHeader.style.justifyContent = "space-between";
      modalHeader.style.alignItems = "center";
      modalHeader.style.padding = "15px 20px";
      modalHeader.style.borderBottom = "1px solid #ddd";
  
      const modalTitle = document.createElement("h3");
      modalTitle.textContent = MODAL_LABEL + RefId;
      modalTitle.style.margin = "0";
  
      const closeButton = document.createElement("button");
      closeButton.textContent = "×";
      closeButton.style.background = "none";
      closeButton.style.border = "none";
      closeButton.style.fontSize = "24px";
      closeButton.style.cursor = "pointer";
      closeButton.style.padding = "0 5px";
      closeButton.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.removeChild(modalOverlay);
      };
  
      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);
  
      const modalBody = document.createElement("div");
      modalBody.style.padding = "0 20px";
      modalBody.style.overflowY = "auto";
      modalBody.style.flexGrow = "1";
      
      // Create table
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "10px";
      table.style.marginBottom = "10px";
      table.style.tableLayout = "fixed"; // Use fixed layout for no word wrap
      
      // Create table header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      
      // Define headers
      const headers = [
        "Document ID", 
        "FileName", 
        "File Type", 
        "Pages", 
        "Page Count", 
        "Create Date", 
        "Attachment Definition"
      ];
      
      // Define column widths (percentages)
      const columnWidths = [15, 30, 10, 8, 8, 15, 14];
      
      headers.forEach((headerText, index) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        th.style.padding = "8px";
        th.style.textAlign = "left";
        th.style.borderBottom = "1px solid #ddd";
        th.style.backgroundColor = "#f2f2f2";
        th.style.width = columnWidths[index] + "%";
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      documentData.sort((a, b) => {
        // Convert docId strings to numbers for proper numerical sorting
        const idA = parseInt(a.docId) || 0;
        const idB = parseInt(b.docId) || 0;
        return idA - idB;
      });

      // Create table body
      const tbody = document.createElement("tbody");
      
      documentData.forEach(doc => {
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.onmouseover = function() {
          this.style.backgroundColor = "#f5f5f5";
        };
        row.onmouseout = function() {
          this.style.backgroundColor = "";
        };
        
        // Add click handler to open document
        if (doc.url) {
          row.onclick = function() {
            window.open(doc.url, "_blank");
          };
        }
        
        // Create cells for each column
        const createCell = (content, isIcon = false, isFilename = false) => {
          const td = document.createElement("td");
          td.style.padding = "8px";
          td.style.borderBottom = "1px solid #ddd";
          td.style.whiteSpace = "nowrap"; // Prevent word wrap
          td.style.overflow = "hidden";
          td.style.textOverflow = "ellipsis"; // Show ellipsis for overflow
          td.title = content

          if (isFilename && doc.url) {
            // Create a hyperlink for the filename
            const link = document.createElement("a");
            link.href = doc.url;
            link.target = "_blank";
            link.textContent = content || "";
            link.style.textDecoration = "underline";
            link.style.color = "#0066cc";
            
            if (isIcon && doc.clsid) {
              // Add icon before the link text
              const extension = doc.clsid.toLowerCase();
              let iconType = "generic";
              
              if (extension.includes(".pdf")) {
                iconType = "pdf";
              } else if (extension.includes(".csv")) {
                iconType = "csv";
              } else if ([".xls", ".xlsx", ".xlsm", ".xlsb"].some(ext => extension.includes(ext))) {
                iconType = "excel";
              } else if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].some(ext => extension.includes(ext))) {
                iconType = "image";
              } else if ([".doc", ".docx"].some(ext => extension.includes(ext))) {
                iconType = "doc";
              } else if ([".txt", ".rtf", ".odt"].some(ext => extension.includes(ext))) {
                iconType = "txt";
              }
              
              const iconSpan = document.createElement("span");
              iconSpan.innerHTML = getSvgForType(iconType, ICON_DIMENSIONS);
              iconSpan.style.marginRight = "5px";
              td.appendChild(iconSpan);
            }
            
            td.appendChild(link);
            
            // Prevent row click from triggering when clicking the link directly
            link.onclick = function(e) {
              e.stopPropagation();
            };
          } else if (isIcon && doc.clsid) {
            const iconSpan = document.createElement("span");
            const extension = doc.clsid.toLowerCase();
            let iconType = "generic";
            
            if (extension.includes(".pdf")) {
              iconType = "pdf";
            } else if (extension.includes(".csv")) {
              iconType = "csv";
            } else if ([".xls", ".xlsx", ".xlsm", ".xlsb"].some(ext => extension.includes(ext))) {
              iconType = "excel";
            } else if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].some(ext => extension.includes(ext))) {
              iconType = "image";
            } else if ([".doc", ".docx"].some(ext => extension.includes(ext))) {
              iconType = "doc";
            } else if ([".txt", ".rtf", ".odt"].some(ext => extension.includes(ext))) {
              iconType = "txt";
            }
            
            iconSpan.innerHTML = getSvgForType(iconType, ICON_DIMENSIONS);
            td.appendChild(iconSpan);
            
            const textSpan = document.createElement("span");
            textSpan.textContent = " " + content;
            td.appendChild(textSpan);
          } else {
            td.textContent = content || "";
          }
          
          return td;
        };
        
        // Add all cells to the row
        row.appendChild(createCell(doc.docId));
        row.appendChild(createCell(doc.description, true, true)); // Added true for isFilename
        row.appendChild(createCell(doc.clsid.toLowerCase()));
        row.appendChild(createCell(doc.pages));
        row.appendChild(createCell(doc.pageCount));
        row.appendChild(createCell(doc.createDt));
        row.appendChild(createCell(doc.attachID));
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      modalBody.appendChild(table);
  
      const modalFooter = document.createElement("div");
      modalFooter.style.padding = "15px 20px";
      modalFooter.style.borderTop = "1px solid #ddd";
      modalFooter.style.textAlign = "right";
      modalFooter.style.backgroundColor = "#f9f9f9";
  
      const okButton = document.createElement("button");
      okButton.textContent = "Close";
      okButton.style.padding = "5px 15px";
      okButton.style.backgroundColor = "#4CAF50";
      okButton.style.color = "white";
      okButton.style.border = "none";
      okButton.style.borderRadius = "3px";
      okButton.style.cursor = "pointer";
      okButton.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.removeChild(modalOverlay);
      };
  
      modalFooter.appendChild(okButton);
  
      modalContent.appendChild(modalHeader);
      modalContent.appendChild(modalBody);
      modalContent.appendChild(modalFooter);
      modalOverlay.appendChild(modalContent);
  
      modalContent.onclick = function (e) {
        e.stopPropagation();
      };
  
      document.body.appendChild(modalOverlay);
  
      modalOverlay.onclick = function (e) {
        document.body.removeChild(modalOverlay);
      };
    } catch (error) {
      console.error("Error showing data table:", error);
      alert("There was an error showing the document table.");
    }
  }
  // --- Sequential Fetch Calls ---

  // 1. Fetch the FAUPAS screen to capture cookies
  try {
    const faupasResponse = await fetch(appBaseURL + "Production-UI/ui/uiscreens/fixedassets/FAUPAS", {
      headers: {
        priority: "u=0, i",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-site",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      referrer: jobBaseURL,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "no-cors",
      credentials: "include",
    });
    console.log("FAUPAS fetch complete:", faupasResponse);
  } catch (error) {
    console.error("Error during FAUPAS fetch:", error);
  }

  // 2. Fetch API token and validate token
  try {
    const tokenResponse = await fetch(
      `${jobBaseURL}Production/api/user/apiToken?sessionId=${sessionID}&authToken=${token}`,
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "no-cors",
          "sec-fetch-site": "same-site",
        },
        referer: appBaseURL,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "omit",
        "access-control-allow-origin:": "*",
      }
    );
    if (!tokenResponse.ok) {
      throw new Error("API Token fetch failed: " + tokenResponse.status);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.apiToken) {
      throw new Error("No API token in response");
    }
    const apiToken = tokenData.apiToken;
    console.log("API Token obtained:", apiToken);

    const validationResponse = await fetch(`${jobBaseURL}Production/api/User/ValidateSecurityToken`, {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
        Authorization: "Bearer " + apiToken,
      },
      referrer: appBaseURL,
      referrerPolicy: "strict-origin-when-cross-origin",
      body:
        "sessionId=" +
        sessionID +
        "&authToken=" +
        token +
        "&claims=NameIdentifier&claims=Name&claims=GivenName&claims=Surname",
      method: "POST",
      mode: "cors",
      credentials: "omit",
    });
    if (!validationResponse.ok) {
      throw new Error("Token validation failed: " + validationResponse.status);
    }
    console.log("Token validated for sessionID:", sessionID);
  } catch (error) {
    console.error("Error fetching API token or validating token:", error);
  }

  // 3. Process spans for attachments only after authentication is complete
  // 3. Process spans for attachments only after authentication is complete
  const spans = document.querySelectorAll(`span[id^="documentOnline-"]`);

  // Create an array of promises for each span
  const fetchPromises = Array.from(spans).map((span) => {
    const assetID = span.getAttribute("data-ref");
    console.log("Processing asset ID:", assetID);

    // Create or retrieve a container span to display the icon
    let container = document.getElementById(assetID);
    if (!container) {
      container = document.createElement("span");
      container.id = assetID;
      span.parentNode.insertBefore(container, span.nextSibling);
    } else {
      container.innerHTML = "";
    }

    // Insert clock SVG as a loading placeholder
    container.innerHTML = getSvgForType("clock", ICON_DIMENSIONS);

    // Return a promise for this spans processing
    return fetch(
      `${appBaseURL}Production-UI/data/finance/legacy/FAIdnt?$filter=(Faid%20eq%20%27${assetID}%27%20and%20Ledger%20eq%20%27GL%27)&$orderby=Ledger,Faid&$skip=0&$top=20`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          "content-type": "application/json",
          glledger: "GL",
          jlledger: "JL",
          mask: "FAUPAS",
          pragma: "no-cache",
          priority: "u=1, i",
          runtimemask: "FAUPAS",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        referrer: `${appBaseURL}Production-UI/ui/uiscreens/fixedassets/FAUPAS`,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: null,
        method: "GET",
        mode: "cors",
        credentials: "include",
      }
    )
      .then((assetResponse) => {
        if (!assetResponse.ok) {
          throw new Error(`Failed to fetch asset details for ID ${assetID}: ${assetResponse.status}`);
        }
        return assetResponse.json();
      })
      .then((assetData) => {
        console.log(`Asset data for ID ${assetID}:`, assetData);

        if (!assetData || !assetData.items || assetData.items.length === 0) {
          throw new Error(`No asset data found for ID ${assetID}`);
        }

        // Use the asset data item as the body for the attachments fetch
        const assetItem = assetData.items[0];

        // Now fetch attachments with the asset item as the body
        return fetch(`${appBaseURL}Production-UI/api/finance/legacy/documents/FAIdnt/attachments/`, {
          method: "POST",
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            glledger: "GL",
            jlledger: "--",
            mask: "FAUPAS",
            runtimemask: "FAUPAS",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
          },
          body: JSON.stringify(assetItem),
          mode: "cors",
          credentials: "include",
          "Access-Control-Allow-Credentials": "*",
        });
      })
      .then((attachmentResponse) => {
        if (!attachmentResponse.ok) {
          throw new Error(`Failed to fetch attachment for asset ID ${assetID}: ${attachmentResponse.status}`);
        }
        return attachmentResponse.json();
      })
      .then((data) => {
        console.log(`Attachment data for asset ID ${assetID}:`, data);

        // Remove the clock SVG placeholder
        container.innerHTML = "";
        if (data && data.length > 0) {
          console.log("Found", data.length, "documents for asset ID:", assetID);

          const button = document.createElement("button");
          button.innerHTML = getSvgForType("paperclip", ICON_DIMENSIONS);
          button.style.border = "none";
          button.style.background = "none";
          button.style.cursor = "pointer";
          button.style.padding = "0";
          button.title = `${data.length} document${data.length > 1 ? "s" : ""}`;

          button.setAttribute("data-documents", JSON.stringify(data));

          button.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            try {
              const btnDocuments = JSON.parse(this.getAttribute("data-documents"));
              showDocumentModal(btnDocuments,assetID);
            } catch (error) {
              console.error("Error showing modal:", error);
              alert("There was an error displaying the documents.");
            }
            return false;
          };

          container.appendChild(button);
          console.log("Button added for asset ID:", assetID);
        } else {
          console.log("No documents found for asset ID:", assetID);
          // If no documents are found, the clock SVG has already been removed.
        }
      })
      .catch((error) => {
        console.error("Error processing asset ID", assetID, error);
        // On error, remove the clock SVG
        container.innerHTML = "";
      });
  });

  // Execute all promises simultaneously (non-blocking)
  Promise.all(fetchPromises)
    .then(() => console.log("All asset document fetches complete"))
    .catch((error) => console.error("Error in batch processing:", error));
})();

// let appBaseURL = "https://cppfosapp.fdn.cpp.edu/";
// let jobBaseURL = "https://cppfosjob.fdn.cpp.edu/";

async function getBTModels(appURL, jobURL) {
  try {
    const response = await fetch(`${appURL}Production-UI/api/finance/legacy/workflow/GetBT20Models`, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
      },
      referrer: `${jobURL}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: "{}",
      method: "POST",
      mode: "cors",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch BTModels`);
    }

    const data = await response.json();
    const dataJson = typeof data === "string" ? JSON.parse(data) : data;
    let btArray = dataJson.Response.workflow_models.model_info.map((item) => item["@object"]);
    let uniqueBtArray = [...new Set(btArray)].sort();
    return uniqueBtArray;
  } catch (error) {
    console.error("Error fetching BT models:", error);
    return [];
  }
}

async function main() {
  let arrayOfDefs = await getBTModels(appBaseURL, jobBaseURL);
  console.log(arrayOfDefs);

  if (arrayOfDefs && arrayOfDefs.length > 0) {
    AttachDef(arrayOfDefs);
  }
}
let extraDefs = ["BT20.PENameMaster", "BT20.OHZRepeatMaster", "BT20.PEAddrDetail", "BT20.PEVendorDetail"];
function AttachDef(defArray) {
  // Fixed: toString() is not a function, need to use join()
  let attachDefParams = defArray.join(",");

  fetch(`${appBaseURL}Production-UI/api/finance/legacy/documents/attachDefinitions?progIds=${attachDefParams}`, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
    },
    referrer: `${appBaseURL}`,
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
    credentials: "include",
  });
}

main();
