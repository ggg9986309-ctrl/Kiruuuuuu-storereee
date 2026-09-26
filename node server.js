const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const uploadDir = path.join(__dirname, "uploads", "apks");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, Date.now() + "-" + safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== ".apk") {
      return cb(new Error("Sirf APK file allowed hai."));
    }

    cb(null, true);
  }
});

let apps = [];

app.get("/api/apps", (req, res) => {
  res.json(apps);
});

app.post("/api/admin/upload-apk", upload.single("apk"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "APK file select karo."
      });
    }

    const newApp = {
      id: Date.now().toString(),
      name: req.body.name || "My Android App",
      version: req.body.version || "1.0.0",
      description: req.body.description || "",
      category: req.body.category || "Apps",
      file: "/downloads/" + req.file.filename,
      size: req.file.size,
      downloads: 0,
      createdAt: new Date().toISOString()
    };

    apps.unshift(newApp);

    res.json({
      success: true,
      app: newApp
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get("/downloads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("APK not found");
  }

  const appData = apps.find(
    item => item.file === "/downloads/" + filename
  );

  if (appData) {
    appData.downloads++;
  }

  res.download(filePath);
});

app.delete("/api/admin/apk/:id", (req, res) => {
  const index = apps.findIndex(
    item => item.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      error: "APK nahi mila."
    });
  }

  const apk = apps[index];
  const filename = path.basename(apk.file);
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  apps.splice(index, 1);

  res.json({
    success: true
  });
});

app.use((err, req, res, next) => {
  res.status(400).json({
    error: err.message
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// SECURITY SETTINGS
// ===============================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
  console.error(
    "Missing environment variables: ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET"
  );
  process.exit(1);
}

// ===============================
// FOLDERS
// ===============================

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "apps.json");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const APK_DIR = path.join(UPLOAD_DIR, "apks");
const ICON_DIR = path.join(UPLOAD_DIR, "icons");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(APK_DIR, { recursive: true });
fs.mkdirSync(ICON_DIR, { recursive: true });

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, "[]", "utf8");
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===============================
// DATABASE FUNCTIONS
// ===============================

function readApps() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    const apps = JSON.parse(data);

    return Array.isArray(apps) ? apps : [];
  } catch (error) {
    console.error("Database read error:", error);
    return [];
  }
}

function writeApps(apps) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(apps, null, 2),
    "utf8"
  );
}

// ===============================
// DELETE FILE SAFELY
// ===============================

function deleteFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("File delete error:", error);
  }
}

// ===============================
// ADMIN AUTH
// ===============================

function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.admin_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not logged in"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.username !== ADMIN_USERNAME) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin"
      });
    }

    req.admin = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired"
    });
  }
}

// ===============================
// FILE UPLOAD
// ===============================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "apk") {
      cb(null, APK_DIR);
    } else if (file.fieldname === "icon") {
      cb(null, ICON_DIR);
    } else {
      cb(new Error("Invalid upload field"));
    }
  },

  filename: function (req, file, cb) {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const filename =
      Date.now() +
      "-" +
      crypto.randomUUID() +
      extension;

    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 500 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    if (file.fieldname === "apk") {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      if (extension !== ".apk") {
        return cb(
          new Error("Only APK files are allowed")
        );
      }

      return cb(null, true);
    }

    if (file.fieldname === "icon") {
      const allowed = [
        "image/png",
        "image/jpeg",
        "image/webp"
      ];

      if (!allowed.includes(file.mimetype)) {
        return cb(
          new Error("Only PNG, JPG or WEBP icons are allowed")
        );
      }

      return cb(null, true);
    }

    cb(new Error("Invalid upload field"));
  }
});

// ===============================
// ADMIN LOGIN
// ===============================

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (
    username !== ADMIN_USERNAME ||
    password !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      message: "Wrong username or password"
    });
  }

  const token = jwt.sign(
    {
      username: ADMIN_USERNAME
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message: "Login successful"
  });
});

