import React, { useState } from "react";
import { 
  Database, Users, Wrench, Plus, Trash2, HelpCircle, Sparkles, RefreshCw, CheckCircle2, Play, AlertCircle
} from "lucide-react";
import { Settings, SettingBOM } from "../types";

interface SetupWizardProps {
  settings: Settings;
  onSaveSettings: (newSettings: Settings) => Promise<void>;
  onSync: (mode: "pull" | "push") => Promise<{ success: boolean; message?: string; error?: string }>;
}

export default function SetupWizard({ settings, onSaveSettings, onSync }: SetupWizardProps) {
  // Setup state
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl || "");
  const [engineers, setEngineers] = useState<string[]>(settings.engineers || []);
  const [workers, setWorkers] = useState<string[]>(settings.workers || []);
  const [bom, setBom] = useState<SettingBOM[]>(settings.bom || []);

  // Form states
  const [newEngineer, setNewEngineer] = useState("");
  const [newWorker, setNewWorker] = useState("");
  
  // New BOM form
  const [newLoc, setNewLoc] = useState("");
  const [newMachine, setNewMachine] = useState("");
  const [newEquipments, setNewEquipments] = useState("");

  // Sync / Action statuses
  const [isPulling, setIsPulling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pullMessage, setPullMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Quick list calculations
  const uniqueLocations = Array.from(new Set(bom.map((b) => b.location)));

  // Actions
  const handleAddEngineer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEngineer.trim()) return;
    if (engineers.includes(newEngineer.trim())) return;
    setEngineers([...engineers, newEngineer.trim()]);
    setNewEngineer("");
  };

  const handleRemoveEngineer = (index: number) => {
    setEngineers(engineers.filter((_, i) => i !== index));
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.trim()) return;
    if (workers.includes(newWorker.trim())) return;
    setWorkers([...workers, newWorker.trim()]);
    setNewWorker("");
  };

  const handleRemoveWorker = (index: number) => {
    setWorkers(workers.filter((_, i) => i !== index));
  };

  const handleAddBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoc.trim() || !newMachine.trim() || !newEquipments.trim()) return;
    
    const parts = newEquipments
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newNode: SettingBOM = {
      location: newLoc.trim(),
      machineName: newMachine.trim(),
      equipments: parts
    };

    setBom([...bom, newNode]);
    setNewLoc("");
    setNewMachine("");
    setNewEquipments("");
  };

  const handleRemoveBOM = (index: number) => {
    setBom(bom.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all template configurations to start completely fresh?")) {
      setEngineers([]);
      setWorkers([]);
      setBom([]);
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Restore default template configurations? (Amit Sen, Dipankar, Piercer, Sizing Mill, etc.)")) {
      setEngineers([
        "Amit Sen (Shift Eng)",
        "Pulak Roy (Maintenance Eng)",
        "Joydeep Das (Senior Eng)",
        "Dipankar Bose (Engineer)"
      ]);
      setWorkers(["Dipankar", "Pranav", "Subrata", "Joydeb", "Bikram", "Uttam"]);
      setBom([
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
        }
      ]);
    }
  };

  // Pull existing Sheet data to populate wizard instantly
  const handlePullFromSheet = async () => {
    if (!appsScriptUrl.trim()) {
      setPullMessage({ type: "error", text: "Please enter your Apps Script Web App URL first." });
      return;
    }
    
    setIsPulling(true);
    setPullMessage(null);
    setSetupError(null);

    try {
      // First save current draft Apps Script URL to backend settings so /api/sync can fetch it
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appsScriptUrl, isConfigured: false, bom: [], engineers: [], workers: [] })
      });

      const res = await onSync("pull");
      if (res.success) {
        // Fetch fresh settings
        const fetchRes = await fetch("/api/settings");
        if (fetchRes.ok) {
          const fresh = await fetchRes.json();
          if (fresh.engineers && fresh.engineers.length > 0) setEngineers(fresh.engineers);
          if (fresh.workers && fresh.workers.length > 0) setWorkers(fresh.workers);
          if (fresh.bom && fresh.bom.length > 0) setBom(fresh.bom);
        }
        setPullMessage({
          type: "success",
          text: "Sync Success! Successfully loaded existing roster and BOM configurations from Google Sheets."
        });
      } else {
        setPullMessage({
          type: "error",
          text: res.error || "Failed to sync. Please ensure Google Sheets contains the columns and your macro is deployed correctly."
        });
      }
    } catch (err: any) {
      setPullMessage({
        type: "error",
        text: err.message || "Network error. Please verify your Web App URL has CORS enabled and is shared with Anyone."
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleLaunchSystem = async () => {
    if (!appsScriptUrl.trim()) {
      setSetupError("A Google Apps Script Web App URL is required to sync your data.");
      return;
    }
    if (bom.length === 0) {
      setSetupError("Please register at least one Bill of Materials (BOM) machine node to initialize your workspace.");
      return;
    }
    if (engineers.length === 0) {
      setSetupError("Please add at least one shift engineer to complete initial setup.");
      return;
    }
    if (workers.length === 0) {
      setSetupError("Please register at least one maintenance technician/worker.");
      return;
    }

    setIsSaving(true);
    setSetupError(null);

    const finalSettings: Settings = {
      appsScriptUrl: appsScriptUrl.trim(),
      bom,
      engineers,
      workers,
      isConfigured: true
    };

    try {
      // Save settings to backend
      await onSaveSettings(finalSettings);
      
      // Push first clean push to populate Google Sheet with user's settings, while avoiding any default mock sync
      await onSync("push");

      // Reload page to enter dashboard smoothly
      window.location.reload();
    } catch (err: any) {
      setSetupError(err.message || "Failed to initialize settings. Please check your network connection.");
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" id="setup-wizard-canvas">
      {/* Visual Header */}
      <div className="bg-slate-950 border-b border-slate-800 py-6 px-4 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                Action Required
              </span>
              <h1 className="text-lg font-bold text-slate-50 tracking-wide font-display">
                Lalbaba Engineering Ltd.
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Maintenance Management & Shift Handover System &bull; Initial Setup Wizard
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRestoreDefaults}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 text-[11px] font-bold transition cursor-pointer"
            >
              Load Templates
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-lg border border-red-900/30 hover:border-red-800/50 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-[11px] font-bold transition cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:py-8 space-y-8 overflow-y-auto">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 md:p-6 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-50">Configure Your New Workspace</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                By completing this setup, you define your local team and machine lists before they are pushed to your Google Sheets. This prevents syncing default placeholder values, keeping your spreadsheet clean!
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Google Sheet Link */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 md:p-6 shadow-md space-y-4" id="setup-section-sync">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2.5 border-b border-slate-800/80 font-display">
            <Database className="text-blue-400 w-4 h-4" />
            1. Google Sheet & Drive Connection
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Apps Script Web App URL
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100 font-mono"
                />
                <button
                  type="button"
                  onClick={handlePullFromSheet}
                  disabled={isPulling || !appsScriptUrl}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? "animate-spin text-amber-400" : ""}`} />
                  Test & Import configurations
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                We've filled in your default deployment link! If your sheet already has customized Engineers, Workers, or BOM nodes, click <span className="text-amber-400 font-bold">"Test & Import"</span> to load them instantly.
              </p>
            </div>

            {pullMessage && (
              <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                pullMessage.type === "success" 
                  ? "bg-emerald-950/20 text-emerald-300 border-emerald-900/40" 
                  : "bg-red-950/20 text-red-300 border-red-900/40"
              }`}>
                {pullMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <span>{pullMessage.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Team Roster */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="setup-section-roster">
          {/* Engineers Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Shift Engineers
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full font-mono">
                {engineers.length} Registered
              </span>
            </h3>

            {/* List */}
            <div className="h-44 overflow-y-auto space-y-1.5 pr-1">
              {engineers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No engineers registered. Add names below.
                </div>
              ) : (
                engineers.map((eng, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-1.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs font-medium text-slate-200">
                    <span>{eng}</span>
                    <button 
                      onClick={() => handleRemoveEngineer(idx)}
                      className="text-slate-500 hover:text-red-400 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddEngineer} className="flex gap-2 pt-2 border-t border-slate-850">
              <input
                type="text"
                placeholder="e.g. Pulak Roy (Shift Eng)"
                value={newEngineer}
                onChange={(e) => setNewEngineer(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Workers Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Maintenance Technicians / Workers
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full font-mono">
                {workers.length} Registered
              </span>
            </h3>

            {/* List */}
            <div className="h-44 overflow-y-auto space-y-1.5 pr-1">
              {workers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No workers registered. Add names below.
                </div>
              ) : (
                workers.map((worker, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-1.5 bg-slate-900/60 rounded-lg border border-slate-800 text-xs font-medium text-slate-200">
                    <span>{worker}</span>
                    <button 
                      onClick={() => handleRemoveWorker(idx)}
                      className="text-slate-500 hover:text-red-400 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddWorker} className="flex gap-2 pt-2 border-t border-slate-850">
              <input
                type="text"
                placeholder="e.g. Dipankar"
                value={newWorker}
                onChange={(e) => setNewWorker(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-100"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Section 3: BOM Taxonomy Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 md:p-6 shadow-md space-y-5" id="setup-section-bom">
          <h3 className="text-sm font-bold text-slate-100 pb-2 border-b border-slate-800 flex justify-between items-center font-display">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-4.5 h-4.5 text-blue-400" />
              3. Bill of Materials (BOM) Machine & Spares Taxonomy
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-800 font-mono">
              {bom.length} Nodes
            </span>
          </h3>

          {/* Form to add BOM Node */}
          <form onSubmit={handleAddBOM} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Add Machine-to-Equipment Node
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Location */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  Location Area
                </label>
                <input
                  type="text"
                  list="setup-locations"
                  placeholder="e.g. 75 Mill"
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg focus:outline-none text-slate-100"
                />
                <datalist id="setup-locations">
                  {uniqueLocations.map((loc) => <option key={loc} value={loc} />)}
                </datalist>
              </div>

              {/* Machine */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  Machine Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Piercer"
                  value={newMachine}
                  onChange={(e) => setNewMachine(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg focus:outline-none text-slate-100"
                />
              </div>

              {/* Equipments list */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                  Spare Parts (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roll, Bearing, Seal"
                  value={newEquipments}
                  onChange={(e) => setNewEquipments(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg focus:outline-none text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Machine Node
              </button>
            </div>
          </form>

          {/* BOM Node list */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {bom.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No BOM machines registered. Create your machine parts list using the form above.
              </div>
            ) : (
              bom.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">
                      {item.location}
                    </span>
                    <h4 className="font-bold text-slate-100 text-xs">{item.machineName}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.equipments.map((eq, eidx) => (
                        <span key={eidx} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-[9.5px] rounded border border-slate-750">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBOM(idx)}
                    className="text-slate-500 hover:text-red-400 p-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {setupError && (
          <div className="p-4 rounded-xl border border-red-900 bg-red-950/20 text-red-300 text-xs font-semibold flex items-start gap-2.5 max-w-2xl mx-auto">
            <AlertCircle className="w-4.5 h-4.5 text-red-400 mt-0.5 shrink-0" />
            <span>{setupError}</span>
          </div>
        )}

        {/* Launch Button Section */}
        <div className="text-center pt-4 pb-12 max-w-xl mx-auto space-y-3">
          <button
            type="button"
            onClick={handleLaunchSystem}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                Initializing Lalbaba Workspace...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Save Configurations & Launch System
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            By clicking Launch, this application's database file will be marked as configured, and a synchronized initialization will map this taxonomy directly to your Google Sheet.
          </p>
        </div>
      </div>
    </div>
  );
}
