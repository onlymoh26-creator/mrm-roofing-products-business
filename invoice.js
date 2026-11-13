
/* =========================================================
   MABATI ROLLING MILLS
   PRO-FORMA INVOICE SYSTEM
   File: invoice.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     1. CONFIGURATION
     ======================================================= */

  const API_BASE = "https://mrm-invoice-api.onlymoh26.workers.dev";

  const TURNSTILE_SITE_KEY = "0x4AAAAAAF_kiy_v__Tp3ulP";

  const WHATSAPP_NUMBER = "254733608974";

  const CURRENCY = "KES";

  let catalogue = [];
  let turnstileWidgetId = null;
  let turnstileReady = false;
  let invoiceItems = [];

  /* =======================================================
     2. HELPER FUNCTIONS
     ======================================================= */

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
      throw new Error(data.message || data.error || "The server could not complete your request.");
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
      ? "PROCESSING INVOICE..."
      : "CREATE PRO-FORMA INVOICE";
  }

  /* =======================================================
     3. INVOICE SECTION STYLES
     ======================================================= */

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
        background: #fff;
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
      }

      #mrmInvoiceSection .mrm-invoice-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
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
        background: #fff;
        font: inherit;
      }

      #mrmInvoiceSection .mrm-invoice-field {
        margin-bottom: 18px;
        min-width: 0;
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
        color: #fff;
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
        color: white;
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

  /* =======================================================
     4. CREATE THE INVOICE SECTION
     ======================================================= */

  function createInvoiceSection() {
    if (document.getElementById("mrmInvoiceSection")) return;

    const section = document.createElement("section");
    section.id = "mrmInvoiceSection";

    section.innerHTML = `
      <div class="mrm-invoice-container">

        <h2>CREATE A PRO-FORMA INVOICE</h2>

        <p class="mrm-invoice-intro">
          Generate an official MRM roofing materials pro-forma invoice.
          Select your products, enter your details and submit for verification.
        </p>

        <form id="mrmInvoiceForm">

          <div class="mrm-invoice-grid">

            <div class="mrm-invoice-field">
              <label for="mrmCustomerName">Customer / Company Name *</label>
              <input id="mrmCustomerName" name="customerName"
                type="text" required maxlength="120"
                placeholder="Enter customer or company name">
            </div>

            <div class="mrm-invoice-field">
              <label for="mrmCustomerPhone">Phone Number *</label>
              <input id="mrmCustomerPhone" name="customerPhone"
                type="tel" required maxlength="20"
                placeholder="Enter phone number">
            </div>

            <div class="mrm-invoice-field">
              <label for="mrmCustomerLocation">Delivery Location *</label>
              <input id="mrmCustomerLocation" name="customerLocation"
                type="text" required maxlength="180"
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
            are verified by the MRM invoice server before the invoice is issued.
          </p>

          <div class="mrm-invoice-field" style="margin-top:25px">
            <label>Security Verification *</label>
            <div id="mrmTurnstileContainer"></div>
          </div>

          <div id="mrmInvoiceMessage" class="mrm-invoice-message"></div>

          <button type="submit" id="mrmCreateInvoiceBtn">
            CREATE PRO-FORMA INVOICE
          </button>

        </form>

        <div id="mrmInvoiceResults" class="mrm-invoice-results"></div>

        <p class="mrm-small-note">
          A pro-forma invoice is not proof of payment.
          Payments must be made through authorised official payment channels.
          No cash payments are accepted.
        </p>

      </div>
    `;

    const quoteForm = document.getElementById("quotationForm");

    if (quoteForm) {
      const quoteSection = quoteForm.closest("section");

      if (quoteSection && quoteSection.parentNode) {
        quoteSection.parentNode.insertBefore(section, quoteSection.nextSibling);
        return;
      }
    }

    const footer = document.querySelector("footer");

    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }
  }

  /* =======================================================
     5. ADD NAVIGATION LINK
     ======================================================= */

  function addNavigationLink() {
    const navLists = document.querySelectorAll("header nav ul, nav ul");

    navLists.forEach(list => {
      if (list.querySelector('[href="#mrmInvoiceSection"]')) return;

      const item = document.createElement("li");
      const link = document.createElement("a");

      link.href = "#mrmInvoiceSection";
      link.textContent = "Create an Invoice";

      item.appendChild(link);
      list.appendChild(item);
    });
  }

  /* =======================================================
     6. LOAD SERVER CATALOGUE
     ======================================================= */

  async function loadCatalogue() {
    const response = await apiRequest("/api/catalogue");

    catalogue = Array.isArray(response.products)
      ? response.products
      : Array.isArray(response.catalogue)
        ? response.catalogue
        : [];

    if (!catalogue.length) {
      throw new Error("The server catalogue is empty or unavailable.");
    }

    addInvoiceItem();
  }

  /* =======================================================
     7. PRODUCT SELECT OPTIONS
     ======================================================= */

  function productOptions() {
    return `
      <option value="">Select roofing product</option>
      ${catalogue.map((product, index) => `
        <option value="${index}">
          ${escapeHTML(product.name || product.product || product.title || `Product ${index + 1}`)}
        </option>
      `).join("")}
    `;
  }

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
        <select class="mrm-gauge">
          <option value="">Select gauge</option>
        </select>
      </div>

      <div class="mrm-invoice-field">
        <label>Quantity / Metres *</label>
        <input class="mrm-quantity" type="number"
          min="0.1" step="0.1" value="2" required>
      </div>

      <button type="button" class="mrm-remove-item">
        REMOVE
      </button>
    `;

    container.appendChild(row);

    row.querySelector(".mrm-product").addEventListener("change", () => {
      updateGaugeOptions(row);
      updateTotal();
    });

    row.querySelector(".mrm-gauge").addEventListener("change", updateTotal);

    row.querySelector(".mrm-quantity").addEventListener("input", updateTotal);

    row.querySelector(".mrm-remove-item").addEventListener("click", () => {
      row.remove();
      updateTotal();
    });

    invoiceItems.push(row);

    updateTotal();
  }

  /* =======================================================
     8. GAUGE OPTIONS
     ======================================================= */

  function updateGaugeOptions(row) {
    const productIndex = row.querySelector(".mrm-product").value;
    const gaugeSelect = row.querySelector(".mrm-gauge");

    gaugeSelect.innerHTML = '<option value="">Select gauge</option>';

    if (productIndex === "") return;

    const product = catalogue[Number(productIndex)];

    const gauges = product.gauges || product.specifications || [];

    gauges.forEach(gauge => {
      const value = typeof gauge === "object"
        ? gauge.gauge || gauge.name || gauge.value
        : gauge;

      if (value === undefined || value === null) return;

      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);

      gaugeSelect.appendChild(option);
    });

    if (!gauges.length) {
      gaugeSelect.innerHTML = '<option value="Standard">Standard</option>';
    }
  }

  /* =======================================================
     9. INDICATIVE TOTAL
     ======================================================= */

  function getSelectedItems() {
    const rows = document.querySelectorAll(".mrm-invoice-item");

    return Array.from(rows).map(row => {
      const productIndex = row.querySelector(".mrm-product").value;
      const gauge = row.querySelector(".mrm-gauge").value;
      const quantity = Number(row.querySelector(".mrm-quantity").value);

      if (productIndex === "" || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      const product = catalogue[Number(productIndex)];

      if (!product) return null;

      return {
        product: product.name || product.product || product.title,
        productId: product.id || product.productId || null,
        gauge,
        quantity,
        unit: product.unit || "metres"
      };
    }).filter(Boolean);
  }

  function updateTotal() {
    const rows = document.querySelectorAll(".mrm-invoice-item");
    let total = 0;

    rows.forEach(row => {
      const productIndex = row.querySelector(".mrm-product").value;
      const quantity = Number(row.querySelector(".mrm-quantity").value);

      if (productIndex === "" || !Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const product = catalogue[Number(productIndex)];

      if (!product) return;

      const price = Number(
        product.price ??
        product.unitPrice ??
        product.rate ??
        0
      );

      total += price * quantity;
    });

    const totalElement = document.getElementById("mrmInvoiceTotal");

    if (totalElement) {
      totalElement.textContent = money(total);
    }
  }

  /* =======================================================
     10. TURNSTILE
     ======================================================= */

  function renderTurnstile() {
    const container = document.getElementById("mrmTurnstileContainer");

    if (!container || !turnstileReady || !window.turnstile) return;

    if (turnstileWidgetId !== null) return;

    try {
      turnstileWidgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        callback: function(token) {
          container.dataset.token = token;
        },
        "expired-callback": function() {
          container.dataset.token = "";
        },
        "error-callback": function() {
          container.dataset.token = "";
          showMessage("Security verification failed. Please try again.", "error");
        }
      });
    } catch (error) {
      console.error("Turnstile error:", error);
    }
  }

  window.onMrmTurnstileLoaded = function() {
    turnstileReady = true;
    renderTurnstile();
  };

  function resetTurnstile() {
    const container = document.getElementById("mrmTurnstileContainer");

    if (container) {
      container.dataset.token = "";
    }

    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  /* =======================================================
     11. CREATE PDF
     ======================================================= */

  function createInvoicePDF(invoice) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF library is missing. Check the jsPDF script in index.html.");
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;

    const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number;
    const items = invoice.items || invoice.verifiedItems || [];
    const subtotal = Number(invoice.subtotal || invoice.total || 0);
    const total = Number(invoice.total || subtotal);
    const invoiceDate = invoice.date || invoice.invoiceDate || new Date().toLocaleDateString("en-KE");

    let y = 20;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.setTextColor(18, 54, 90);
    pdf.text("MABATI ROLLING MILLS", margin, y);

    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text("ROOFING PRODUCTS & SOLUTIONS", margin, y);

    pdf.text("Phone: 0733 608 974", pageWidth - margin, 20, {
      align: "right"
    });

    y += 13;

    pdf.setDrawColor(18, 54, 90);
    pdf.line(margin, y, pageWidth - margin, y);

    y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(18, 54, 90);
    pdf.text("PRO-FORMA INVOICE", margin, y);

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    y += 10;

    pdf.setFont("helvetica", "normal");
    pdf.text(`Invoice Number: ${invoiceNumber || "Pending"}`, margin, y);
    pdf.text(`Date: ${invoiceDate}`, pageWidth - margin, y, { align: "right" });

    y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.text("BILL TO:", margin, y);

    y += 7;

    pdf.setFont("helvetica", "normal");
    pdf.text(`Customer: ${document.getElementById("mrmCustomerName").value}`, margin, y);

    y += 6;

    pdf.text(`Phone: ${document.getElementById("mrmCustomerPhone").value}`, margin, y);

    y += 6;

    pdf.text(`Location: ${document.getElementById("mrmCustomerLocation").value}`, margin, y);

    y += 12;

    const tableRows = items.map((item, index) => {
      const name = item.product || item.name || item.description || "Roofing Product";
      const gauge = item.gauge || item.specification || "Standard";
      const quantity = Number(item.quantity || 0);
      const unit = item.unit || "metres";
      const unitPrice = Number(item.unitPrice || item.price || item.rate || 0);
      const lineTotal = Number(item.lineTotal || item.amount || quantity * unitPrice);

      return [
        String(index + 1),
        `${name} (${gauge})`,
        `${quantity} ${unit}`,
        money(unitPrice),
        money(lineTotal)
      ];
    });

    if (pdf.autoTable) {
      pdf.autoTable({
        startY: y,
        head: [["No.", "Description", "Quantity", "Unit Price", "Amount"]],
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
    } else {
      throw new Error("PDF table library is missing. Check the jsPDF AutoTable script.");
    }

    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`TOTAL: ${money(total)}`, pageWidth - margin, y, {
      align: "right"
    });

    y += 12;

    /* PENDING STAMP */

    pdf.setDrawColor(190, 35, 35);
    pdf.setTextColor(190, 35, 35);
    pdf.setLineWidth(1.1);

    pdf.rect(pageWidth - 65, y, 48, 15);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text("PENDING", pageWidth - 41, y + 10, {
      align: "center"
    });

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
      const lines = pdf.splitTextToSize(term, pageWidth - margin * 2);

      if (y + lines.length * 4 > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(lines, margin, y);
      y += lines.length * 4 + 2;
    });

    y += 5;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Thank you for choosing Mabati Rolling Mills.", margin, y);

    return pdf;
  }

  /* =======================================================
     12. CONVERT PDF TO BASE64
     ======================================================= */

  function pdfToBase64(pdf) {
    const dataUri = pdf.output("datauristring");
    return dataUri.split(",")[1];
  }

  /* =======================================================
     13. SUBMIT AND GENERATE INVOICE
     ======================================================= */

  async function submitInvoice(event) {
    event.preventDefault();

    const form = document.getElementById("mrmInvoiceForm");

    if (!form.reportValidity()) return;

    const token = document
      .getElementById("mrmTurnstileContainer")
      ?.dataset.token;

    if (!token) {
      showMessage("Please complete the security verification before continuing.", "error");
      return;
    }

    const items = getSelectedItems();

    if (!items.length) {
      showMessage("Please select at least one valid roofing product.", "error");
      return;
    }

    const customer = {
      name: document.getElementById("mrmCustomerName").value.trim(),
      phone: document.getElementById("mrmCustomerPhone").value.trim(),
      location: document.getElementById("mrmCustomerLocation").value.trim()
    };

    if (!customer.name || !customer.phone || !customer.location) {
      showMessage("Complete all customer details before continuing.", "error");
      return;
    }

    setLoading(true);

    const results = document.getElementById("mrmInvoiceResults");
    results.style.display = "none";
    results.innerHTML = "";

    try {
      showMessage("Step 1 of 3: Verifying your details and product prices...", "info");

      const prepared = await apiRequest("/api/invoices/prepare", {
        method: "POST",
        body: JSON.stringify({
          customer,
          items,
          turnstileToken: token
        })
      });

      const invoice = prepared.invoice || prepared;

      if (!invoice.invoiceNumber && !invoice.invoice_number) {
        throw new Error("The server did not return an invoice number.");
      }

      showMessage("Step 2 of 3: Generating your pro-forma invoice PDF...", "info");

      const pdf = createInvoicePDF(invoice);
      const base64PDF = pdfToBase64(pdf);

      showMessage("Step 3 of 3: Saving your invoice securely...", "info");

      const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number;

      const finalized = await apiRequest("/api/invoices/finalize", {
        method: "POST",
        body: JSON.stringify({
          invoiceNumber,
          publicToken: invoice.publicToken || invoice.public_token,
          pdfBase64: base64PDF
        })
      });

      const publicUrl = finalized.publicUrl ||
        finalized.public_url ||
        invoice.publicUrl ||
        invoice.public_url;

      const pdfBlob = pdf.output("blob");
      const downloadUrl = URL.createObjectURL(pdfBlob);

      const whatsappMessage =
        `Hello MRM Team,\n\n` +
        `I have generated a pro-forma invoice.\n` +
        `Invoice Number: ${invoiceNumber}\n` +
        `Customer: ${customer.name}\n` +
        `Location: ${customer.location}\n` +
        `Total: ${money(invoice.total || invoice.subtotal)}\n\n` +
        (publicUrl ? `Invoice link: ${publicUrl}` : "I will share the invoice PDF separately.") +
        `\n\nKindly assist me with the next steps.`;

      results.innerHTML = `
        <h3>Invoice Created Successfully</h3>

        <p><strong>Invoice Number:</strong> ${escapeHTML(invoiceNumber)}</p>

        <p><strong>Status:</strong> PENDING</p>

        <p>Your pro-forma invoice has been generated and saved.</p>

        <a href="${downloadUrl}" download="${escapeHTML(invoiceNumber)}.pdf">
          DOWNLOAD PDF
        </a>

        ${publicUrl ? `
          <a href="${escapeHTML(publicUrl)}" target="_blank" rel="noopener">
            VIEW ONLINE INVOICE
          </a>
        ` : ""}

        <a class="mrm-whatsapp"
          href="${createWhatsAppLink(whatsappMessage)}"
          target="_blank" rel="noopener">
          SHARE VIA WHATSAPP
        </a>
      `;

      results.style.display = "block";

      showMessage("Your pro-forma invoice has been created successfully.", "success");

      resetTurnstile();

      results.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      console.error("MRM invoice error:", error);

      showMessage(
        error.message || "Invoice creation failed. Please try again.",
        "error"
      );

      resetTurnstile();

    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     14. INITIALISE
     ======================================================= */

  async function initialiseInvoiceSystem() {
    addStyles();
    createInvoiceSection();
    addNavigationLink();

    const addButton = document.getElementById("mrmAddInvoiceItem");
    const form = document.getElementById("mrmInvoiceForm");

    if (!addButton || !form) return;

    addButton.addEventListener("click", addInvoiceItem);
    form.addEventListener("submit", submitInvoice);

    renderTurnstile();

    try {
      showMessage("Loading roofing product catalogue...", "info");

      await loadCatalogue();

      showMessage("Product catalogue loaded. You can now create an invoice.", "success");

    } catch (error) {
      console.error("MRM catalogue error:", error);

      showMessage(
        `Could not load the product catalogue: ${error.message}`,
        "error"
      );
    }

    renderTurnstile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseInvoiceSystem);
  } else {
    initialiseInvoiceSystem();
  }

})();
