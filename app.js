
/* =========================================
   MABATI ROLLING MILLS
   MAIN WEBSITE JAVASCRIPT
========================================= */


/* =========================================
   1. WHATSAPP CONTACT DETAILS
========================================= */

const WHATSAPP_NUMBER = "254733608974";

const WHATSAPP_MESSAGE = `Hello MRM Team,

I am interested in your roofing products. Kindly assist me with product information, current pricing, availability and the ordering process.

Thank you.`;

function createWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const whatsappLink = createWhatsAppLink(WHATSAPP_MESSAGE);


/* =========================================
   2. NAVIGATION MENU
========================================= */

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

function closeMenu() {
  if (!menuToggle || !mainNav) return;

  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
}

function openMenu() {
  if (!menuToggle || !mainNav) return;

  mainNav.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Close navigation menu");
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", function (event) {
    event.stopPropagation();

    if (mainNav.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", function (event) {
    if (
      !mainNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}


/* =========================================
   3. WHATSAPP LINKS
========================================= */

const whatsappFloat = document.getElementById("whatsappFloat");

if (whatsappFloat) {
  whatsappFloat.href = whatsappLink;
  whatsappFloat.target = "_blank";
  whatsappFloat.rel = "noopener noreferrer";
}

document.querySelectorAll(".whatsapp-contact").forEach(function (link) {
  link.href = whatsappLink;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});


/* =========================================
   4. HERO IMAGE SLIDESHOW
========================================= */

const heroSlides = document.querySelectorAll(".hero-slide");
const heroIndicators = document.querySelectorAll(".hero-indicators button");

let currentHeroSlide = 0;
let heroSlideshowTimer = null;

function showHeroSlide(index) {
  if (!heroSlides.length) return;

  currentHeroSlide = index;

  heroSlides.forEach(function (slide, slideIndex) {
    slide.classList.toggle("active", slideIndex === index);
  });

  heroIndicators.forEach(function (indicator, indicatorIndex) {
    indicator.classList.toggle("active", indicatorIndex === index);

    indicator.setAttribute(
      "aria-pressed",
      indicatorIndex === index ? "true" : "false"
    );
  });
}

function nextHeroSlide() {
  if (!heroSlides.length) return;

  const nextIndex = (currentHeroSlide + 1) % heroSlides.length;
  showHeroSlide(nextIndex);
}

function startHeroSlideshow() {
  if (heroSlides.length <= 1) return;

  clearInterval(heroSlideshowTimer);
  heroSlideshowTimer = setInterval(nextHeroSlide, 7000);
}

heroIndicators.forEach(function (indicator, index) {
  indicator.addEventListener("click", function () {
    if (index >= heroSlides.length) return;

    showHeroSlide(index);
    startHeroSlideshow();
  });
});

if (heroSlides.length > 0) {
  showHeroSlide(0);
  startHeroSlideshow();
}


/* =========================================
   5. ROOFING PRICE DATA
========================================= */

const categoryPrices = {
  "box-profile": {
    "26G": 710,
    "28G": 560,
    "30G": 450
  },

  "tile-profile": {
    "28G": 690,
    "30G": 520
  },

  "corrugated": {
    "28G": 560,
    "30G": 420,
    "32G": 240
  }
};


const productSpecificPrices = {
  "MaxCover": {
    "30G": 610
  },

  "Covermax": {
    "30G": 490
  },

  "Versatile": {
    "28G": 790
  },

  "Elegantile": {
    "28G": 900
  },

  "Galsheet Resincot": {
    "30G": 510
  },

  "Unpainted Dumuzas": {
    "30G": 400
  }
};


const stoneCoatedPrices = {
  "Lifestile Waves": 680,
  "Three Stone Coated Roofing": 720,
  "Underscore Stone Coated Roofing": 760,
  "Lifestile Roman": 779,
  "Lifestile Shingles": 770,
  "Lifestile Classic": 650
};


const concealedFixPrices = {
  "Saflok": 1440,
  "Safdeck": 1280,
  "Trimflute": 1040,
  "Tekdek": 1440
};


const categoryGauges = {
  "box-profile": ["26G", "28G", "30G"],
  "tile-profile": ["28G", "30G"],
  "corrugated": ["28G", "30G", "32G"],
  "concealed-fix": ["26G", "28G", "30G", "32G"]
};


/* =========================================
   6. PRICE FORMATTING
========================================= */

function formatCurrency(amount) {
  return "KSh " + new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0
  }).format(amount);
}

