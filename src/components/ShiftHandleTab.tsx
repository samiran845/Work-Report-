import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ShieldCheck, Calendar, Users, AlertTriangle, Plus, Trash2, CheckCircle, Clock, Copy, Share2, Edit2, X, Check, Save, Info, Sparkles, Clipboard, Edit, ImageIcon
} from "lucide-react";
import { PlanWork, ExtraWork, Settings, ShiftName, JobStatus } from "../types";

interface ShiftHandleTabProps {
  planWork: PlanWork[];
  extraWork: ExtraWork[];
  settings: Settings;
  onUpdatePlanJob: (id: string, updatedFields: Partial<PlanWork>) => Promise<void>;
  onAddExtraBulk: (jobs: ExtraWork[]) => Promise<void>;
  onUpdateExtraJob: (id: string, updatedFields: Partial<ExtraWork>) => Promise<void>;
  isLoading: boolean;
}

interface DraftExtraJob {
  date: string;
  machineName: string;
  taskDetails: string;
  engineer: string;
  status: JobStatus;
  workNote: string;
}

export default function ShiftHandleTab({ 
  planWork, extraWork, settings, onUpdatePlanJob, onAddExtraBulk, onUpdateExtraJob, isLoading 
}: ShiftHandleTabProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const engineersList = settings.engineers || [];

  // Shift selection state
  const [activeShift, setActiveShift] = useState<ShiftName>("A");
  const [activeDate, setActiveDate] = useState<string>(todayStr);

  function createInitialExtraDraft(): DraftExtraJob {
    return {
      date: activeDate,
      machineName: "",
      taskDetails: "",
      engineer: engineersList[0] || "",
      status: "Pending",
      workNote: ""
    };
  }

  // Filter states
  const [extraFilterStatus, setExtraFilterStatus] = useState<string>("Incomplete"); // Show incomplete by default as requested: "all work will be visible untill compelete"

  // Quick edit state for Plan Jobs (only status, spares, note)
  const [editingPlanJob, setEditingPlanJob] = useState<PlanWork | null>(null);
  
  // Quick edit state for Extra Jobs (only status, spares, note)
  const [editingExtraJob, setEditingExtraJob] = useState<ExtraWork | null>(null);

  // Bulk Extra Work composer draft rows
  const [draftExtras, setDraftExtras] = useState<DraftExtraJob[]>([]);
  const [showExtraComposer, setShowExtraComposer] = useState(false);
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [draftItemForm, setDraftItemForm] = useState<DraftExtraJob | null>(null);

  // Copy success notification toast
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Prevent background body scroll when any modal is open on mobile only
  useEffect(() => {
    const handleScrollLock = () => {
      const isMobile = window.innerWidth < 768;
      const isAnyModalOpen = !!(editingPlanJob || editingExtraJob || showExtraComposer || draftItemForm);
      if (isMobile && isAnyModalOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    handleScrollLock();
    window.addEventListener("resize", handleScrollLock);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleScrollLock);
    };
  }, [editingPlanJob, editingExtraJob, showExtraComposer, draftItemForm]);

  // Adding Draft Extra row
  const addExtraDraftRow = () => {
    const lastRow = draftExtras[draftExtras.length - 1];
    setDraftExtras([
      ...draftExtras,
      {
        ...createInitialExtraDraft(),
        engineer: lastRow?.engineer || engineersList[0] || "",
        status: lastRow?.status || "Pending",
        date: activeDate
      }
    ]);
  };

  const removeExtraDraftRow = (index: number) => {
    setDraftExtras(draftExtras.filter((_, i) => i !== index));
  };

  const handleExtraDraftChange = (index: number, field: keyof DraftExtraJob, value: any) => {
    const updated = [...draftExtras];
    updated[index] = { ...updated[index], [field]: value } as DraftExtraJob;
    setDraftExtras(updated);
  };

  const submitExtraJobs = async () => {
    const validRows = draftExtras.filter((row) => row.machineName.trim() !== "" && row.taskDetails.trim() !== "");
    if (validRows.length === 0) {
      alert("Please fill out at least one Extra Work row with Machine Name and Task Details!");
      return;
    }

    try {
      const mappedExtras: ExtraWork[] = validRows.map((row) => ({
        id: "", // Server assigns ID
        date: row.date || activeDate,
        machineName: row.machineName,
        taskDetails: row.taskDetails,
        engineer: row.engineer,
        status: row.status,
        workNote: row.workNote,
        dateNote: "",
        doneDate: row.status === "Done" ? todayStr : ""
      }));

      await onAddExtraBulk(mappedExtras);
      setDraftExtras([createInitialExtraDraft()]);
      setShowExtraComposer(false);
      alert(`Logged ${mappedExtras.length} additional/extra jobs in bulk successfully!`);
    } catch (error: any) {
      alert("Failed to submit extra jobs: " + error.message);
    }
  };

  // Generate WhatsApp Shift Work Report Text
  const getShiftReportText = () => {
    // 1. Gather plan work done today
    const donePlans = planWork.filter((job) => 
      job.planDate === activeDate && 
      job.workStatus === "Done"
    );

    // 2. Gather extra work done today
    const doneExtras = extraWork.filter((job) => 
      job.date === activeDate && 
      job.status === "Done"
    );

    // Collect spares
    const sparesList: string[] = [];
    
    // Process Plan spares
    planWork.forEach((job) => {
      if (job.planDate === activeDate && job.requiredSpareParts && job.workStatus === "Done") {
        sparesList.push(`${job.machineName}: ${job.requiredSpareParts}`);
      }
    });

    // Process Extra spares
    extraWork.forEach((job) => {
      if (job.date === activeDate && job.status === "Done" && job.workNote.toLowerCase().includes("spare")) {
        sparesList.push(`${job.machineName}: ${job.workNote}`);
      }
    });

    // Format date as DD-MM-YYYY
    const parts = activeDate.split("-");
    const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : activeDate;

    let text = `Date: ${formattedDate}\nShift: ${activeShift}\n\nWork Report:\n`;

    let itemIndex = 1;
    donePlans.forEach((job) => {
      const responsibilities = job.plannedResponsibilities.length > 0 
        ? ` (${job.plannedResponsibilities.join(", ")})` 
        : "";
      text += `${itemIndex}. ${job.machineName} - ${job.taskDetails} - Done${responsibilities}\n`;
      itemIndex++;
    });

    doneExtras.forEach((job) => {
      text += `${itemIndex}. ${job.machineName} - ${job.taskDetails} - Done (${job.engineer})\n`;
      itemIndex++;
    });

    if (itemIndex === 1) {
      text += "No work completed in this shift yet.\n";
    }

    text += `\nSpare use:\n`;
    if (sparesList.length === 0) {
      text += "None\n";
    } else {
      sparesList.forEach((spare) => {
        text += `- ${spare}\n`;
      });
    }

    return text;
  };

  const handleCopyReport = () => {
    const text = getShiftReportText();
    navigator.clipboard.writeText(text);
    setShareSuccess(`Shift ${activeShift} Report Copied!`);
    setTimeout(() => setShareSuccess(null), 3500);
  };

  const handleWhatsAppShare = () => {
    const text = getShiftReportText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const formatDisplayDate = (dateVal: string) => {
    if (!dateVal) return "";
    const parts = dateVal.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateVal;
  };

  // FILTER lists to activeDate (Plan date is rolled over, so activeDate matches)
  const currentPlanWork = planWork.filter((job) => job.planDate === activeDate);
  
  // Extra work: "all work will be visible untill compelete"
  const currentExtraWork = extraWork.filter((job) => {
    if (extraFilterStatus === "Incomplete") {
      return job.status !== "Done";
    }
    if (extraFilterStatus === "Done") {
      return job.status === "Done" && job.date === activeDate;
    }
    return true; // All
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in" id="shift-handover-view">
      
      {/* Shift Panel Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display">
            <ShieldCheck className="text-blue-600 w-5 h-5" />
            Shift Engineer Handover Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Log active shift statuses, report additional field issues, and compile clear WhatsApp shift reports instantly.
          </p>
        </div>

        {/* Shift A B C Control */}
        <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
          {(["A", "B", "C"] as ShiftName[]).map((shift) => (
            <button
              key={shift}
              onClick={() => setActiveShift(shift)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeShift === shift
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
              }`}
            >
              Shift {shift}
            </button>
          ))}
        </div>
      </div>

      {/* Copy notification */}
      {shareSuccess && (
        <div className="bg-emerald-500 text-white font-bold text-center py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow animate-bounce" id="clipboard-alert">
          <Check className="w-4 h-4" />
          {shareSuccess}
        </div>
      )}

      {/* Shift Report Generator / Broadcaster Bar */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            WhatsApp Shift Report Compiler
          </h4>
          <p className="text-[11px] text-slate-500">
            Clicking copy compiles all jobs marked 'Done' and spare parts used during Shift {activeShift} for the active date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Target Handover Date */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="text-xs outline-none bg-transparent"
              id="handover-date-select"
            />
          </div>

          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
          >
            <Copy className="w-3 h-3 text-slate-400" />
            Copy Shift Handover
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Grid: Left Column: Plan Work queue, Right Column: Extra Work Composer & List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Scheduled Plan Work items (ReadOnly details, status/notes only editable) */}
        <div className="space-y-6" id="shift-plan-work-list">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                📆 Scheduled Maintenance Queue ({currentPlanWork.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Active Date: {formatDisplayDate(activeDate)}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Listed tasks for today. Select any row to update its work status, spare parts list, or engineering notes.
            </p>

            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="text-center py-10 text-slate-400 text-xs">Loading daily queue...</div>
              ) : currentPlanWork.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs border border-dashed rounded-lg">
                  No scheduled maintenance plan listed for this date.
                </div>
              ) : (
                currentPlanWork.map((job) => (
                  <div 
                    key={job.id}
                    onClick={() => setEditingPlanJob(job)}
                    className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition cursor-pointer flex flex-col md:flex-row justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{job.id}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          job.planCatagory === "Shutdown" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {job.planCatagory}
                        </span>
                        {job.dateNote && (
                          <span className="px-1.5 py-0.2 bg-red-50 text-red-600 text-[8px] font-bold rounded border border-red-100 uppercase tracking-wide">
                            Carried Forward
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-slate-800 text-sm">
                        {job.location} &rarr; {job.machineName} {job.equipment ? `(${job.equipment})` : ""}
                      </div>

                      <p className="text-slate-600 font-medium leading-relaxed">{job.taskDetails}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        <span className="text-slate-500">
                          <span className="font-bold">Workers:</span> {job.plannedResponsibilities.join(", ") || "None"}
                        </span>
                        {job.requiredSpareParts && (
                          <span className="text-amber-700 bg-amber-50 px-1.5 rounded font-medium border border-amber-100/40">
                            ⚙ Spare: {job.requiredSpareParts}
                          </span>
                        )}
                      </div>

                      {job.workNote && (
                        <div className="bg-amber-50/20 text-slate-600 p-2 rounded border border-dashed border-amber-200/50 mt-1">
                          <span className="font-bold text-slate-700 text-[10px]">Work Note:</span> {job.workNote}
                        </div>
                      )}
                    </div>

                    {/* Status Badge right-aligned */}
                    <div className="flex flex-col justify-between items-end shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        job.workStatus === "Done"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : job.workStatus === "Running"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {job.workStatus}
                      </span>

                      <span className="text-[10px] text-slate-400 font-semibold mt-2 hover:underline text-amber-600">
                        Tap to update &rarr;
                      </span>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Extra/Additional Work section */}
        <div className="space-y-6" id="shift-extra-work-panel">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wide">
                🛠️ Unplanned / Extra Shift Work ({currentExtraWork.length})
              </h3>
              
              <button
                onClick={() => setShowExtraComposer(!showExtraComposer)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1 cursor-pointer"
                id="btn-toggle-extra-form"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Extra Work
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Did your shift engineers encounter any unexpected repairs? Log them here. By default, incomplete extra works remain visible in this list until resolved.
            </p>

            {/* Incomplete / Complete Filter Toggle */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wide">Filter list:</span>
              <button
                onClick={() => setExtraFilterStatus("Incomplete")}
                className={`px-2.5 py-1 rounded-md font-semibold border ${
                  extraFilterStatus === "Incomplete"
                    ? "bg-amber-100 text-amber-900 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Incomplete Tasks
              </button>
              <button
                onClick={() => setExtraFilterStatus("Done")}
                className={`px-2.5 py-1 rounded-md font-semibold border ${
                  extraFilterStatus === "Done"
                    ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Completed Today
              </button>
              <button
                onClick={() => setExtraFilterStatus("All")}
                className={`px-2.5 py-1 rounded-md font-semibold border ${
                  extraFilterStatus === "All"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Show All
              </button>
            </div>

            {/* 2. BULK EXTRA PLANNER DIALOG OVERLAY */}
            {showExtraComposer && createPortal(
              <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="bulk-extra-modal">
                <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl overflow-hidden animate-fade-in flex flex-col">
                  {/* Header */}
                  <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
                    <div>
                      <h3 className="text-base font-bold flex items-center gap-2 font-display">
                        <Sparkles className="text-amber-400 w-5 h-5" />
                        Bulk Extra Work Logger
                      </h3>
                      <p className="text-xs text-slate-400">Log multiple unplanned breakdown / repair works. Items are listed below.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowExtraComposer(false);
                        setDraftExtras([]);
                      }} 
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* List of current draft extra rows */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        List of Draft Extra Jobs ({draftExtras.filter(j => j.machineName).length} configured)
                      </span>
                      <button
                        onClick={() => setDraftExtras([])}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    {draftExtras.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 space-y-2">
                        <Clipboard className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No draft extra jobs configured yet.</p>
                        <p className="text-[10px] text-slate-400">Click "+ Add Extra Job" below to configure a job and add it to this list.</p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                        {draftExtras.map((draft, idx) => (
                          <div key={idx} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border">
                                  Row #{idx + 1}
                                </span>
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 uppercase font-semibold">
                                  {draft.status}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Date: {draft.date}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-800">
                                {draft.machineName ? draft.machineName : <span className="text-red-500 italic">Not configured yet</span>}
                              </div>
                              <p className="text-xs text-slate-600 leading-normal truncate max-w-xl">
                                <span className="font-semibold text-slate-700">Task:</span> {draft.taskDetails || <span className="text-slate-400 italic">None</span>}
                              </p>
                              {draft.engineer && (
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  <span className="text-[9px] font-bold text-slate-400">Engineer:</span>
                                  <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded border border-amber-100 font-medium">
                                    {draft.engineer}
                                  </span>
                                </div>
                              )}
                              {draft.workNote && (
                                <div className="text-[10px] text-slate-500">
                                  <span className="font-semibold">Note:</span> {draft.workNote}
                                </div>
                              )}
                            </div>

                            {/* Row actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDraftIndex(idx);
                                  setDraftItemForm({ ...draft });
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 border border-slate-100 cursor-pointer"
                                title="Edit Row Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDraftExtras(draftExtras.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 border border-slate-100 cursor-pointer"
                                title="Remove Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-100 text-xs shrink-0">
                    <button
                      onClick={() => {
                        setEditingDraftIndex(draftExtras.length);
                        setDraftItemForm(createInitialExtraDraft());
                      }}
                      className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer border border-slate-200 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Extra Job
                    </button>

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setShowExtraComposer(false);
                          setDraftExtras([]);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitExtraJobs}
                        disabled={draftExtras.filter(j => j.machineName && j.taskDetails).length === 0}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-xs transition shadow-sm inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Submit Extra ({draftExtras.filter(j => j.machineName && j.taskDetails).length}) to Database
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 2.1 PROPER FORM OVERLAY SUB-MODAL FOR INDIVIDUAL EXTRA DRAFT ROW */}
            {draftItemForm && createPortal(
             <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="extra-draft-item-sub-modal">
                <div className="bg-white rounded-none md:rounded-xl shadow-2xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-xl overflow-hidden animate-fade-in flex flex-col">
                  {/* Header */}
                  <div className="bg-amber-600 text-white px-6 py-4 flex justify-between items-center border-b border-amber-700 shrink-0">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-1.5 font-display">
                        <Sparkles className="w-4 h-4 text-white" />
                        Configure Extra Job (Row #{editingDraftIndex !== null ? editingDraftIndex + 1 : "New"})
                      </h4>
                      <p className="text-[11px] text-amber-100">Configure parameters for this unplanned maintenance / breakdown.</p>
                    </div>
                    <button onClick={() => setDraftItemForm(null)} className="text-amber-100 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Form */}
                  <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Date */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Breakdown Date</label>
                        <input
                          type="date"
                          value={draftItemForm.date}
                          onChange={(e) => setDraftItemForm({ ...draftItemForm, date: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      {/* Engineer */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Engineer In Charge</label>
                        <select
                          value={draftItemForm.engineer}
                          onChange={(e) => setDraftItemForm({ ...draftItemForm, engineer: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          {engineersList.map((eng) => (
                            <option key={eng} value={eng}>{eng}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Machine Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Machine Name / Line</label>
                      <input
                        type="text"
                        placeholder="e.g. 75 Mill Piercer Lift"
                        value={draftItemForm.machineName}
                        onChange={(e) => setDraftItemForm({ ...draftItemForm, machineName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    {/* Task Details */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Task Details</label>
                      <textarea
                        rows={3}
                        placeholder="What went wrong and what needs fixing?"
                        value={draftItemForm.taskDetails}
                        onChange={(e) => setDraftItemForm({ ...draftItemForm, taskDetails: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white font-sans text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Status */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Status</label>
                        <select
                          value={draftItemForm.status}
                          onChange={(e) => setDraftItemForm({ ...draftItemForm, status: e.target.value as JobStatus })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Running">Running</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>

                      {/* Work Note */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Note / Spares Used</label>
                        <input
                          type="text"
                          placeholder="e.g. Cleared leakage packing"
                          value={draftItemForm.workNote}
                          onChange={(e) => setDraftItemForm({ ...draftItemForm, workNote: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sub-Modal Footer */}
                  <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 text-xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setDraftItemForm(null)}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!draftItemForm.machineName || !draftItemForm.taskDetails) {
                          alert("Please provide Machine Name and Task Details!");
                          return;
                        }
                        if (editingDraftIndex !== null) {
                          const updated = [...draftExtras];
                          updated[editingDraftIndex] = draftItemForm;
                          setDraftExtras(updated);
                        }
                        setDraftItemForm(null);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs transition cursor-pointer"
                    >
                      Save Extra Job Draft
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* Extras list display */}
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {currentExtraWork.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-lg">
                  No additional field work logged for this filter.
                </div>
              ) : (
                currentExtraWork.map((job) => (
                  <div 
                    key={job.id}
                    onClick={() => setEditingExtraJob(job)}
                    className="p-4 bg-amber-50/5 hover:bg-amber-50/20 border border-amber-200/40 rounded-xl transition cursor-pointer flex justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900">{job.id}</span>
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[8px] font-bold rounded uppercase tracking-wide border border-amber-200">
                          Extra Job
                        </span>
                        {job.dateNote && (
                          <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[8px] font-bold rounded uppercase">
                            Carried Forward
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDisplayDate(job.date)}
                        </span>
                      </div>

                      <div className="font-bold text-slate-800 text-sm">
                        {job.machineName}
                      </div>

                      <p className="text-slate-600 font-medium leading-relaxed">{job.taskDetails}</p>

                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        <span className="text-slate-500">
                          <span className="font-bold">Engineer:</span> {job.engineer}
                        </span>
                        {job.workNote && (
                          <span className="text-slate-600 bg-white px-1.5 rounded font-medium border">
                            Note: {job.workNote}
                          </span>
                        )}
                      </div>

                      {job.dateNote && (
                        <div className="text-red-600 font-bold text-[9px] bg-red-50 p-1.5 rounded border border-red-100 max-w-sm mt-1">
                          ⚠️ {job.dateNote}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        job.status === "Done"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : job.status === "Running"
                          ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold mt-2">
                        Update &rarr;
                      </span>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 5. EDIT PLAN WORK MODAL (RESTRICTED EDITING) */}
      {editingPlanJob && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="edit-plan-job-shift-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-md overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold">Shift Log Update: {editingPlanJob.id}</h3>
                <p className="text-xs text-slate-400">Update status and notes for the daily plan.</p>
              </div>
              <button onClick={() => setEditingPlanJob(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-800">{editingPlanJob.location} &rarr; {editingPlanJob.machineName}</div>
                <p className="text-slate-500 leading-relaxed font-medium"><span className="font-semibold text-slate-600">Task:</span> {editingPlanJob.taskDetails}</p>
                <div className="text-[10px] text-slate-400 font-semibold">DATE NOTE: {editingPlanJob.dateNote || "N/A"}</div>
              </div>

              {/* Editable Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Status</label>
                <select
                  value={editingPlanJob.workStatus}
                  onChange={(e) => setEditingPlanJob({ ...editingPlanJob, workStatus: e.target.value as JobStatus })}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Running">Running</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Editable Spares used */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Spares Used</label>
                <input
                  type="text"
                  placeholder="e.g. Gland seal packing 12mm used"
                  value={editingPlanJob.requiredSpareParts}
                  onChange={(e) => setEditingPlanJob({ ...editingPlanJob, requiredSpareParts: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Editable Work notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Engineer Work Note</label>
                <textarea
                  rows={2}
                  placeholder="Record what was done or notes for the next shift..."
                  value={editingPlanJob.workNote}
                  onChange={(e) => setEditingPlanJob({ ...editingPlanJob, workNote: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditingPlanJob(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingPlanJob) {
                    await onUpdatePlanJob(editingPlanJob.id, {
                      workStatus: editingPlanJob.workStatus,
                      requiredSpareParts: editingPlanJob.requiredSpareParts,
                      workNote: editingPlanJob.workNote
                    });
                    setEditingPlanJob(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. EDIT EXTRA WORK MODAL (SHIFT EDITING) */}
      {editingExtraJob && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="edit-extra-job-shift-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-md overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold">Extra Log Update: {editingExtraJob.id}</h3>
                <p className="text-xs text-slate-400">Update properties of unplanned work.</p>
              </div>
              <button onClick={() => setEditingExtraJob(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-amber-50/30 p-3.5 rounded-lg border border-amber-200/30 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-800">{editingExtraJob.machineName}</div>
                <p className="text-slate-500 leading-relaxed font-medium"><span className="font-semibold text-slate-600">Incident Details:</span> {editingExtraJob.taskDetails}</p>
                <div className="text-[10px] text-slate-400 font-semibold">DATE NOTE: {editingExtraJob.dateNote || "N/A"}</div>
              </div>

              {/* Editable Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Status</label>
                <select
                  value={editingExtraJob.status}
                  onChange={(e) => setEditingExtraJob({ ...editingExtraJob, status: e.target.value as JobStatus })}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Running">Running</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {/* Editable Work Note / Spares */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Note / Spares Used</label>
                <textarea
                  rows={2}
                  placeholder="Record action taken and any spare parts used..."
                  value={editingExtraJob.workNote}
                  onChange={(e) => setEditingExtraJob({ ...editingExtraJob, workNote: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setEditingExtraJob(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingExtraJob) {
                    await onUpdateExtraJob(editingExtraJob.id, {
                      status: editingExtraJob.status,
                      workNote: editingExtraJob.workNote
                    });
                    setEditingExtraJob(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
