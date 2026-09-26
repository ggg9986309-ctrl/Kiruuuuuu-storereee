const apps = document.getElementById("apps");
const search = document.getElementById("search");

async function loadApps() {
  try {
    const response = await fetch("/api/apps");
    const data = await response.json();

    showApps(data);
  } catch (error) {
    console.log("Apps load error:", error);

    if (apps) {
      apps.innerHTML = `
        <p>Apps load nahi ho pa rahe.</p>
      `;
    }
  }
}

function showApps(list) {

  if (!apps) return;

  apps.innerHTML = "";

  if (!list || list.length === 0) {

    apps.innerHTML = `
      <div class="empty-apps">
        <h3>No Apps Available</h3>
        <p>Abhi koi APK add nahi kiya gaya.</p>
      </div>
    `;

    return;
  }

  list.forEach((app) => {

    const card = document.createElement("div");

    card.className = "app-card";

    card.innerHTML = `
      <div class="app-icon">
        📱
      </div>

      <h3>${escapeHTML(app.name)}</h3>

      <p>
        ${escapeHTML(
          app.description || "Android Application"
        )}
      </p>

      <div class="app-info">
        Version: ${escapeHTML(app.version || "1.0.0")}
        <br>
        Category: ${escapeHTML(app.category || "Apps")}
        <br>
        Downloads: ${app.downloads || 0}
      </div>

      <a
        class="download-btn"
        href="${escapeHTML(app.file)}"
      >
        Download APK
      </a>
    `;

    apps.appendChild(card);
  });
}