function getProductRate(product, category, gauge, unit) {

  if (unit === "piece") {
    return Object.prototype.hasOwnProperty.call(stoneCoatedPrices, product)
      ? stoneCoatedPrices[product]
      : null;
  }

  if (
    category === "concealed-fix" &&
    Object.prototype.hasOwnProperty.call(concealedFixPrices, product)
  ) {
    return concealedFixPrices[product];
  }

  if (
    productSpecificPrices[product] &&
    Object.prototype.hasOwnProperty.call(
      productSpecificPrices[product],
      gauge
    )
  ) {
    return productSpecificPrices[product][gauge];
  }

  if (
    categoryPrices[category] &&
    Object.prototype.hasOwnProperty.call(categoryPrices[category], gauge)
  ) {
    return categoryPrices[category][gauge];
  }

  return null;
}


/* =========================================
   7. INDIVIDUAL PRODUCT CALCULATORS
========================================= */

function createProductCalculator(card) {
  const product = card.dataset.product;
  const category = card.dataset.category;
  const unit = card.dataset.unit || "metre";

  const calculator = document.createElement("div");
  calculator.className = "product-calculator";

  const heading = document.createElement("h5");
  heading.textContent = "Calculate " + product;
  calculator.appendChild(heading);

  let gaugeSelect = null;

  if (unit !== "piece" && category !== "concealed-fix") {
    const gaugeLabel = document.createElement("label");
    gaugeLabel.textContent = "Select Gauge";
    calculator.appendChild(gaugeLabel);

    gaugeSelect = document.createElement("select");
    gaugeSelect.setAttribute("aria-label", "Select gauge for " + product);

    const gauges = categoryGauges[category] || [];

    if (gauges.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Gauge to be confirmed";
      gaugeSelect.appendChild(option);
    } else {
      gauges.forEach(function (gauge) {
        const option = document.createElement("option");
        option.value = gauge;
        option.textContent = "Gauge " + gauge;
        gaugeSelect.appendChild(option);
      });
    }

    calculator.appendChild(gaugeSelect);
  }

  const quantityLabel = document.createElement("label");
  quantityLabel.textContent = unit === "piece"
    ? "Number of Pieces"
    : "Required Length (metres)";

  calculator.appendChild(quantityLabel);

  const quantityControl = document.createElement("div");
  quantityControl.className = "product-calc-quantity";

  const decreaseButton = document.createElement("button");
  decreaseButton.type = "button";
  decreaseButton.textContent = "−";
  decreaseButton.setAttribute("aria-label", "Decrease quantity");

  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.min = "1";
  quantityInput.step = "1";
  quantityInput.value = "2";
  quantityInput.inputMode = "numeric";
  quantityInput.setAttribute("aria-label", "Enter quantity");

  const increaseButton = document.createElement("button");
  increaseButton.type = "button";
  increaseButton.textContent = "+";
  increaseButton.setAttribute("aria-label", "Increase quantity");

  quantityControl.appendChild(decreaseButton);
  quantityControl.appendChild(quantityInput);
  quantityControl.appendChild(increaseButton);

  calculator.appendChild(quantityControl);

  const results = document.createElement("div");
  results.className = "product-calc-results";

  const rateRow = document.createElement("div");
  const rateLabel = document.createElement("span");
  const rateValue = document.createElement("strong");

  rateLabel.textContent = unit === "piece"
    ? "Price per piece"
    : "Price per metre";

  rateValue.textContent = "Price pending";

  rateRow.appendChild(rateLabel);
  rateRow.appendChild(rateValue);

  const totalRow = document.createElement("div");
  totalRow.className = "calc-total";

  const totalLabel = document.createElement("span");
  const totalValue = document.createElement("strong");

  totalLabel.textContent = "Estimated total";
  totalValue.textContent = "Price pending";

  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalValue);

  results.appendChild(rateRow);
  results.appendChild(totalRow);
  calculator.appendChild(results);

  const note = document.createElement("p");
  note.className = "product-calc-note";

  if (unit === "piece") {
    note.textContent = "Material estimate based on the number of pieces. Confirm product specifications before ordering.";
  } else if (category === "concealed-fix") {
    note.textContent = "Material estimate based on the fixed price per linear metre. Confirm product specifications before ordering.";
  } else {
    note.textContent = "Material estimate based on the selected gauge and linear metres. This is not a roof-area calculator.";
  }

  calculator.appendChild(note);

  function updateProductCalculator() {
    let quantity = Number.parseInt(quantityInput.value, 10);

    if (!Number.isFinite(quantity) || quantity < 1) {
      quantity = 1;
      quantityInput.value = "1";
    }

    const gauge = gaugeSelect ? gaugeSelect.value : "";
    const rate = getProductRate(product, category, gauge, unit);

    if (rate === null) {
      rateValue.textContent = "Price pending";
      totalValue.textContent = "Price pending";
      return;
    }

    rateValue.textContent = formatCurrency(rate);
    totalValue.textContent = formatCurrency(rate * quantity);
  }

  decreaseButton.addEventListener("click", function () {
    const current = Number.parseInt(quantityInput.value, 10) || 1;

    if (current > 1) {
      quantityInput.value = String(current - 1);
      updateProductCalculator();
    }
  });

  increaseButton.addEventListener("click", function () {
    const current = Number.parseInt(quantityInput.value, 10) || 1;
    quantityInput.value = String(current + 1);
    updateProductCalculator();
  });

  quantityInput.addEventListener("input", updateProductCalculator);

  if (gaugeSelect) {
    gaugeSelect.addEventListener("change", updateProductCalculator);
  }

  card.appendChild(calculator);
  updateProductCalculator();
}


