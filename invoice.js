
/* =========================================================
   MABATI ROLLING MILLS
   PROFESSIONAL PROFORMA INVOICE SYSTEM
   API: CLOUDFLARE WORKER
   TURNSTILE: REMOVED
   ========================================================= */

(() => {
  "use strict";

  const API_BASE = "https://mrm-invoice-api.onlymoh26.workers.dev";
  const COMPANY_NAME = "MABATI ROLLING MILLS";
  const COMPANY_PHONE = "0750 055 550";
  const WHATSAPP_NUMBER = "254750055550";
  const LOGO_PATH = "images/mrm-logo.png";
  const CURRENCY = "KES";

  let catalogue = [];
  let isSubmitting = false;

  const $ = (id) => document.getElementById(id);

  const elements = {
    section: $("mrmInvoiceSection"),
    form: $("mrmInvoiceForm"),
    customerName: $("mrmCustomerName"),
    customerPhone: $("mrmCustomerPhone"),
    customerLocation: $("mrmCustomerLocation"),
    items: $("mrmInvoiceItems"),
    addItem: $("mrmAddInvoiceItem"),
    total: $("mrmInvoiceTotal"),
    message: $("mrmInvoiceMessage"),
    createButton: $("mrmCreateInvoiceBtn"),
    results: $("mrmInvoiceResults")
  };

  function money(value) {
    return `${CURRENCY} ${Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function displayDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function showMessage(message, type = "info") {
    if (!elements.message) return;

    const colours = {
      info: "#164e78",
      success: "#176b45",
      error: "#b42318"
    };

    elements.message.textContent = message;
    elements.message.style.color = colours[type] || colours.info;
    elements.message.style.display = "block";
  }

  function clearMessage() {
    if (elements.message) {
      elements.message.textContent = "";
      elements.message.style.display = "none";
    }
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
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
      throw new Error("The invoice server returned an invalid response.");
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "The invoice request could not be completed.");
    }

    return data;
  }

  async function loadCatalogue() {
    const data = await apiRequest("/api/catalogue");

    if (!Array.isArray(data.products) || !data.products.length) {
      throw new Error("The product catalogue is currently unavailable.");
    }

    catalogue = data.products;
    return catalogue;
  }

  function productByName(name) {
    return catalogue.find((product) => product.name === name);
  }

  function createInvoiceRow() {
    const row = document.createElement("div");
    row.className = "mrm-invoice-item";

    row.style.cssText = [
      "display:grid",
      "grid-template-columns:2fr 1fr 1fr 1fr auto",
      "gap:10px",
      "align-items:end",
      "padding:14px",
      "margin-bottom:12px",
      "border:1px solid #dce3e9",
      "border-radius:10px",
      "background:#fff"
    ].join(";");

    row.innerHTML = `
      <div>
        <label style="display:block;font-weight:600;margin-bottom:6px">
          Product
        </label>
        <select class="mrm-product" required
          style="width:100%;padding:11px;border:1px solid #ccd5dd;border-radius:7px">
          <option value="">Select product</option>
          ${catalogue.map((product) => `
            <option value="${escapeHtml(product.name)}">
              ${escapeHtml(product.name)}
            </option>
          `).join("")}
        </select>
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:6px">
          Gauge
        </label>
        <select class="mrm-gauge"
          style="width:100%;padding:11px;border:1px solid #ccd5dd;border-radius:7px">
          <option value="">Select gauge</option>
        </select>
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:6px">
          Quantity
        </label>
        <input class="mrm-quantity" type="number" min="0.01"
          max="100000" step="0.01" value="1" required
          style="width:100%;padding:11px;border:1px solid #ccd5dd;border-radius:7px">
      </div>

      <div>
        <label style="display:block;font-weight:600;margin-bottom:6px">
          Unit price
        </label>
        <div class="mrm-unit-price"
          style="padding:11px 4px;font-weight:600">KES 0.00</div>
        <div class="mrm-line-total"
          style="font-size:12px;color:#657585">Total: KES 0.00</div>
      </div>

      <div>
        <button type="button" class="mrm-remove-item"
          aria-label="Remove product"
          style="padding:10px 13px;border:0;border-radius:7px;background:#fce8e6;color:#b42318;cursor:pointer">
          Remove
        </button>
      </div>
    `;

    const productSelect = row.querySelector(".mrm-product");
    const gaugeSelect = row.querySelector(".mrm-gauge");
    const quantityInput = row.querySelector(".mrm-quantity");

    productSelect.addEventListener("change", () => {
      updateGaugeOptions(row);
      updateRowPrice(row);
      updateInvoiceTotal();
    });

    gaugeSelect.addEventListener("change", () => {
      updateRowPrice(row);
      updateInvoiceTotal();
    });

    quantityInput.addEventListener("input", () => {
      updateRowPrice(row);
      updateInvoiceTotal();
    });

    row.querySelector(".mrm-remove-item").addEventListener("click", () => {
      row.remove();

      if (!elements.items.querySelector(".mrm-invoice-item")) {
        addInvoiceRow();
      }

      updateInvoiceTotal();
    });

    return row;
  }

  function updateGaugeOptions(row) {
    const name = row.querySelector(".mrm-product").value;
    const product = productByName(name);
    const gaugeSelect = row.querySelector(".mrm-gauge");

    gaugeSelect.innerHTML = "";

    if (!product) {
      gaugeSelect.innerHTML = '<option value="">Select gauge</option>';
      return;
    }

    const gauges = Object.keys(product.prices || {});

    if (product.unit === "piece") {
      gaugeSelect.innerHTML = '<option value="">Not applicable</option>';
      gaugeSelect.disabled = true;
      return;
    }

    gaugeSelect.disabled = false;
    gaugeSelect.innerHTML =
      '<option value="">Select gauge</option>' +
      gauges.map((gauge) =>
        `<option value="${escapeHtml(gauge)}">${escapeHtml(gauge)}</option>`
      ).join("");
  }

  function getSelectedPrice(row) {
    const name = row.querySelector(".mrm-product").value;
    const gauge = row.querySelector(".mrm-gauge").value;
    const product = productByName(name);

    if (!product) return 0;

    const priceKey = product.unit === "piece" ? "" : gauge;
    return Number(product.prices[priceKey] || 0);
  }

  function updateRowPrice(row) {
    const price = getSelectedPrice(row);
    const quantity = Number(row.querySelector(".mrm-quantity").value || 0);
    const total = price * quantity;

    row.querySelector(".mrm-unit-price").textContent = money(price);
    row.querySelector(".mrm-line-total").textContent = `Total: ${money(total)}`;
  }

  function updateInvoiceTotal() {
    if (!elements.items) return;

    let total = 0;

    elements.items.querySelectorAll(".mrm-invoice-item").forEach((row) => {
      const price = getSelectedPrice(row);
      const quantity = Number(row.querySelector(".mrm-quantity").value || 0);
      total += price * quantity;
    });

    if (elements.total) {
      elements.total.textContent = money(total);
    }
  }

  function addInvoiceRow() {
    if (!elements.items) return;

    const row = createInvoiceRow();
    elements.items.appendChild(row);
    updateInvoiceTotal();
  }

  function collectInvoiceItems() {
    const rows = [...elements.items.querySelectorAll(".mrm-invoice-item")];

    if (!rows.length) {
      throw new Error("Add at least one product to the invoice.");
    }

    return rows.map((row) => {
      const name = row.querySelector(".mrm-product").value;
      const product = productByName(name);
      const quantityValue = row.querySelector(".mrm-quantity").value;
      const quantity = Number(quantityValue);

      if (!product) {
        throw new Error("Please select a valid product on every row.");
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Enter a valid quantity for ${name}.`);
      }

      const gauge = product.unit === "piece"
        ? ""
        : row.querySelector(".mrm-gauge").value;

      if (product.unit !== "piece" && !gauge) {
        throw new Error(`Select a gauge for ${name}.`);
      }

      return {
        name,
        category: product.category,
        unit: product.unit,
        gauge,
        quantity
      };
    });
  }

  function loadImage(url) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  function addPdfText(pdf, text, x, y, options = {}) {
    pdf.setFont(options.font || "helvetica", options.style || "normal");
    pdf.setFontSize(options.size || 10);
    pdf.setTextColor(...(options.color || [45, 57, 69]));
    pdf.text(String(text ?? ""), x, y, options.extra || {});
  }

  async function createInvoicePdf(prepared, customer, invoiceDate) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF library is missing. Please reload the page.");
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const navy = [9, 43, 73];
    const blue = [8, 120, 189];
    const grey = [102, 117, 132];
    const pale = [242, 246, 249];

    pdf.setFillColor(...navy);
    pdf.rect(0, 0, pageWidth, 4, "F");

    const logo = await loadImage(LOGO_PATH);

    if (logo) {
      try {
        pdf.addImage(logo, "PNG", margin, 11, 30, 24, undefined, "FAST");
      } catch {
        // Continue with the text header if the logo format is unsupported.
      }
    }

    addPdfText(pdf, COMPANY_NAME, 50, 17, {
      size: 14,
      style: "bold",
      color: navy
    });

    addPdfText(pdf, "ROOFING PRODUCTS & SOLUTIONS", 50, 23, {
      size: 8,
      style: "bold",
      color: grey
    });

    addPdfText(pdf, `Call: ${COMPANY_PHONE}`, 50, 30, {
      size: 9,
      color: grey
    });

    pdf.setDrawColor(220, 227, 233);
    pdf.line(margin, 41, pageWidth - margin, 41);

    addPdfText(pdf, "PROFORMA INVOICE", margin, 54, {
      size: 20,
      style: "bold",
      color: navy
    });

    addPdfText(pdf, "CUSTOMER QUOTATION", margin, 60, {
      size: 8,
      style: "bold",
      color: grey
    });

    const cardX = pageWidth - 75;
    pdf.setFillColor(...pale);
    pdf.roundedRect(cardX, 46, 60, 25, 3, 3, "F");

    addPdfText(pdf, "INVOICE NUMBER", cardX + 5, 53, {
      size: 7,
      style: "bold",
      color: grey
    });

    addPdfText(pdf, prepared.invoiceNumber, cardX + 5, 59, {
      size: 9,
      style: "bold",
      color: navy
    });

    addPdfText(pdf, "DATE", cardX + 5, 66, {
      size: 7,
      style: "bold",
      color: grey
    });

    addPdfText(pdf, displayDate(invoiceDate), cardX + 25, 66, {
      size: 8,
      color: navy
    });

    // Customer details panel
    pdf.setFillColor(...pale);
    pdf.roundedRect(margin, 79, pageWidth - margin * 2, 31, 3, 3, "F");

    addPdfText(pdf, "BILL TO", margin + 6, 87, {
      size: 8,
      style: "bold",
      color: blue
    });

    addPdfText(pdf, customer.name, margin + 6, 95, {
      size: 11,
      style: "bold",
      color: navy
    });

    addPdfText(pdf, `Phone: ${customer.phone}`, margin + 6, 102, {
      size: 8,
      color: grey
    });

    addPdfText(pdf, `Location: ${customer.location}`, pageWidth / 2, 95, {
      size: 9,
      color: navy
    });

    addPdfText(pdf, "PAYMENT STATUS", pageWidth - 55, 87, {
      size: 7,
      style: "bold",
      color: grey
    });

    pdf.setFillColor(255, 244, 219);
    pdf.roundedRect(pageWidth - 55, 91, 39, 10, 2, 2, "F");

    addPdfText(pdf, "PENDING", pageWidth - 35.5, 97.5, {
      size: 8,
      style: "bold",
      color: [151, 93, 0],
      extra: { align: "center" }
    });

    const tableRows = prepared.items.map((item, index) => [
      String(index + 1),
      item.name,
      item.gauge || "—",
      `${Number(item.quantity).toLocaleString("en-KE")} ${item.unit}`,
      money(item.unitPrice),
      money(item.total)
    ]);

    if (typeof pdf.autoTable !== "function") {
      throw new Error("PDF table library is missing. Please reload the page.");
    }

    pdf.autoTable({
      startY: 119,
      head: [[
        "#",
        "PRODUCT DESCRIPTION",
        "GAUGE",
        "QUANTITY",
        "UNIT PRICE",
        "AMOUNT"
      ]],
      body: tableRows,
      theme: "grid",
      margin: { left: margin, right: margin, bottom: 25 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3.5,
        textColor: [45, 57, 69],
        lineColor: [222, 228, 234],
        lineWidth: 0.15,
        valign: "middle"
      },
      headStyles: {
        fillColor: navy,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 55 },
        2: { cellWidth: 17, halign: "center" },
        3: { cellWidth: 27, halign: "center" },
        4: { cellWidth: 30, halign: "right" },
        5: { cellWidth: 32, halign: "right" }
      }
    });

    let finalY = pdf.lastAutoTable.finalY + 10;

    if (finalY > pageHeight - 65) {
      pdf.addPage();
      finalY = 25;
    }

    const totalBoxWidth = 75;
    const totalBoxX = pageWidth - margin - totalBoxWidth;

    pdf.setFillColor(...navy);
    pdf.roundedRect(totalBoxX, finalY, totalBoxWidth, 20, 2, 2, "F");

    addPdfText(pdf, "TOTAL AMOUNT", totalBoxX + 5, finalY + 7, {
      size: 7,
      style: "bold",
      color: [220, 230, 239]
    });

    addPdfText(pdf, money(prepared.total), totalBoxX + 5, finalY + 15, {
      size: 11,
      style: "bold",
      color: [255, 255, 255]
    });

    const termsY = finalY + 32;

    addPdfText(pdf, "TERMS & CONDITIONS", margin, termsY, {
      size: 9,
      style: "bold",
      color: navy
    });

    const terms = [
      "1. This is a proforma invoice and not a payment receipt.",
      "2. Product availability and final delivery arrangements are subject to confirmation.",
      "3. Kindly confirm the invoice details before making payment.",
      "4. Use official MRM payment instructions only."
    ];

    let termY = termsY + 7;

    terms.forEach((term) => {
      if (termY > pageHeight - 27) {
        pdf.addPage();
        termY = 25;
      }

      addPdfText(pdf, term, margin, termY, {
        size: 7.5,
        color: grey
      });

      termY += 5;
    });

    // Footer on every page
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);

      pdf.setDrawColor(220, 227, 233);
      pdf.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17);

      addPdfText(pdf, COMPANY_NAME, margin, pageHeight - 11, {
        size: 7,
        style: "bold",
        color: navy
      });

      addPdfText(pdf, `Call ${COMPANY_PHONE}`, pageWidth / 2, pageHeight - 11, {
        size: 7,
        color: grey,
        extra: { align: "center" }
      });

      addPdfText(pdf, `Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 11, {
        size: 7,
        color: grey,
        extra: { align: "right" }
      });
    }

    return pdf;
  }

  function pdfToBase64(pdf) {
    const dataUri = pdf.output("datauristring");
    return dataUri.substring(dataUri.indexOf(",") + 1);
  }

  function downloadPdf(pdf, customerName) {
    const safeName = String(customerName || "Customer")
      .replace(/[^\p{L}\p{N} ._-]+/gu, "")
      .replace(/\s+/g, " ")
      .trim() || "Customer";

    pdf.save(`${safeName} - MRM Proforma Invoice.pdf`);
  }

  function showInvoiceResults(data, customer) {
    if (!elements.results) return;

    const invoiceUrl = data.invoiceUrl;
    const message = [
      "Hello MRM Team,",
      "",
      `Please find my proforma invoice ${data.invoiceNumber}.`,
      `Customer: ${customer.name}`,
      `Amount: ${money(data.total)}`,
      "",
      invoiceUrl
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    elements.results.innerHTML = `
      <div style="padding:20px;border:1px solid #d7e5dc;border-radius:12px;background:#f5fbf7">
        <h3 style="margin:0 0 10px;color:#176b45">Invoice created successfully</h3>
        <p><strong>Invoice number:</strong> ${escapeHtml(data.invoiceNumber)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(customer.name)}</p>
        <p><strong>Total:</strong> ${money(data.total)}</p>
        <p><strong>Status:</strong> PENDING</p>
        <p style="margin-top:14px">
          <a href="${escapeHtml(invoiceUrl)}" target="_blank" rel="noopener"
             style="display:inline-block;padding:11px 16px;background:#092b49;color:#fff;text-decoration:none;border-radius:7px;margin:4px">
            Open Invoice
          </a>
          <a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener"
             style="display:inline-block;padding:11px 16px;background:#16834a;color:#fff;text-decoration:none;border-radius:7px;margin:4px">
            Share on WhatsApp
          </a>
        </p>
        <p style="font-size:12px;color:#657585;word-break:break-all">
          Public invoice link: ${escapeHtml(invoiceUrl)}
        </p>
      </div>
    `;

    elements.results.style.display = "block";
    elements.results.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleInvoiceSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    clearMessage();

    if (!elements.customerName.value.trim()) {
      showMessage("Enter the customer's name.", "error");
      elements.customerName.focus();
      return;
    }

    if (!elements.customerPhone.value.trim()) {
      showMessage("Enter the customer's phone number.", "error");
      elements.customerPhone.focus();
      return;
    }

    if (!elements.customerLocation.value.trim()) {
      showMessage("Enter the customer's location.", "error");
      elements.customerLocation.focus();
      return;
    }

    let items;

    try {
      items = collectInvoiceItems();
    } catch (error) {
      showMessage(error.message, "error");
      return;
    }

    const customer = {
      name: elements.customerName.value.trim(),
      phone: elements.customerPhone.value.trim(),
      location: elements.customerLocation.value.trim()
    };

    const invoiceDate = localDate();

    isSubmitting = true;

    if (elements.createButton) {
      elements.createButton.disabled = true;
      elements.createButton.textContent = "Preparing invoice...";
    }

    try {
      showMessage("Verifying customer details and product prices...");

      const prepared = await apiRequest("/api/invoices/prepare", {
        method: "POST",
        body: JSON.stringify({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerLocation: customer.location,
          invoiceDate,
          items
        })
      });

      if (!prepared.token || !prepared.invoiceNumber || !Array.isArray(prepared.items)) {
        throw new Error("The server returned incomplete invoice details.");
      }

      showMessage("Generating the professional PDF invoice...");

      const pdf = await createInvoicePdf(prepared, customer, invoiceDate);
      const pdfBase64 = pdfToBase64(pdf);

      showMessage("Saving the PDF securely...");

      const finalised = await apiRequest("/api/invoices/finalize", {
        method: "POST",
        body: JSON.stringify({
          token: prepared.token,
          pdfBase64
        })
      });

      if (!finalised.invoiceUrl) {
        throw new Error("The invoice was saved but no public link was returned.");
      }

      downloadPdf(pdf, customer.name);

      showInvoiceResults({
        ...prepared,
        ...finalised,
        total: prepared.total
      }, customer);

      showMessage("Invoice created, saved and downloaded successfully.", "success");

    } catch (error) {
      console.error("MRM invoice error:", error);
      showMessage(error.message || "Unable to create the invoice. Please try again.", "error");
    } finally {
      isSubmitting = false;

      if (elements.createButton) {
        elements.createButton.disabled = false;
        elements.createButton.textContent = "Create Proforma Invoice";
      }
    }
  }

  function initialiseInvoiceSystem() {
    const required = [
      elements.form,
      elements.customerName,
      elements.customerPhone,
      elements.customerLocation,
      elements.items,
      elements.createButton
    ];

    if (required.some((element) => !element)) {
      console.error("MRM invoice system: one or more required HTML elements are missing.");
      return;
    }

    if (elements.results) {
      elements.results.style.display = "none";
    }

    if (elements.addItem) {
      elements.addItem.addEventListener("click", addInvoiceRow);
    }

    elements.form.addEventListener("submit", handleInvoiceSubmit);

    loadCatalogue()
      .then(() => {
        elements.items.innerHTML = "";
        addInvoiceRow();
        showMessage("Invoice system is ready.", "success");
      })
      .catch((error) => {
        console.error("MRM catalogue error:", error);
        showMessage(error.message || "Could not load the product catalogue.", "error");

        if (elements.createButton) {
          elements.createButton.disabled = true;
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseInvoiceSystem);
  } else {
    initialiseInvoiceSystem();
  }
})();
