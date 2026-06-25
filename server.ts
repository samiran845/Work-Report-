import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Settings, PlanWork, ExtraWork } from "./src/types";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");

// Default initial settings for Lalbaba Engineering Ltd
const DEFAULT_SETTINGS: Settings = {
  appsScriptUrl: process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxWwXIIDtwctRnIupf3CmLks9Pov1ihXiiGmrrD59d-NViKLZFs7go7gEJGzux2tzb7/exec",
  isConfigured: false,
  bom: [
    {
      location: "75 Mill",
      machineName: "Piercer",
      equipments: ["Roll", "Bearing", "Seal", "Hydraulic Cylinder", "Guide Shoe"]
    },
    {
      location: "75 Mill",
      machineName: "Lifter",
      equipments: ["Tie Rod", "Bearing", "Roll", "Cylinder", "Proximity Sensor"]
    },
    {
      location: "75 Mill",
      machineName: "Sizing Mill",
      equipments: ["Rollers", "Drive Shaft", "Gearbox", "Coupling"]
    },
    {
      location: "75 Mill",
      machineName: "TRG Machine",
      equipments: ["Water Pump", "Gland Packing", "Impeller", "Suction Valve"]
    },
    {
      location: "SMS Area",
      machineName: "Continuous Caster",
      equipments: ["Mold", "Segment Roller", "Spray Nozzle", "Tundish Car"]
    },
    {
      location: "SMS Area",
      machineName: "EAF Furnace",
      equipments: ["Electrode Arm", "Water Cooled Panel", "Tilting Cylinder"]
    }
  ],
  engineers: [
    "Amit Sen (Shift Eng)",
    "Pulak Roy (Maintenance Eng)",
    "Joydeep Das (Senior Eng)",
    "Dipankar Bose (Engineer)"
  ],
  workers: [
    "Dipankar",
    "Pranav",
    "Subrata",
    "Joydeb",
    "Bikram",
    "Uttam"
  ]
};

const DEFAULT_PLAN_WORK: PlanWork[] = [
  {
    id: "PLN001",
    planCatagory: "daily",
    planDate: "2026-06-24",
    location: "75 Mill",
    machineName: "TRG Machine",
    equipment: "Water Pump",
    taskDetails: "Water Pump gland leakage need to fix and gland packing replacement",
    requiredSpareParts: "Gland rope graphite 12mm - 1 meter",
    workStatus: "Pending",
    plannedResponsibilities: ["Dipankar"],
    workNote: "",
    images: [],
    dateNote: "",
    doneDate: ""
  },
  {
    id: "PLN002",
    planCatagory: "Shutdown",
    planDate: "2026-06-24",
    location: "75 Mill",
    machineName: "Piercer",
    equipment: "Roll",
    taskDetails: "Flat roller maintenance and solid round bar cut 80 dia replacement",
    requiredSpareParts: "Solid round bar 80 dia - 0.5 meter",
    workStatus: "Running",
    plannedResponsibilities: ["Pranav"],
    workNote: "Machining in progress",
    images: [],
    dateNote: "",
    doneDate: ""
  }
];

const DEFAULT_EXTRA_WORK: ExtraWork[] = [
  {
    id: "EXT001",
    date: "2026-06-24",
    machineName: "Sizing Mill",
    taskDetails: "Additional cleaning of WHF power pack and TRG sizing power pack",
    engineer: "Amit Sen (Shift Eng)",
    status: "Done",
    workNote: "Completed successfully during morning shift",
    dateNote: "",
    doneDate: "2026-06-24"
  }
];