document.querySelectorAll(".product-card").forEach(function (card) {
  createProductCalculator(card);
});


/* =========================================
   8. QUOTATION FORM PRODUCT OPTIONS
========================================= */

const quoteProduct = document.getElementById("quoteProduct");

const productCards = document.querySelectorAll(".product-card");

if (quoteProduct) {
  productCards.forEach(function (card) {
    const product = card.dataset.product;

    if (!product) return;

    const option = document.createElement("option");
    option.value = product;
    option.textContent = product;

    quoteProduct.appendChild(option);
  });
}


/* =========================================
   9. WHATSAPP QUOTATION FORM
========================================= */

const quotationForm = document.getElementById("quotationForm");

if (quotationForm) {
  quotationForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("quoteName").value.trim();
    const phone = document.getElementById("quotePhone").value.trim();
    const location = document.getElementById("quoteLocation").value.trim();
    const product = document.getElementById("quoteProduct").value;
    const gauge = document.getElementById("quoteGauge").value;
    const quantity = document.getElementById("quoteQuantity").value.trim();
    const notes = document.getElementById("quoteNotes").value.trim();

    if (!name || !location || !product) {
      alert("Please complete your name, project location and product.");
      return;
    }

    const message = `Hello MRM Team,

I would like to request a roofing quotation.

CUSTOMER DETAILS
Name: ${name}
Phone: ${phone || "Not provided"}
Project Location: ${location}

PRODUCT DETAILS
Product: ${product}
Gauge / Specification: ${gauge || "To be advised"}
Estimated Quantity: ${quantity || "To be confirmed"}

ADDITIONAL REQUIREMENTS
${notes || "No additional details provided."}

Kindly assist me with the current pricing, product availability and ordering process.

Thank you.`;

    const quotationLink = createWhatsAppLink(message);

    window.open(quotationLink, "_blank", "noopener,noreferrer");
  });
}


/* =========================================
   10. FAQ INTERACTION
========================================= */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(function (item) {
  item.addEventListener("toggle", function () {
    if (item.open) {
      faqItems.forEach(function (otherItem) {
        if (otherItem !== item) {
          otherItem.open = false;
        }
      });
    }
  });
});


/* =========================================
   11. FOOTER YEAR
========================================= */

const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}


/* =========================================
   12. SMOOTH SECTION NAVIGATION
========================================= */

