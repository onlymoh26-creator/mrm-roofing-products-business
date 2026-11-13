
/* =========================================================
   MABATI ROLLING MILLS
   ROOFING QUOTATION SYSTEM
   File: invoice.js
   Backend: Cloudflare Worker + D1 + R2

   FEATURES:
   - Replaces the old WhatsApp quotation form
   - Generates pro-forma quotation PDFs
   - Includes official company logo
   - Verifies prices through the server
   - Saves PDFs securely to Cloudflare R2
   - Provides download and online viewing
   - Shares only the public quotation link via WhatsApp
   - Automatic PDF download enabled
   - TURNSTILE REMOVED
   ========================================================= */

(() => {
  "use strict";

  /* 1. CONFIGURATION */

  const API_BASE =
    "https://mrm-invoice-api.onlymoh26.workers.dev";

  const LOGO_PATH = "images/mrm-logo.png";

  const WHATSAPP_NUMBER = "254733608974";
  const CURRENCY = "KES";

  let catalogue = [];
  let companyLogo = null;

  /* 2. GENERAL HELPERS */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function money(value) {
    return `${CURRENCY} ${Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function createWhatsAppLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
        data.error ||
        "The quotation server could not complete your request."
      );
    }

    return data;
  }

  function showMessage(message, type = "info") {
    const box = document.getElementById("mrmInvoiceMessage");
    if (!box) return;

    box.textContent = message;
    box.className = `mrm-invoice-message ${type}`;
    box.style.display = "block";

    box.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function setLoading(loading) {
    const button = document.getElementById("mrmCreateInvoiceBtn");
    if (!button) return;

    button.disabled = loading;

    button.textContent = loading
      ? "GENERATING YOUR QUOTATION..."
      : "GET ROOFING QUOTATION";
  }

  /* 3. LOAD OFFICIAL COMPANY LOGO */

  async function loadCompanyLogo() {
    if (companyLogo) return companyLogo;

    const logoURL = new URL(LOGO_PATH, document.baseURI);

    const response = await fetch(logoURL.href, {
      cache: "force-cache"
    });

    if (!response.ok) {
      throw new Error(
        `Company logo could not be loaded: ${response.status}`
      );
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error("The company logo file is not a valid image.");
    }

    const dataURL = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(
        new Error("Could not read the company logo.")
      );

      reader.readAsDataURL(blob);
    });

    const dimensions = await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      };

      image.onerror = () => reject(
        new Error("The company logo image could not be decoded.")
      );

      image.src = dataURL;
    });

    companyLogo = {
      data: dataURL,
      width: dimensions.width,
      height: dimensions.height
    };

    return companyLogo;
  }

  /* 4. QUOTATION STYLES */

  function addStyles() {
    if (document.getElementById("mrmInvoiceStyles")) return;

    const style = document.createElement("style");
    style.id = "mrmInvoiceStyles";

    style.textContent = `
      #mrmInvoiceSection {
        padding: 65px 20px;
        background: #f4f6f9;
        color: #182b43;
      }

      #mrmInvoiceSection .mrm-invoice-container {
        max-width: 1050px;
        margin: auto;
        background: #ffffff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 25px rgba(0,0,0,.07);
      }

      #mrmInvoiceSection h2 {
        text-align: center;
        color: #12365a;
        margin-bottom: 12px;
      }

      #mrmInvoiceSection .mrm-invoice-intro {
        text-align: center;
        color: #64748b;
        margin-bottom: 30px;
        line-height: 1.6;
      }

      #mrmInvoiceSection .mrm-invoice-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      #mrmInvoiceSection .mrm-invoice-field {
        margin-bottom: 18px;
        min-width: 0;
      }

      #mrmInvoiceSection label {
        display: block;
        font-weight: 600;
        margin-bottom: 7px;
        color: #24364b;
      }

      #mrmInvoiceSection input,
      #mrmInvoiceSection select {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        font: inherit;
      }

      #mrmInvoiceSection .mrm-invoice-items {
        margin-top: 25px;
      }

      #mrmInvoiceSection .mrm-invoice-item {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 10px;
        align-items: end;
        padding: 15px 0;
        border-bottom: 1px solid #e2e8f0;
      }

      #mrmInvoiceSection .mrm-invoice-item label {
        font-size: 13px;
      }

      #mrmInvoiceSection button {
        cursor: pointer;
        border: none;
        border-radius: 6px;
        padding: 12px 18px;
        font-weight: 700;
      }

      #mrmAddInvoiceItem {
        background: #e5edf5;
        color: #12365a;
        margin-top: 18px;
      }

      #mrmCreateInvoiceBtn {
        width: 100%;
        margin-top: 25px;
        padding: 16px;
        background: #12365a;
        color: #ffffff;
        font-size: 15px;
      }

      #mrmCreateInvoiceBtn:disabled {
        opacity: .6;
        cursor: wait;
      }

      #mrmInvoiceSection .mrm-remove-item {
        background: #fee2e2;
        color: #991b1b;
      }

      #mrmInvoiceSection .mrm-invoice-total {
        text-align: right;
        font-size: 20px;
        font-weight: 800;
        margin-top: 25px;
        color: #12365a;
      }

      #mrmInvoiceSection .mrm-invoice-message {
        display: none;
        margin-top: 20px;
        padding: 14px;
        border-radius: 6px;
        line-height: 1.5;
      }

      #mrmInvoiceSection .mrm-invoice-message.error {
        background: #fee2e2;
        color: #991b1b;
      }

      #mrmInvoiceSection .mrm-invoice-message.success {
        background: #dcfce7;
        color: #166534;
      }

      #mrmInvoiceSection .mrm-invoice-message.info {
        background: #e0f2fe;
        color: #075985;
      }

      #mrmInvoiceSection .mrm-invoice-results {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid #dbe4ee;
        border-radius: 8px;
        display: none;
      }

      #mrmInvoiceSection .mrm-invoice-results a {
        display: inline-block;
        margin: 8px 8px 8px 0;
        padding: 12px 16px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 700;
        background: #12365a;
        color: #ffffff;
      }

      #mrmInvoiceSection .mrm-invoice-results a.mrm-whatsapp {
        background: #15803d;
      }

      #mrmInvoiceSection .mrm-small-note {
        font-size: 13px;
        color: #64748b;
        line-height: 1.6;
        margin-top: 18px;
      }

      @media(max-width: 650px) {
        #mrmInvoiceSection .mrm-invoice-container {
          padding: 20px 15px;
        }

        #mrmInvoiceSection .mrm-invoice-grid {
          grid-template-columns: 1fr;
        }

        #mrmInvoiceSection .mrm-invoice-item {
          grid-template-columns: 1fr 1fr;
        }

        #mrmInvoiceSection .mrm-invoice-item .mrm-product-field {
          grid-column: 1 / -1;
        }

        #mrmInvoiceSection .mrm-remove-item {
          grid-column: 1 / -1;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* 5. CREATE QUOTATION SECTION
     REPLACES THE OLD WHATSAPP QUOTATION FORM */

  function createInvoiceSection() {
    const existingSection = document.getElementById(
      "mrmInvoiceSection"
    );

    const quoteForm = document.getElementById("quotationForm");

    const quoteSection = quoteForm
      ? (
          quoteForm.closest(".quotation-section") ||
          quoteForm.closest("section")
        )
      : null;

    if (existingSection) {
      if (
        quoteSection &&
        quoteSection !== existingSection
      ) {
        quoteSection.remove();
      }

      return;
    }

    const section = document.createElement("section");
    section.id = "mrmInvoiceSection";

    section.innerHTML = `
      <div class="mrm-invoice-container">

        <h2>GET A ROOFING QUOTATION</h2>

        <p class="mrm-invoice-intro">
          Generate your roofing materials quotation instantly.
          Select your products, enter your details and receive
          your downloadable pro-forma quotation.
        </p>

        <form id="mrmInvoiceForm">

          <div class="mrm-invoice-grid">

            <div class="mrm-invoice-field">
              <label for="mrmCustomerName">
                Customer / Company Name *
              </label>
              <input
                id="mrmCustomerName"
                name="customerName"
                type="text"
                required
                maxlength="120"
                placeholder="Enter customer or company name">
            </div>

            <div class="mrm-invoice-field">
              <label for="mrmCustomerPhone">
                Phone Number *
              </label>
              <input
                id="mrmCustomerPhone"
                name="customerPhone"
                type="tel"
                required
                maxlength="30"
                placeholder="Enter phone number">
            </div>

            <div class="mrm-invoice-field">
              <label for="mrmCustomerLocation">
                Delivery Location *
              </label>
              <input
                id="mrmCustomerLocation"
                name="customerLocation"
                type="text"
                required
                maxlength="200"
                placeholder="Enter delivery location">
            </div>

          </div>

          <div class="mrm-invoice-items">

            <h3>PRODUCT DETAILS</h3>

            <div id="mrmInvoiceItems"></div>

            <button type="button" id="mrmAddInvoiceItem">
              + ADD ANOTHER PRODUCT
            </button>

          </div>

          <div class="mrm-invoice-total">
            Indicative Total:
            <span id="mrmInvoiceTotal">KES 0.00</span>
          </div>

          <p class="mrm-small-note">
            The displayed total is indicative. Final prices and totals
            are verified by the MRM quotation server before the
            quotation is issued.
          </p>

          <div
            id="mrmInvoiceMessage"
            class="mrm-invoice-message">
          </div>

          <button type="submit" id="mrmCreateInvoiceBtn">
            GET ROOFING QUOTATION
          </button>

        </form>

        <div id="mrmInvoiceResults" class="mrm-invoice-results"></div>

        <p class="mrm-small-note">
          A pro-forma quotation is not proof of payment.
          Payments must be made through authorised official payment
          channels. No cash payments are accepted.
        </p>

      </div>
    `;

    /* REMOVE OLD QUOTATION FORM AND REPLACE IT */

    if (quoteForm) {
      if (quoteSection && quoteSection.parentNode) {
        quoteSection.replaceWith(section);
        return;
      }

      quoteForm.replaceWith(section);
      return;
    }

    /* FALLBACK IF THE OLD FORM DOES NOT EXIST */

    const footer = document.querySelector("footer");

    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }
  }

  /* 6. NAVIGATION LINK */

  function addNavigationLink() {
    const navLists = document.querySelectorAll(
      "header nav ul, nav ul"
    );

    navLists.forEach(list => {
      if (list.querySelector('[href="#mrmInvoiceSection"]')) return;

      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = "#mrmInvoiceSection";
      link.textContent = "Get a Roofing Quotation";

      item.appendChild(link);
      list.appendChild(item);
    });
  }

  /* 7. LOAD SERVER CATALOGUE */

  async function loadCatalogue() {
    const response = await apiRequest("/api/catalogue");

    catalogue = Array.isArray(response.products)
      ? response.products
      : [];

    if (!catalogue.length) {
      throw new Error("The server product catalogue is empty.");
    }

    addInvoiceItem();
  }

  /* 8. PRODUCT OPTIONS */

  function productOptions() {
    return `
      <option value="">Select roofing product</option>
      ${catalogue.map((product, index) => `
        <option value="${index}">
          ${escapeHTML(product.name)}
        </option>
      `).join("")}
    `;
  }

  /* 9. ADD PRODUCT ROW */

  function addInvoiceItem() {
    const container = document.getElementById("mrmInvoiceItems");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "mrm-invoice-item";

    row.innerHTML = `
      <div class="mrm-invoice-field mrm-product-field">
        <label>Roofing Product *</label>
        <select class="mrm-product" required>
          ${productOptions()}
        </select>
      </div>

      <div class="mrm-invoice-field">
        <label>Gauge / Specification</label>
        <select class="mrm-gauge" required>
          <option value="">Select product first</option>
        </select>
      </div>

      <div class="mrm-invoice-field">
        <label>Quantity / Metres *</label>
        <input
          class="mrm-quantity"
          type="number"
          min="0.1"
          step="0.1"
          value="2"
          required>
      </div>

      <button type="button" class="mrm-remove-item">
        REMOVE
      </button>
    `;

    container.appendChild(row);

    row.querySelector(".mrm-product").addEventListener(
      "change",
      () => updateGaugeOptions(row)
    );

    row.querySelector(".mrm-gauge").addEventListener(
      "change",
      updateTotal
    );

    row.querySelector(".mrm-quantity").addEventListener(
      "input",
      updateTotal
    );

    row.querySelector(".mrm-remove-item").addEventListener(
      "click",
      () => {
        row.remove();
        updateTotal();
      }
    );

    updateTotal();
  }

  /* 10. GAUGE OPTIONS */

  function updateGaugeOptions(row) {
    const productIndex = row.querySelector(".mrm-product").value;
    const gaugeSelect = row.querySelector(".mrm-gauge");

    gaugeSelect.innerHTML = "";

    if (productIndex === "") {
      gaugeSelect.innerHTML =
        '<option value="">Select product first</option>';
      updateTotal();
      return;
    }

    const product = catalogue[Number(productIndex)];
    const prices = product?.prices || {};
    const gauges = Object.keys(prices);

    if (!gauges.length) {
      gaugeSelect.innerHTML =
        '<option value="">Unavailable</option>';
      updateTotal();
      return;
    }

    gauges.forEach(gauge => {
      const option = document.createElement("option");
      option.value = gauge;
      option.textContent = gauge || "Not applicable";
      gaugeSelect.appendChild(option);
    });

    updateTotal();
  }

  /* 11. COLLECT PRODUCT INPUT */

  function getSelectedItems() {
    const rows = document.querySelectorAll(".mrm-invoice-item");

    return Array.from(rows).map(row => {
      const productIndex = row.querySelector(".mrm-product").value;
      const gauge = row.querySelector(".mrm-gauge").value;

      const quantity = Number(
        row.querySelector(".mrm-quantity").value
      );

      if (
        productIndex === "" ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return null;
      }

      const product = catalogue[Number(productIndex)];

      if (!product) return null;

      if (!Object.prototype.hasOwnProperty.call(product.prices, gauge)) {
        return null;
      }

      return {
        name: product.name,
        category: product.category,
        unit: product.unit,
        gauge,
        quantity
      };
    }).filter(Boolean);
  }

  /* 12. INDICATIVE TOTAL */

  function updateTotal() {
    const rows = document.querySelectorAll(".mrm-invoice-item");
    let total = 0;

    rows.forEach(row => {
      const productIndex = row.querySelector(".mrm-product").value;
      const gauge = row.querySelector(".mrm-gauge").value;

      const quantity = Number(
        row.querySelector(".mrm-quantity").value
      );

      if (
        productIndex === "" ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return;
      }

      const product = catalogue[Number(productIndex)];

      if (
        !product ||
        !Object.prototype.hasOwnProperty.call(product.prices, gauge)
      ) {
        return;
      }

      total += Number(product.prices[gauge]) * quantity;
    });

    const totalElement = document.getElementById("mrmInvoiceTotal");

    if (totalElement) {
      totalElement.textContent = money(total);
    }
  }

  /* 13. GENERATE PRO-FORMA QUOTATION PDF */

  function createInvoicePDF(invoice) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error(
        "The PDF library is missing. Check the jsPDF script in index.html."
      );
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;

    const invoiceNumber = invoice.invoiceNumber;
    const items = invoice.items || [];
    const total = Number(invoice.total || 0);
    const invoiceDate = new Date().toLocaleDateString("en-KE");

    let y = 48;

    /* COMPANY HEADER WITH OFFICIAL LOGO */

    if (companyLogo) {
      const maxLogoWidth = 30;
      const maxLogoHeight = 30;

      const ratio = Math.min(
        maxLogoWidth / companyLogo.width,
        maxLogoHeight / companyLogo.height
      );

      const logoWidth = companyLogo.width * ratio;
      const logoHeight = companyLogo.height * ratio;

      const logoX = margin;
      const logoY = 9 + (maxLogoHeight - logoHeight) / 2;

      pdf.addImage(
        companyLogo.data,
        "PNG",
        logoX,
        logoY,
        logoWidth,
        logoHeight
      );
    }

    const companyTextX = companyLogo ? 52 : margin;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(18, 54, 90);

    pdf.text(
      "MABATI ROLLING MILLS",
      companyTextX,
      20
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);

    pdf.text(
      "ROOFING PRODUCTS & SOLUTIONS",
      companyTextX,
      28
    );

    pdf.text(
      "Phone: 0733 608 974",
      pageWidth - margin,
      20,
      { align: "right" }
    );

    pdf.setDrawColor(18, 54, 90);
    pdf.setLineWidth(0.6);

    pdf.line(
      margin,
      43,
      pageWidth - margin,
      43
    );

    /* DOCUMENT TITLE */

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(18, 54, 90);
    pdf.text("PRO-FORMA INVOICE", margin, y);

    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    pdf.text(`Invoice Number: ${invoiceNumber}`, margin, y);

    pdf.text(
      `Date: ${invoiceDate}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );

    y += 12;

    /* CUSTOMER DETAILS */

    pdf.setFont("helvetica", "bold");
    pdf.text("BILL TO:", margin, y);

    y += 7;

    pdf.setFont("helvetica", "normal");

    pdf.text(
      `Customer: ${document.getElementById("mrmCustomerName").value.trim()}`,
      margin,
      y
    );

    y += 6;

    pdf.text(
      `Phone: ${document.getElementById("mrmCustomerPhone").value.trim()}`,
      margin,
      y
    );

    y += 6;

    pdf.text(
      `Location: ${document.getElementById("mrmCustomerLocation").value.trim()}`,
      margin,
      y
    );

    y += 12;

    /* PRODUCT TABLE */

    const tableRows = items.map((item, index) => [
      String(index + 1),
      `${item.name} (${item.gauge || "Standard"})`,
      `${item.quantity} ${item.unit}`,
      money(item.unitPrice),
      money(item.total)
    ]);

    if (typeof pdf.autoTable !== "function") {
      throw new Error(
        "PDF table library is missing. Check the AutoTable script in index.html."
      );
    }

    pdf.autoTable({
      startY: y,
      head: [[
        "No.",
        "Description",
        "Quantity",
        "Unit Price",
        "Amount"
      ]],
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [18, 54, 90]
      },
      margin: {
        left: margin,
        right: margin
      }
    });

    y = pdf.lastAutoTable.finalY + 12;

    /* TOTAL */

    if (y > 245) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(18, 54, 90);

    pdf.text(
      `TOTAL: ${money(total)}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );

    y += 12;

    /* PENDING STAMP */

    pdf.setDrawColor(190, 35, 35);
    pdf.setTextColor(190, 35, 35);
    pdf.setLineWidth(1.1);

    pdf.rect(pageWidth - 65, y, 48, 15);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);

    pdf.text(
      "PENDING",
      pageWidth - 41,
      y + 10,
      { align: "center" }
    );

    y += 23;

    /* TERMS AND CONDITIONS */

    if (y > 225) {
      pdf.addPage();
      y = 20;
    }

    pdf.setTextColor(18, 54, 90);
    pdf.setFontSize(11);
    pdf.text("TERMS & CONDITIONS", margin, y);

    y += 7;

    pdf.setTextColor(40, 40, 40);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    const terms = [
      "1. NO CASH PAYMENTS: All payments must be made through official authorised payment channels, including approved Paybill or bank transfer. No cash payments are accepted.",
      "2. ORDER CONFIRMATION: Confirm product descriptions, gauges, thickness, lengths, colours, quantities and delivery details before payment and processing.",
      "3. PRODUCT QUALITY: Materials supplied shall correspond to the agreed product descriptions and specifications, subject to manufacturer standards and availability.",
      "4. DELIVERY ARRANGEMENTS: Delivery timelines and charges shall be agreed before fulfilment. The customer must provide accurate delivery and offloading details.",
      "5. QUANTITIES AND MEASUREMENTS: The customer is responsible for confirming measurements and quantities. Additional materials may attract extra charges.",
      "6. CHANGES AND CANCELLATIONS: Changes to confirmed orders may affect pricing, availability and delivery arrangements.",
      "7. BALANCE PAYMENT: Any outstanding balance must be settled as agreed before delivery completion or release of goods.",
      "8. PRODUCT INSPECTION: Inspect materials upon delivery and report shortages or discrepancies promptly."
    ];

    terms.forEach(term => {
      const lines = pdf.splitTextToSize(
        term,
        pageWidth - margin * 2
      );

      if (y + lines.length * 4 > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(lines, margin, y);
      y += lines.length * 4 + 2;
    });

    y += 5;

    if (y > 285) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);

    pdf.text(
      "Thank you for choosing Mabati Rolling Mills.",
      margin,
      y
    );

    return pdf;
  }

  /* 14. PDF TO BASE64 */

  function pdfToBase64(pdf) {
    const dataUri = pdf.output("datauristring");
    return dataUri.split(",")[1];
  }

  /* 15. SUBMIT AND FINALISE QUOTATION */

  async function submitInvoice(event) {
    event.preventDefault();

    const form = document.getElementById("mrmInvoiceForm");

    if (!form.reportValidity()) return;

    const items = getSelectedItems();

    if (!items.length) {
      showMessage(
        "Please select at least one valid roofing product and specification.",
        "error"
      );
      return;
    }

    const customerName = document
      .getElementById("mrmCustomerName")
      .value.trim();

    const customerPhone = document
      .getElementById("mrmCustomerPhone")
      .value.trim();

    const customerLocation = document
      .getElementById("mrmCustomerLocation")
      .value.trim();

    if (
      !customerName ||
      customerName.length > 120 ||
      !customerPhone ||
      customerPhone.length > 30 ||
      !customerLocation ||
      customerLocation.length > 200
    ) {
      showMessage(
        "Please check all customer details and try again.",
        "error"
      );
      return;
    }

    setLoading(true);

    const results = document.getElementById("mrmInvoiceResults");

    results.style.display = "none";
    results.innerHTML = "";

    try {
      /* LOAD LOGO BEFORE GENERATING PDF */

      showMessage(
        "Loading MRM company logo...",
        "info"
      );

      await loadCompanyLogo();

      /* FIRST STAGE: SERVER VALIDATION */

      showMessage(
        "Step 1 of 3: Verifying customer details and product prices...",
        "info"
      );

      const prepared = await apiRequest(
        "/api/invoices/prepare",
        {
          method: "POST",
          body: JSON.stringify({
            customerName,
            customerPhone,
            customerLocation,
            items
          })
        }
      );

      const invoiceNumber = prepared.invoiceNumber;
      const publicToken = prepared.token;

      if (!invoiceNumber || !publicToken) {
        throw new Error(
          "The server did not return a valid quotation reference."
        );
      }

      if (!Array.isArray(prepared.items) || !prepared.items.length) {
        throw new Error(
          "The server did not return the verified quotation items."
        );
      }

      /* SECOND STAGE: PDF GENERATION */

      showMessage(
        "Step 2 of 3: Generating your roofing quotation PDF...",
        "info"
      );

      const pdf = createInvoicePDF(prepared);
      const base64PDF = pdfToBase64(pdf);

      /* THIRD STAGE: SAVE PDF TO CLOUDFLARE */

      showMessage(
        "Step 3 of 3: Saving your quotation securely...",
        "info"
      );

      const finalized = await apiRequest(
        "/api/invoices/finalize",
        {
          method: "POST",
          body: JSON.stringify({
            token: publicToken,
            pdfBase64: base64PDF
          })
        }
      );

      const publicUrl = finalized.invoiceUrl;

      if (!publicUrl) {
        throw new Error(
          "The server saved the quotation but did not return its public link."
        );
      }

      /* CREATE LOCAL PDF DOWNLOAD */

      const pdfBlob = pdf.output("blob");
      const downloadUrl = URL.createObjectURL(pdfBlob);

      /* WHATSAPP MESSAGE
         NO CUSTOMER PERSONAL DETAILS ARE INCLUDED */

      const whatsappMessage =
        `Hello MRM Team,\n\n` +
        `I have successfully generated a roofing quotation.\n\n` +
        `Please find my quotation using the link below:\n\n` +
        `${publicUrl}\n\n` +
        `Kindly assist me with the next steps.\n\n` +
        `Thank you.`;

      /* DISPLAY SUCCESS AND QUOTATION LINKS */

      results.innerHTML = `
        <h3>ROOFING QUOTATION GENERATED SUCCESSFULLY</h3>

        <p>
          <strong>Quotation Number:</strong>
          ${escapeHTML(invoiceNumber)}
        </p>

        <p>
          <strong>Customer:</strong>
          ${escapeHTML(customerName)}
        </p>

        <p>
          <strong>Total:</strong>
          ${money(prepared.total)}
        </p>

        <p>
          <strong>Status:</strong>
          PENDING
        </p>

        <p>
          Your roofing quotation has been generated and saved securely.
          You can download the PDF, view it online or share its link
          with the MRM team through WhatsApp.
        </p>

        <a
          id="mrmDownloadInvoiceLink"
          href="${downloadUrl}"
          download="${escapeHTML(invoiceNumber)}.pdf">
          DOWNLOAD QUOTATION
        </a>

        <a
          href="${escapeHTML(publicUrl)}"
          target="_blank"
          rel="noopener">
          VIEW QUOTATION ONLINE
        </a>

        <a
          class="mrm-whatsapp"
          href="${createWhatsAppLink(whatsappMessage)}"
          target="_blank"
          rel="noopener">
          SHARE QUOTATION VIA WHATSAPP
        </a>
      `;

      results.style.display = "block";

      /* AUTOMATIC BROWSER DOWNLOAD */

      const downloadLink = document.getElementById(
        "mrmDownloadInvoiceLink"
      );

      if (downloadLink) {
        downloadLink.click();
      }

      showMessage(
        "Your roofing quotation has been generated. Your PDF download is starting.",
        "success"
      );

      results.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error("MRM quotation error:", error);

      showMessage(
        error.message ||
        "Quotation generation failed. Please try again.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  }

  /* 16. INITIALISE QUOTATION SYSTEM */

  async function initialiseInvoiceSystem() {
    addStyles();

    /* REPLACE OLD QUOTATION FORM */

    createInvoiceSection();

    addNavigationLink();

    const addButton = document.getElementById(
      "mrmAddInvoiceItem"
    );

    const form = document.getElementById(
      "mrmInvoiceForm"
    );

    if (!addButton || !form) {
      console.error("MRM quotation form could not be initialised.");
      return;
    }

    addButton.addEventListener("click", addInvoiceItem);
    form.addEventListener("submit", submitInvoice);

    try {
      showMessage(
        "Loading roofing product catalogue...",
        "info"
      );

      await loadCatalogue();

      showMessage(
        "Product catalogue loaded. You can now get your roofing quotation.",
        "success"
      );

    } catch (error) {
      console.error("MRM catalogue error:", error);

      showMessage(
        `Could not load the product catalogue: ${error.message}`,
        "error"
      );
    }
  }

  /* 17. START SYSTEM */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialiseInvoiceSystem
    );
  } else {
    initialiseInvoiceSystem();
  }

})();
