import React, { useState } from "react";
import { 
  Settings, Plus, Trash2, Save, RefreshCw, CheckCircle, AlertTriangle, Database, HelpCircle
} from "lucide-react";
import { Settings as SettingsType, SettingBOM } from "../types";

interface SettingsTabProps {
  settings: SettingsType;
  onSaveSettings: (newSettings: SettingsType) => Promise<void>;
  onSync: (mode: "pull" | "push") => Promise<{ success: boolean; message?: string; error?: string }>;
  isSyncing: boolean;
}

export default function SettingsTab({ settings, onSaveSettings, onSync, isSyncing }: SettingsTabProps) {
  // Local state for settings edit
  const [engineers, setEngineers] = useState<string[]>(settings.engineers || []);
  const [workers, setWorkers] = useState<string[]>(settings.workers || []);
  const [bom, setBom] = useState<SettingBOM[]>(settings.bom || []);

  // Form states for adding items
  const [newEngineer, setNewEngineer] = useState("");
  const [newWorker, setNewWorker] = useState("");
  
  // BOM Form states
  const [newLoc, setNewLoc] = useState("");
  const [newMachine, setNewMachine] = useState("");
  const [newEquipments, setNewEquipments] = useState("");

  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState("");

  // Fetch URL from backend config
  React.useEffect(() => {
    fetch("/api/config/script-url")
      .then(res => res.json())
      .then(data => setAppsScriptUrl(data.url))
      .catch(err => console.error("Failed to fetch script URL", err));
  }, []);

  // Quick select helper values for user's convenience
  const locationsList = Array.from(new Set(bom.map((b) => b.location)));

  // Save Settings
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        appsScriptUrl: settings.appsScriptUrl, // Keep hardcoded URL
        engineers: engineers.filter((e) => e.trim() !== ""),
        workers: workers.filter((w) => w.trim() !== ""),
        bom
      });
      setSyncStatus({ type: "success", msg: "Settings saved successfully!" });
    } catch (err: any) {
      setSyncStatus({ type: "error", msg: err.message || "Failed to save settings" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSyncStatus({ type: null, msg: "" }), 5000);
    }
  };

  // Sync operations
  const handleSyncOperation = async (mode: "pull" | "push") => {
    setSyncStatus({ type: null, msg: "" });
    const result = await onSync(mode);
    if (result.success) {
      setSyncStatus({ 
        type: "success", 
        msg: result.message || `${mode === "pull" ? "Pulled" : "Pushed"} completed successfully.` 
      });
      // If we pulled, let's refresh local state fields
      if (mode === "pull") {
        window.location.reload(); // Quick refresh to repopulate state
      }
    } else {
      setSyncStatus({ 
        type: "error", 
        msg: result.error || "Communication failed. Check URL, internet, or Spreadsheet setup." 
      });
    }
    setTimeout(() => setSyncStatus({ type: null, msg: "" }), 8000);
  };

  const handleAddEngineer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEngineer.trim()) return;
    if (engineers.includes(newEngineer.trim())) {
      alert("Engineer already exists");
      return;
    }
    setEngineers([...engineers, newEngineer.trim()]);
    setNewEngineer("");
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.trim()) return;
    if (workers.includes(newWorker.trim())) {
      alert("Worker already exists");
      return;
    }
    setWorkers([...workers, newWorker.trim()]);
    setNewWorker("");
  };

  const handleRemoveEngineer = (index: number) => {
    setEngineers(engineers.filter((_, i) => i !== index));
  };

  const handleRemoveWorker = (index: number) => {
    setWorkers(workers.filter((_, i) => i !== index));
  };

  // BOM Actions
  const handleAddBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoc.trim() || !newMachine.trim() || !newEquipments.trim()) {
      alert("Please fill out all fields: Location, Machine, and Equipments");
      return;
    }
    
    // Parse equipments from comma separated list
    const parsedEquip = newEquipments
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    // Check if machine already exists under location
    const exists = bom.some(
      (b) => b.location.toLowerCase() === newLoc.trim().toLowerCase() && 
             b.machineName.toLowerCase() === newMachine.trim().toLowerCase()
    );

    if (exists) {
      alert("This machine is already registered for this location.");
      return;
    }

    const newBOMItem: SettingBOM = {
      location: newLoc.trim(),
      machineName: newMachine.trim(),
      equipments: parsedEquip
    };

    setBom([...bom, newBOMItem]);
    setNewMachine("");
    setNewEquipments("");
  };

  const handleRemoveBOM = (index: number) => {
    if (confirm("Are you sure you want to remove this BOM entry?")) {
      setBom(bom.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8" id="settings-view-container">
      {/* Overview Intro */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display">
            <Settings className="text-blue-600 w-5 h-5" />
            System Control & Bill of Materials (BOM) Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your equipment taxonomy tree, personnel registers, and connect to your Google Spreadsheet database.
          </p>
        </div>
        
        {/* Save button */}
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow transition duration-150 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          id="btn-save-settings"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Saving Settings..." : "Save Config & Apply"}
        </button>
      </div>

      {/* Sync Status Banner */}
      {syncStatus.type && (
        <div 
          className={`p-4 rounded-lg flex items-center gap-3 border transition-all duration-300 ${
            syncStatus.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}
          id="sync-status-toast"
        >
          {syncStatus.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span className="text-sm font-medium">{syncStatus.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-8">
          
          {/* Cloud Integration Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4" id="card-google-integration">
            <h3 className="text-base font-bold text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100 font-display">
              <Database className="text-blue-600 w-4.5 h-4.5" />
              Google Sheet Integration
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Apps Script Web App URL
                </label>
                <input
                  type="text"
                  disabled={true}
                  value={appsScriptUrl || ""}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Linked to your configured Google Apps Script.
                </p>
              </div>

              {/* Sync Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Data Synchronization
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSyncOperation("pull")}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Pull data from Google Sheets"
                    id="btn-pull-data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    Pull
                  </button>

                  <button
                    onClick={() => handleSyncOperation("push")}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Overwrites sheets with local app data"
                    id="btn-push-data"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Push
                  </button>
                </div>
              </div>
            </div>
            
            {/* Guide help block */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Connection Active
              </span>
            </div>
          </div>

          {/* Engineers Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4" id="card-engineers-list">
            <h3 className="text-base font-bold text-slate-950 pb-3 border-b border-slate-100 flex justify-between items-center">
              <span>Shift Engineers</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {engineers.length} Registered
              </span>
            </h3>

            {/* List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {engineers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No engineers configured.</p>
              ) : (
                engineers.map((eng, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-800">
                    <span>{eng}</span>
                    <button 
                      onClick={() => handleRemoveEngineer(idx)}
                      className="text-slate-400 hover:text-red-500 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddEngineer} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="e.g. Pulak Roy"
                value={newEngineer}
                onChange={(e) => setNewEngineer(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Workers Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4" id="card-workers-list">
            <h3 className="text-base font-bold text-slate-950 pb-3 border-b border-slate-100 flex justify-between items-center">
              <span>Maintenance Workers</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                {workers.length} Registered
              </span>
            </h3>

            {/* List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {workers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No workers configured.</p>
              ) : (
                workers.map((worker, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs font-medium text-slate-800">
                    <span>{worker}</span>
                    <button 
                      onClick={() => handleRemoveWorker(idx)}
                      className="text-slate-400 hover:text-red-500 p-0.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddWorker} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="e.g. Dipankar"
                value={newWorker}
                onChange={(e) => setNewWorker(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button 
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8" id="bom-setup-card">
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-950 pb-3 border-b border-slate-100 flex justify-between items-center font-display">
              <span>Bill of Materials (BOM) Equipment Taxonomy</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full">
                {bom.length} BOM Nodes
              </span>
            </h3>

            {/* Form to add BOM Node */}
            <form onSubmit={handleAddBOM} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Register New Location-to-Machine Node
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Location */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 75 Mill"
                    value={newLoc}
                    onChange={(e) => setNewLoc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Machine */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Machine Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Piercer"
                    value={newMachine}
                    onChange={(e) => setNewMachine(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Equipments list */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Equipments (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Roll, Bearing, Seal"
                    value={newEquipments}
                    onChange={(e) => setNewEquipments(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add BOM Node
                </button>
              </div>
            </form>

            {/* List BOM Table (Desktop) */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-100 uppercase tracking-wider">
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Machine Name</th>
                    <th className="px-4 py-3">Equipments / Spare Parts Taxonomy</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bom.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        No BOM equipment registered yet. Complete form above to populate.
                      </td>
                    </tr>
                  ) : (
                    bom.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.location}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{item.machineName}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.equipments.map((eq, eIdx) => (
                              <span 
                                key={eIdx}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200/40"
                              >
                                {eq}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveBOM(idx)}
                            className="text-slate-400 hover:text-red-500 p-1.5 transition inline-flex cursor-pointer"
                            title="Remove node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