// ===============================
// ADMIN LOGOUT
// ===============================

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_token");

  res.json({
    success: true,
    message: "Logged out"
  });
});

// ===============================
// CHECK ADMIN LOGIN
// ===============================

app.get(
  "/api/admin/me",
  authMiddleware,
  (req, res) => {
    res.json({
      success: true,
      username: req.admin.username
    });
  }
);

// ===============================
// PUBLIC APK LIST
// ===============================

app.get("/api/apps", (req, res) => {
  const apps = readApps();

  const publicApps = apps
    .filter(app => app.published !== false)
    .map(app => ({
      id: app.id,
      name: app.name,
      version: app.version,
      category: app.category,
      description: app.description,
      icon: app.icon,
      downloads: app.downloads || 0,
      downloadUrl:
        `/api/apps/${encodeURIComponent(app.id)}/download`,
      createdAt: app.createdAt
    }));

  res.json(publicApps);
});

// ===============================
// DOWNLOAD APK
// ===============================

app.get(
  "/api/apps/:id/download",
  (req, res) => {
    const apps = readApps();

    const appData = apps.find(
      app => app.id === req.params.id
    );

    if (!appData) {
      return res.status(404).send("APK not found");
    }

    if (!appData.apkFile) {
      return res.status(404).send("APK file missing");
    }

    const apkPath = path.join(
      APK_DIR,
      path.basename(appData.apkFile)
    );

    if (!fs.existsSync(apkPath)) {
      return res.status(404).send("APK file not found");
    }

    const downloadName =
      appData.apkOriginalName ||
      `${appData.name || "application"}.apk`;

    res.download(
      apkPath,
      downloadName,
      error => {
        if (!error) {
          const currentApps = readApps();

          const index = currentApps.findIndex(
            app => app.id === appData.id
          );

          if (index !== -1) {
            currentApps[index].downloads =
              (currentApps[index].downloads || 0) + 1;

            writeApps(currentApps);
          }
        }
      }
    );
  }
);

// ===============================
// ADMIN - GET ALL APPS
// ===============================

app.get(
  "/api/admin/apps",
  authMiddleware,
  (req, res) => {
    const apps = readApps();

    res.json({
      success: true,
      apps
    });
  }
);

// ===============================
// ADMIN - ADD APK
// ===============================

app.post(
  "/api/admin/apps",
  authMiddleware,
  upload.fields([
    {
      name: "apk",
      maxCount: 1
    },
    {
      name: "icon",
      maxCount: 1
    }
  ]),
  (req, res) => {
    try {
      const {
        name,
        version,
        category,
        description
      } = req.body;

      if (!name || !version || !category) {
        if (req.files?.apk?.[0]) {
          deleteFile(req.files.apk[0].path);
        }

        if (req.files?.icon?.[0]) {
          deleteFile(req.files.icon[0].path);
        }

        return res.status(400).json({
          success: false,
          message:
            "Name, version and category are required"
        });
      }

      const apkFile =
        req.files?.apk?.[0];

      const iconFile =
        req.files?.icon?.[0];

      if (!apkFile) {
        return res.status(400).json({
          success: false,
          message: "APK file is required"
        });
      }

      const apps = readApps();

      const newApp = {
        id: crypto.randomUUID(),

        name: String(name).trim(),

        version: String(version).trim(),

        category: String(category).trim(),

        description:
          String(description || "").trim(),

        icon: iconFile
          ? `/uploads/icons/${iconFile.filename}`
          : null,

        apkFile: apkFile.filename,

        apkOriginalName:
          apkFile.originalname,

        downloads: 0,

        published: true,

        createdAt:
          new Date().toISOString()
      };

      apps.unshift(newApp);

      writeApps(apps);

      res.status(201).json({
        success: true,
        message: "APK added successfully",
        app: {
          id: newApp.id,
          name: newApp.name,
          version: newApp.version,
          category: newApp.category,
          description: newApp.description,
          icon: newApp.icon,
          downloads: 0,
          downloadUrl:
            `/api/apps/${encodeURIComponent(
              newApp.id
            )}/download`
        }
      });
    } catch (error) {
      console.error("Add APK error:", error);

      res.status(500).json({
        success: false,
        message: "Could not add APK"
      });
    }
  }
);