function escapeHTML(text) {

  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (search) {

  search.addEventListener("input", () => {

    const keyword =
      search.value.toLowerCase().trim();

    loadApps().then(() => {

      // Search result server se dobara load karne ke bajay
      // current cards ko filter karna
      const cards =
        document.querySelectorAll(".app-card");

      cards.forEach((card) => {

        const text =
          card.textContent.toLowerCase();

        card.style.display =
          text.includes(keyword)
            ? ""
            : "none";
      });

    });
  });
}

loadApps();
function scrollToApps() {
  document.getElementById("apps").scrollIntoView({
    behavior: "smooth"
  });
}


function openAdmin() {
  alert("Admin Panel will be connected in the next step.");
}


function downloadAPK() {
  alert("APK download link will be connected from the Admin Panel.");
}


function searchApps() {

  const searchValue =
    document.getElementById("search").value.toLowerCase();

  const cards =
    document.querySelectorAll(".apk-card");

  cards.forEach(card => {

    const name =
      card.querySelector("h3").innerText.toLowerCase();

    if (name.includes(searchValue)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }

  });
}/* =========================================
   KIRAN JADHAV APK STORE
   public/app.js
========================================= */

const appsGrid = document.getElementById("appsGrid");
const emptyState = document.getElementById("emptyState");
const appCount = document.getElementById("appCount");
const searchInput = document.getElementById("searchInput");

const categoryButtons = document.querySelectorAll(".category");

const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");

const modal = document.getElementById("downloadModal");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");

const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalVersion = document.getElementById("modalVersion");
const modalDownloads = document.getElementById("modalDownloads");
const modalCategory = document.getElementById("modalCategory");
const modalDownload = document.getElementById("modalDownload");
const modalIcon = document.getElementById("modalIcon");

const yearElement = document.getElementById("year");

let apps = [];
let selectedCategory = "All";


/* =========================================
   YEAR
========================================= */

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


/* =========================================
   MOBILE MENU
========================================= */

if (menuBtn && mobileMenu) {

  menuBtn.addEventListener("click", () => {

    mobileMenu.classList.toggle("open");

    const icon = menuBtn.querySelector("i");

    if (mobileMenu.classList.contains("open")) {
      icon.className = "fa-solid fa-xmark";
    } else {
      icon.className = "fa-solid fa-bars";
    }

  });

}


/* Close mobile menu after clicking link */

document.querySelectorAll(".mobile-menu a").forEach(link => {

  link.addEventListener("click", () => {

    if (mobileMenu) {
      mobileMenu.classList.remove("open");
    }

    if (menuBtn) {
      const icon = menuBtn.querySelector("i");

      if (icon) {
        icon.className = "fa-solid fa-bars";
      }
    }

  });

});


/* =========================================
   LOAD APPS FROM SERVER
========================================= */

async function loadApps() {

  try {

    showLoading();

    const response = await fetch("/api/apps", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Server error");
    }

    const data = await response.json();

    /*
      Backend normally returns:
      [
        {
          id,
          name,
          version,
          category,
          description,
          icon,
          downloads,
          downloadUrl
        }
      ]
    */

    if (Array.isArray(data)) {
      apps = data;
    } else if (Array.isArray(data.apps)) {
      apps = data.apps;
    } else {
      apps = [];
    }

    renderApps();

  } catch (error) {

    console.error("APK Store error:", error);

    apps = [];

    showEmpty(
      "Store Connection",
      "Apps could not be loaded right now."
    );

  }

}


/* =========================================
   LOADING
========================================= */

function showLoading() {

  if (!appsGrid) return;

  appsGrid.innerHTML = `
    <div class="app-card">
      <div class="app-top">
        <div class="app-icon">
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>
      </div>

      <h3>Loading Apps...</h3>

      <p>
        Please wait while we load the latest apps.
      </p>
    </div>
  `;

}


/* =========================================
   RENDER APPS
========================================= */

function renderApps() {

  if (!appsGrid) return;

  const searchText = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  let filteredApps = apps.filter(app => {

    const name = String(app.name || "").toLowerCase();

    const description = String(
      app.description || ""
    ).toLowerCase();

    const category = String(
      app.category || ""
    ).toLowerCase();

    const matchesSearch =
      name.includes(searchText) ||
      description.includes(searchText) ||
      category.includes(searchText);

    const matchesCategory =
      selectedCategory === "All" ||
      category === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;

  });


  appsGrid.innerHTML = "";

  if (appCount) {
    appCount.textContent =
      `${filteredApps.length} App${filteredApps.length !== 1 ? "s" : ""}`;
  }


  if (filteredApps.length === 0) {

    if (emptyState) {
      emptyState.style.display = "block";

      const heading = emptyState.querySelector("h3");
      const paragraph = emptyState.querySelector("p");

      if (heading) {
        heading.textContent = "No Apps Found";
      }

      if (paragraph) {
        paragraph.textContent =
          searchText || selectedCategory !== "All"
            ? "No app matches your search or category."
            : "No apps have been added yet.";
      }
    }

    return;

  }


  if (emptyState) {
    emptyState.style.display = "none";
  }


  filteredApps.forEach((app, index) => {

    const card = createAppCard(app);

    /*
      Small stagger animation
    */

    card.style.animationDelay = `${index * 0.05}s`;

    appsGrid.appendChild(card);

  });

}


/* =========================================
   CREATE APP CARD
========================================= */

function createAppCard(app) {

  const card = document.createElement("article");

  card.className = "app-card";


  const icon = getAppIcon(app);

  const name = escapeHTML(
    app.name || "Unknown App"
  );

  const version = escapeHTML(
    app.version || "1.0"
  );

  const category = escapeHTML(
    app.category || "Apps"
  );

  const description = escapeHTML(
    app.description || "No description available."
  );

  const downloads = formatDownloads(
    app.downloads || 0
  );


  card.innerHTML = `

    <div class="app-top">

      <div class="app-icon">
        ${icon}
      </div>

      <span class="app-category">
        ${category}
      </span>

    </div>


    <h3>
      ${name}
    </h3>


    <p>
      ${description}
    </p>


    <div class="app-meta">

      <span>
        <i class="fa-solid fa-code-branch"></i>
        v${version}
      </span>

      <span>
        <i class="fa-solid fa-download"></i>
        ${downloads}
      </span>

    </div>


    <button
      class="app-download"
      type="button"
    >
      <i class="fa-solid fa-download"></i>
      Download APK
    </button>

  `;


  const downloadButton =
    card.querySelector(".app-download");


  if (downloadButton) {

    downloadButton.addEventListener(
      "click",
      () => openDownloadModal(app)
    );

  }


  return card;

}


/* =========================================
   APP ICON
========================================= */

function getAppIcon(app) {

  if (app.icon) {

    const iconUrl = String(app.icon);

    return `
      <img
        src="${escapeAttribute(iconUrl)}"
        alt=""
        loading="lazy"
        onerror="this.style.display='none';this.parentElement.innerHTML='<i class=&quot;fa-solid fa-mobile-screen&quot;></i>';"
      >
    `;

  }


  return `
    <i class="fa-solid fa-mobile-screen"></i>
  `;

}


/* =========================================
   DOWNLOAD MODAL
========================================= */

function openDownloadModal(app) {

  if (!modal) return;


  modalTitle.textContent =
    app.name || "Unknown App";

  modalDescription.textContent =
    app.description || "No description available.";

  modalVersion.textContent =
    app.version || "1.0";

  modalDownloads.textContent =
    formatDownloads(app.downloads || 0);

  modalCategory.textContent =
    app.category || "App";


  /* Icon */

  if (app.icon) {

    modalIcon.innerHTML = `
      <img
        src="${escapeAttribute(String(app.icon))}"
        alt=""
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:inherit;
        "
      >
    `;

  } else {

    modalIcon.innerHTML =
      `<i class="fa-solid fa-mobile-screen"></i>`;

  }


  /*
    Download URL comes from backend.

    Example:
    /api/apps/123/download
  */

  let downloadUrl =
    app.downloadUrl ||
    (app.id
      ? `/api/apps/${encodeURIComponent(app.id)}/download`
      : "#");


  modalDownload.href = downloadUrl;


  /*
    Don't open a fake "#" download.
  */

  if (downloadUrl === "#") {

    modalDownload.removeAttribute("href");

    modalDownload.style.opacity = "0.5";
    modalDownload.style.pointerEvents = "none";

  } else {

    modalDownload.href = downloadUrl;
    modalDownload.style.opacity = "1";
    modalDownload.style.pointerEvents = "auto";

  }


  modal.classList.add("show");

  document.body.style.overflow = "hidden";

}


/* =========================================
   CLOSE MODAL
========================================= */

function closeModal() {

  if (!modal) return;

  modal.classList.remove("show");

  document.body.style.overflow = "";

}


if (modalClose) {
  modalClose.addEventListener(
    "click",
    closeModal
  );
}


if (modalOverlay) {
  modalOverlay.addEventListener(
    "click",
    closeModal
  );
}


/* ESC KEY */

document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closeModal();
  }

});