// Helper to load and save database
function loadDB(): { settings: Settings; planWork: PlanWork[]; extraWork: ExtraWork[] } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(content);
      
      const settings = db.settings || { ...DEFAULT_SETTINGS };
      
      // Ensure appsScriptUrl has the default value if empty
      if (!settings.appsScriptUrl) {
        settings.appsScriptUrl = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxWwXIIDtwctRnIupf3CmLks9Pov1ihXiiGmrrD59d-NViKLZFs7go7gEJGzux2tzb7/exec";
      }
      
      // If isConfigured is not defined in the loaded database, default to true to preserve state for old users
      if (settings.isConfigured === undefined) {
        settings.isConfigured = true;
      }

      return {
        settings,
        planWork: db.planWork || DEFAULT_PLAN_WORK,
        extraWork: db.extraWork || DEFAULT_EXTRA_WORK,
      };
    }
  } catch (error) {
    console.error("Error reading database file, using defaults", error);
  }
  return {
    settings: { ...DEFAULT_SETTINGS },
    planWork: DEFAULT_PLAN_WORK,
    extraWork: DEFAULT_EXTRA_WORK,
  };
}

function saveDB(db: { settings: Settings; planWork: PlanWork[]; extraWork: ExtraWork[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving database file", error);
  }
}

// Ordinal helper for Carry Forward messages
const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Auto Daily Plan Date Change logic
function runAutoCarryForward(planWork: PlanWork[], extraWork: ExtraWork[], todayStr: string): { planWork: PlanWork[]; extraWork: ExtraWork[]; changed: boolean } {
  let changed = false;

  // Process Plan Work
  planWork = planWork.map((job) => {
    if (job.workStatus !== "Done" && job.planDate < todayStr) {
      changed = true;
      // Count existing carry forward matches
      const matches = job.dateNote.match(/Carried Forward from:/g);
      const count = matches ? matches.length + 1 : 1;
      const newPhrase = `${getOrdinal(count)} Carried Forward from: ${job.planDate}`;
      
      const newDateNote = job.dateNote 
        ? `${job.dateNote}, ${newPhrase}`
        : newPhrase;

      return {
        ...job,
        planDate: todayStr,
        dateNote: newDateNote,
      };
    }
    return job;
  });

  // Process Extra Work
  extraWork = extraWork.map((job) => {
    if (job.status !== "Done" && job.date < todayStr) {
      changed = true;
      const matches = job.dateNote.match(/Carried Forward from:/g);
      const count = matches ? matches.length + 1 : 1;
      const newPhrase = `${getOrdinal(count)} Carried Forward from: ${job.date}`;
      
      const newDateNote = job.dateNote 
        ? `${job.dateNote}, ${newPhrase}`
        : newPhrase;

      return {
        ...job,
        date: todayStr,
        dateNote: newDateNote,
      };
    }
    return job;
  });

  return { planWork, extraWork, changed };
}

// Helper to push to Google Apps Script if URL is configured
async function syncToGoogleAppsScript(settings: Settings, planWork: PlanWork[], extraWork: ExtraWork[]) {
  if (!settings.appsScriptUrl || settings.isConfigured === false) return;
  try {
    const response = await fetch(settings.appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "push",
        data: {
          settings,
          planWork,
          extraWork
        }
      })
    });
    const result = await response.json();
    console.log("Background synced to Google Apps Script successfully:", result);
  } catch (error) {
    console.error("Failed background syncing to Google Apps Script:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes
  
  // GET settings
  app.get("/api/settings", (req, res) => {
    const db = loadDB();
    res.json(db.settings);
  });

  // POST settings
  app.post("/api/settings", async (req, res) => {
    const newSettings: Settings = req.body;
    const db = loadDB();
    db.settings = { ...db.settings, ...newSettings };
    saveDB(db);
    
    // Attempt background sync
    await syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);
    
    res.json({ success: true, settings: db.settings });
  });

  // GET config script-url
  app.get("/api/config/script-url", (req, res) => {
    res.json({ url: process.env.APPS_SCRIPT_URL || "" });
  });

  // POST upload image
  app.post("/api/upload-image", async (req, res) => {
    const { base64, fileName } = req.body;
    const db = loadDB();
    if (!base64 || !fileName) {
      return res.status(400).json({ error: "Missing base64 data or fileName" });
    }

    if (!db.settings.appsScriptUrl || db.settings.isConfigured === false) {
      console.log("No Apps Script URL configured or setup not finished, using local fallback");
      return res.json({ success: true, url: base64, fallback: true });
    }

    try {
      console.log(`Forwarding image upload to Google Apps Script. Name: ${fileName}`);
      const response = await fetch(db.settings.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadImage",
          base64: base64,
          fileName: fileName
        })
      });
      const result = await response.json();
      if (result && result.success && result.url) {
        return res.json({ success: true, url: result.url });
      } else {
        throw new Error(result.error || "Failed to upload image to Google Drive via script");
      }
    } catch (err: any) {
      console.error("Failed to upload image via Apps Script, keeping local base64 fallback:", err);
      return res.json({ success: true, url: base64, fallback: true });
    }
  });

  // GET plan-work (triggers auto carry forward check based on local current time)
  app.get("/api/plan-work", (req, res) => {
    const db = loadDB();
    
    // Get query param for client's today date or use server date
    // We expect client to send their today date string (YYYY-MM-DD)
    const todayStr = (req.query.today as string) || new Date().toISOString().split("T")[0];
    
    const { planWork, extraWork, changed } = runAutoCarryForward(db.planWork, db.extraWork, todayStr);
    
    if (changed) {
      db.planWork = planWork;
      db.extraWork = extraWork;
      saveDB(db);
      syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);
    }

    res.json(db.planWork);
  });

  // POST plan-work bulk
  app.post("/api/plan-work/bulk", async (req, res) => {
    const newJobs: PlanWork[] = req.body;
    const db = loadDB();
    
    // Make sure we generate IDs if missing
    let currentMax = 0;
    db.planWork.forEach((job) => {
      const num = parseInt(job.id.replace(/\D/g, ""));
      if (!isNaN(num) && num > currentMax) currentMax = num;
    });

    const populatedJobs = newJobs.map((job, idx) => {
      const idNum = currentMax + idx + 1;
      const paddedId = String(idNum).padStart(3, "0");
      return {
        ...job,
        id: job.id || `PLN${paddedId}`,
        workStatus: job.workStatus || "Pending",
        images: job.images || [],
        dateNote: job.dateNote || "",
        doneDate: job.workStatus === "Done" ? (job.doneDate || new Date().toISOString().split("T")[0]) : ""
      };
    });

    db.planWork = [...db.planWork, ...populatedJobs];
    saveDB(db);
    
    await syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);
    
    res.json({ success: true, count: populatedJobs.length, items: populatedJobs });
  });

  // PUT single plan-work (update)
  app.put("/api/plan-work/:id", async (req, res) => {
    const id = req.params.id;
    const updatedJob: Partial<PlanWork> = req.body;
    const db = loadDB();
    
    let index = db.planWork.findIndex((job) => job.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Plan work job not found" });
    }

    const original = db.planWork[index];
    const finalJob = { ...original, ...updatedJob };

    // Handle doneDate setting automatically if status changes to Done
    if (finalJob.workStatus === "Done" && original.workStatus !== "Done") {
      finalJob.doneDate = finalJob.doneDate || new Date().toISOString().split("T")[0];
    } else if (finalJob.workStatus !== "Done") {
      finalJob.doneDate = "";
    }

    db.planWork[index] = finalJob;
    saveDB(db);

    await syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);

    res.json({ success: true, item: finalJob });
  });

  // GET extra-work
  app.get("/api/extra-work", (req, res) => {
    const db = loadDB();
    const todayStr = (req.query.today as string) || new Date().toISOString().split("T")[0];
    
    const { planWork, extraWork, changed } = runAutoCarryForward(db.planWork, db.extraWork, todayStr);
    
    if (changed) {
      db.planWork = planWork;
      db.extraWork = extraWork;
      saveDB(db);
      syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);
    }

    res.json(db.extraWork);
  });

  // POST extra-work bulk
  app.post("/api/extra-work/bulk", async (req, res) => {
    const newJobs: ExtraWork[] = req.body;
    const db = loadDB();
    
    let currentMax = 0;
    db.extraWork.forEach((job) => {
      const num = parseInt(job.id.replace(/\D/g, ""));
      if (!isNaN(num) && num > currentMax) currentMax = num;
    });

    const populatedJobs = newJobs.map((job, idx) => {
      const idNum = currentMax + idx + 1;
      const paddedId = String(idNum).padStart(3, "0");
      return {
        ...job,
        id: job.id || `EXT${paddedId}`,
        status: job.status || "Pending",
        dateNote: job.dateNote || "",
        doneDate: job.status === "Done" ? (job.doneDate || new Date().toISOString().split("T")[0]) : ""
      };
    });

    db.extraWork = [...db.extraWork, ...populatedJobs];
    saveDB(db);
    
    await syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);
    
    res.json({ success: true, count: populatedJobs.length, items: populatedJobs });
  });

  // PUT single extra-work
  app.put("/api/extra-work/:id", async (req, res) => {
    const id = req.params.id;
    const updatedJob: Partial<ExtraWork> = req.body;
    const db = loadDB();
    
    let index = db.extraWork.findIndex((job) => job.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Extra work job not found" });
    }

    const original = db.extraWork[index];
    const finalJob = { ...original, ...updatedJob };

    if (finalJob.status === "Done" && original.status !== "Done") {
      finalJob.doneDate = finalJob.doneDate || new Date().toISOString().split("T")[0];
    } else if (finalJob.status !== "Done") {
      finalJob.doneDate = "";
    }

    db.extraWork[index] = finalJob;
    saveDB(db);

    await syncToGoogleAppsScript(db.settings, db.planWork, db.extraWork);

    res.json({ success: true, item: finalJob });
  });

  // POST sync - bidirectional sync / pull from Google Apps Script
  app.post("/api/sync", async (req, res) => {
    const db = loadDB();
    if (!db.settings.appsScriptUrl) {
      return res.status(400).json({ error: "Google Apps Script URL is not configured in Settings" });
    }

    const { mode } = req.body; // "pull" or "push"

    try {
      if (mode === "push") {
        // Push full state
        const response = await fetch(db.settings.appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "push",
            data: {
              settings: db.settings,
              planWork: db.planWork,
              extraWork: db.extraWork
            }
          })
        });
        const result = await response.json();
        return res.json({ success: true, message: "Pushed successfully to Google Sheets", result });
      } else {
        // Pull full state
        const response = await fetch(db.settings.appsScriptUrl + "?action=pull");
        const result = await response.json();
        
        if (result && result.success && result.data) {
          const fetchedData = result.data;
          
          // Merge fetched data gracefully
          // Overwrite local db with sheet data if sheets are populated
          if (fetchedData.settings) {
            db.settings = {
              ...db.settings,
              ...fetchedData.settings,
              // Keep local Apps Script URL so we don't wipe it out if it wasn't saved in sheets
              appsScriptUrl: db.settings.appsScriptUrl 
            };
          }
          if (fetchedData.planWork && fetchedData.planWork.length > 0) {
            db.planWork = fetchedData.planWork;
          }
          if (fetchedData.extraWork && fetchedData.extraWork.length > 0) {
            db.extraWork = fetchedData.extraWork;
          }
          
          saveDB(db);
          return res.json({ success: true, message: "Pulled and merged successfully from Google Sheets", settings: db.settings, planWork: db.planWork, extraWork: db.extraWork });
        } else {
          return res.status(500).json({ error: "Invalid sync payload returned from Google Apps Script Web App", raw: result });
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      return res.status(500).json({ error: error.message || "Failed to communicate with Google Apps Script Web App. Check CORS and make sure script is published as 'Anyone' can access." });
    }
  });

  // Serve Vite or static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