// ===============================
// ADMIN - UPDATE APK
// ===============================

app.patch(
  "/api/admin/apps/:id",
  authMiddleware,
  upload.fields([
    {
      name: "apk",
      maxCount: 1
    },
    {
      name: "icon",
      maxCount: 1
    }
  ]),
  (req, res) => {
    try {
      const apps = readApps();

      const index = apps.findIndex(
        app => app.id === req.params.id
      );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: "APK not found"
        });
      }

      const appData = apps[index];

      if (req.body.name !== undefined) {
        appData.name =
          String(req.body.name).trim();
      }

      if (req.body.version !== undefined) {
        appData.version =
          String(req.body.version).trim();
      }

      if (req.body.category !== undefined) {
        appData.category =
          String(req.body.category).trim();
      }

      if (req.body.description !== undefined) {
        appData.description =
          String(req.body.description).trim();
      }

      if (req.body.published !== undefined) {
        appData.published =
          req.body.published === "true" ||
          req.body.published === true;
      }

      const newApk =
        req.files?.apk?.[0];

      const newIcon =
        req.files?.icon?.[0];

      if (newApk) {
        const oldApkPath = path.join(
          APK_DIR,
          path.basename(appData.apkFile || "")
        );

        deleteFile(oldApkPath);

        appData.apkFile =
          newApk.filename;

        appData.apkOriginalName =
          newApk.originalname;
      }

      if (newIcon) {
        if (appData.icon) {
          const oldIconName =
            path.basename(appData.icon);

          deleteFile(
            path.join(
              ICON_DIR,
              oldIconName
            )
          );
        }

        appData.icon =
          `/uploads/icons/${newIcon.filename}`;
      }

      apps[index] = appData;

      writeApps(apps);

      res.json({
        success: true,
        message: "APK updated successfully",
        app: appData
      });
    } catch (error) {
      console.error(
        "Update APK error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Could not update APK"
      });
    }
  }
);

// ===============================
// ADMIN - DELETE APK
// ===============================

app.delete(
  "/api/admin/apps/:id",
  authMiddleware,
  (req, res) => {
    try {
      const apps = readApps();

      const index = apps.findIndex(
        app => app.id === req.params.id
      );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: "APK not found"
        });
      }

      const appData = apps[index];

      if (appData.apkFile) {
        deleteFile(
          path.join(
            APK_DIR,
            path.basename(appData.apkFile)
          )
        );
      }

      if (appData.icon) {
        deleteFile(
          path.join(
            ICON_DIR,
            path.basename(appData.icon)
          )
        );
      }

      apps.splice(index, 1);

      writeApps(apps);

      res.json({
        success: true,
        message: "APK deleted successfully"
      });
    } catch (error) {
      console.error(
        "Delete APK error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Could not delete APK"
      });
    }
  }
);

// ===============================
// ICON FILES
// ===============================

app.use(
  "/uploads/icons",
  express.static(ICON_DIR)
);

// ===============================
// ADMIN PANEL
// ===============================

app.use(
  "/admin",
  express.static(
    path.join(__dirname, "admin")
  )
);

// ===============================
// MAIN WEBSITE
// ===============================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ===============================
// ERROR HANDLER
// ===============================

app.use((error, req, res, next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File too large. Maximum size is 500MB."
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return res.status(400).json({
    success: false,
    message:
      error.message || "Something went wrong"
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(
    `Kiran Jadhav APK Store running on port ${PORT}`
  );
});