document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener("click", function (event) {
    const targetId = link.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);

    if (target) {
      event.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      if (mainNav && mainNav.contains(link)) {
        closeMenu();
      }
    }
  });
});


/* =========================================
   13. WEBSITE INITIALISATION
========================================= */

console.log("MABATI ROLLING MILLS website loaded.");
console.log("WhatsApp contact:", WHATSAPP_NUMBER);
console.log("Hero slides found:", heroSlides.length);
console.log("Product calculators created:", productCards.length);
console.log("FAQ items found:", faqItems.length);


/* =========================================
   14. OUR PROJECTS PHOTO GALLERIES
========================================= */

const projectCategories = document.getElementById("projectCategories");

const projectGalleryViews = document.querySelectorAll(".project-gallery-view");

const projectCategoryButtons = document.querySelectorAll("[data-gallery-open]");

const projectBackButtons = document.querySelectorAll("[data-gallery-back]");


function openProjectGallery(category) {
  if (!projectCategories) return;

  const selectedGallery = document.getElementById("gallery-" + category);

  if (!selectedGallery) return;

  projectCategories.hidden = true;

  projectGalleryViews.forEach(function (gallery) {
    gallery.hidden = true;
  });

  selectedGallery.hidden = false;

  const track = selectedGallery.querySelector(".project-gallery-track");

  if (track) {
    track.scrollTo({
      left: 0,
      behavior: "instant"
    });
  }

  updateProjectGalleryDots(selectedGallery);

  selectedGallery.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function closeProjectGallery() {
  projectGalleryViews.forEach(function (gallery) {
    gallery.hidden = true;
  });

  if (projectCategories) {
    projectCategories.hidden = false;

    projectCategories.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}


projectCategoryButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    openProjectGallery(button.dataset.galleryOpen);
  });
});


projectBackButtons.forEach(function (button) {
  button.addEventListener("click", closeProjectGallery);
});


function updateProjectGalleryDots(gallery) {
  const track = gallery.querySelector(".project-gallery-track");
  const slides = gallery.querySelectorAll(".project-gallery-slide");
  const dots = gallery.querySelectorAll(".project-gallery-dots button");

  if (!track || !slides.length || !dots.length) return;

  const slideWidth = slides[0].getBoundingClientRect().width +
    parseFloat(getComputedStyle(track).columnGap || 0);

  let activeIndex = Math.round(track.scrollLeft / slideWidth);

  activeIndex = Math.max(0, Math.min(activeIndex, dots.length - 1));

  dots.forEach(function (dot, index) {
    dot.classList.toggle("active", index === activeIndex);
  });
}


projectGalleryViews.forEach(function (gallery) {
  const track = gallery.querySelector(".project-gallery-track");
  const slides = gallery.querySelectorAll(".project-gallery-slide");
  const previousButton = gallery.querySelector(".project-prev");
  const nextButton = gallery.querySelector(".project-next");
  const dots = gallery.querySelectorAll(".project-gallery-dots button");

  if (!track || !slides.length) return;

  function moveToSlide(index) {
    const safeIndex = Math.max(0, Math.min(index, slides.length - 1));

    track.scrollTo({
      left: slides[safeIndex].offsetLeft - slides[0].offsetLeft,
      behavior: "smooth"
    });
  }

  if (previousButton) {
    previousButton.addEventListener("click", function () {
      const currentIndex = Array.from(slides).findIndex(function (slide) {
        return Math.abs(slide.offsetLeft - track.scrollLeft) < 20;
      });

      const fallbackIndex = Math.round(
        track.scrollLeft / slides[0].getBoundingClientRect().width
      );

      moveToSlide((currentIndex >= 0 ? currentIndex : fallbackIndex) - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      const slideWidth = slides[0].getBoundingClientRect().width +
        parseFloat(getComputedStyle(track).columnGap || 0);

      const currentIndex = Math.round(track.scrollLeft / slideWidth);

      moveToSlide(currentIndex + 1);
    });
  }

  dots.forEach(function (dot, index) {
    dot.addEventListener("click", function () {
      moveToSlide(index);
    });
  });

  track.addEventListener("scroll", function () {
    updateProjectGalleryDots(gallery);
  }, { passive: true });
});

console.log("Project photo galleries initialised.");