/* =========================================
   SEARCH
========================================= */

if (searchInput) {

  searchInput.addEventListener(
    "input",
    renderApps
  );

}


/* =========================================
   CATEGORY FILTER
========================================= */

categoryButtons.forEach(button => {

  button.addEventListener("click", () => {

    categoryButtons.forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedCategory =
      button.dataset.category || "All";

    renderApps();

  });

});


/* =========================================
   KEYBOARD SEARCH
   Ctrl/Cmd + K
========================================= */

document.addEventListener("keydown", event => {

  const isShortcut =
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k";

  if (!isShortcut) return;

  event.preventDefault();

  if (searchInput) {
    searchInput.focus();
  }

});


/* =========================================
   EMPTY STATE
========================================= */

function showEmpty(title, message) {

  if (!appsGrid) return;

  appsGrid.innerHTML = "";

  if (emptyState) {

    emptyState.style.display = "block";

    const heading =
      emptyState.querySelector("h3");

    const paragraph =
      emptyState.querySelector("p");

    if (heading) {
      heading.textContent = title;
    }

    if (paragraph) {
      paragraph.textContent = message;
    }

  }

  if (appCount) {
    appCount.textContent = "0 Apps";
  }

}


/* =========================================
   NUMBER FORMAT
========================================= */

function formatDownloads(number) {

  const value = Number(number);

  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value >= 1000000) {
    return (
      (value / 1000000)
        .toFixed(1)
        .replace(".0", "") +
      "M"
    );
  }

  if (value >= 1000) {
    return (
      (value / 1000)
        .toFixed(1)
        .replace(".0", "") +
      "K"
    );
  }

  return value.toString();

}


/* =========================================
   HTML SECURITY
========================================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return escapeHTML(value);

}


/* =========================================
   START STORE
========================================= */

loadApps();


/* =========================================
   AUTO REFRESH
   Admin se new APK add hone ke baad
   store ko periodically refresh karega.
========================================= */

setInterval(() => {

  loadApps();

}, 60000);