const API = "/api";

const form = document.getElementById("appForm");
const message = document.getElementById("message");
const appList = document.getElementById("appList");

async function loadApps() {

  try {

    const response = await fetch(`${API}/apps`);

    const apps = await response.json();

    document.getElementById("totalApps").textContent =
      apps.length;

    document.getElementById("totalGames").textContent =
      apps.filter(app => app.category === "Games").length;

    document.getElementById("totalFeatured").textContent =
      apps.filter(app => app.featured).length;

    if (!apps.length) {

      appList.innerHTML = `
        <div class="app-item">
          <div>
            <h3>No apps yet</h3>
            <p>Add your first app above.</p>
          </div>
        </div>
      `;

      return;
    }

    appList.innerHTML = apps.map(app => `
      <div class="app-item">

        <div>
          <h3>${escapeHTML(app.name)}</h3>
          <p>
            ${escapeHTML(app.category)}
            • ${escapeHTML(app.version || "1.0.0")}
          </p>
        </div>

        <button
          class="delete-btn"
          onclick="deleteApp('${app.id}')"
        >
          Delete
        </button>

      </div>
    `).join("");

  } catch (error) {

    appList.innerHTML = `
      <div class="app-item">
        <div>
          <h3>Server not connected</h3>
          <p>Start the KIRUU STORE backend first.</p>
        </div>
      </div>
    `;

  }
}


form.addEventListener("submit", async (event) => {

  event.preventDefault();

  const app = {

    name: document.getElementById("name").value.trim(),

    category:
      document.getElementById("category").value,

    version:
      document.getElementById("version").value.trim(),

    size:
      document.getElementById("size").value.trim(),

    icon:
      document.getElementById("icon").value.trim(),

    download:
      document.getElementById("download").value.trim(),

    description:
      document.getElementById("description").value.trim(),

    featured:
      document.getElementById("featured").checked
  };


  try {

    const response = await fetch(`${API}/apps`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(app)

    });


    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed");
    }

    message.textContent = "✅ App added successfully.";

    message.style.color = "#65e6a1";

    form.reset();

    loadApps();

  } catch (error) {

    message.textContent =
      "❌ " + error.message;

    message.style.color = "#ff6d7d";

  }

});


async function deleteApp(id) {

  if (!confirm("Delete this app?")) {
    return;
  }

  try {

    const response = await fetch(
      `${API}/apps/${id}`,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    loadApps();

  } catch (error) {

    alert(error.message);

  }
}


function escapeHTML(value) {

  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


loadApps();