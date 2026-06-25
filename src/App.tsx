import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import AllPlanWorkTab from "./components/AllPlanWorkTab";
import ShiftHandleTab from "./components/ShiftHandleTab";
import SettingsTab from "./components/SettingsTab";
import { Settings, PlanWork, ExtraWork } from "./types";
import { ShieldCheck, ClipboardList, Settings as SettingsIcon } from "lucide-react";

const INITIAL_SETTINGS: Settings = {
  bom: [],
  engineers: [],
  workers: [],
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbxWwXIIDtwctRnIupf3CmLks9Pov1ihXiiGmrrD59d-NViKLZFs7go7gEJGzux2tzb7/exec",
  isConfigured: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("plan-work");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [planWork, setPlanWork] = useState<PlanWork[]>([]);
  const [extraWork, setExtraWork] = useState<ExtraWork[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Today's Date String for timezone alignment
  const todayStr = new Date().toISOString().split("T")[0];

  // Load all initial database records
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      // 2. Fetch plan work
      const planRes = await fetch(`/api/plan-work?today=${todayStr}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlanWork(planData);
      }

      // 3. Fetch extra work
      const extraRes = await fetch(`/api/extra-work?today=${todayStr}`);
      if (extraRes.ok) {
        const extraData = await extraRes.json();
        setExtraWork(extraData);
      }
    } catch (error) {
      console.error("Error loading application data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save general and BOM settings
  const handleSaveSettings = async (newSettings: Settings) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const result = await res.json();
        setSettings(result.settings);
      } else {
        throw new Error("Server rejected save settings request");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  };

  // Sync pull or push actions with Google Spreadsheet
  const handleSync = async (mode: "pull" | "push"): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (mode === "pull") {
          // If pull was successful, reload state
          if (data.settings) setSettings(data.settings);
          if (data.planWork) setPlanWork(data.planWork);
          if (data.extraWork) setExtraWork(data.extraWork);
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || "Sync returned failed response" };
      }
    } catch (error: any) {
      console.error("Sync fetch error:", error);
      return { success: false, error: error.message || "Failed to reach backend sync proxy" };
    } finally {
      setIsSyncing(false);
    }
  };

  // Add plan work jobs in bulk
  const handleAddPlanBulk = async (jobs: PlanWork[]) => {
    try {
      const res = await fetch("/api/plan-work/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobs)
      });
      if (res.ok) {
        // Refresh local data list from database
        const freshRes = await fetch(`/api/plan-work?today=${todayStr}`);
        const freshData = await freshRes.json();
        setPlanWork(freshData);
      } else {
        throw new Error("Bulk submission failed on server");
      }
    } catch (error) {
      console.error("Error bulk adding plan work:", error);
      throw error;
    }
  };

  // Update a single plan work item (edit parameters or update status)
  const handleUpdatePlanJob = async (id: string, updatedFields: Partial<PlanWork>) => {
    try {
      const res = await fetch(`/api/plan-work/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setPlanWork((prev) => 
          prev.map((job) => (job.id === id ? { ...job, ...updatedFields } : job))
        );
        // Refresh to get server-calculated DoneDate/DateNote if applicable
        const freshRes = await fetch(`/api/plan-work?today=${todayStr}`);
        const freshData = await freshRes.json();
        setPlanWork(freshData);
      } else {
        throw new Error("Update plan work call failed on server");
      }
    } catch (error) {
      console.error("Error updating plan work:", error);
      throw error;
    }
  };

  // Add extra/additional unplanned jobs in bulk
  const handleAddExtraBulk = async (jobs: ExtraWork[]) => {
    try {
      const res = await fetch("/api/extra-work/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobs)
      });
      if (res.ok) {
        const freshRes = await fetch(`/api/extra-work?today=${todayStr}`);
        const freshData = await freshRes.json();
        setExtraWork(freshData);
      } else {
        throw new Error("Bulk extra work submission failed on server");
      }
    } catch (error) {
      console.error("Error bulk adding extra work:", error);
      throw error;
    }
  };

  // Update a single extra work item
  const handleUpdateExtraJob = async (id: string, updatedFields: Partial<ExtraWork>) => {
    try {
      const res = await fetch(`/api/extra-work/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setExtraWork((prev) => 
          prev.map((job) => (job.id === id ? { ...job, ...updatedFields } : job))
        );
        // Refresh list
        const freshRes = await fetch(`/api/extra-work?today=${todayStr}`);
        const freshData = await freshRes.json();
        setExtraWork(freshData);
      } else {
        throw new Error("Update extra work call failed on server");
      }
    } catch (error) {
      console.error("Error updating extra work:", error);
      throw error;
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4" id="applet-main-canvas">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-400">
          Synchronizing and booting Lalbaba database tables...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="applet-main-canvas">
      {/* Navigation Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        <div className="transition-opacity duration-200">
          {activeTab === "plan-work" && (
            <AllPlanWorkTab
              planWork={planWork}
              settings={settings}
              onAddBulk={handleAddPlanBulk}
              onUpdateJob={handleUpdatePlanJob}
              isLoading={isLoading}
            />
          )}

          {activeTab === "shift-handle" && (
            <ShiftHandleTab
              planWork={planWork}
              extraWork={extraWork}
              settings={settings}
              onUpdatePlanJob={handleUpdatePlanJob}
              onAddExtraBulk={handleAddExtraBulk}
              onUpdateExtraJob={handleUpdateExtraJob}
              isLoading={isLoading}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          )}
        </div>
      </main>

      {/* Clean Branding Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© 2026 Lalbaba Engineering Ltd. All rights reserved.</p>
          <div className="flex space-x-4">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" /> Plan Module: Active
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Shift Handover: Active
            </span>
            <span className="flex items-center gap-1">
              <SettingsIcon className="w-3.5 h-3.5" /> Sync Engine: Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
