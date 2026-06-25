import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, Search, Filter, Share2, Edit3, Edit, Trash2, Calendar, Clipboard, CheckCircle, 
  Clock, AlertTriangle, ChevronDown, ChevronUp, Copy, Check, Sparkles, Image as ImageIcon, X, RefreshCw
} from "lucide-react";
import { PlanWork, Settings, PlanCatagory, JobStatus } from "../types";

interface AllPlanWorkTabProps {
  planWork: PlanWork[];
  settings: Settings;
  onAddBulk: (jobs: PlanWork[]) => Promise<void>;
  onUpdateJob: (id: string, updatedFields: Partial<PlanWork>) => Promise<void>;
  isLoading: boolean;
}

interface DraftJob {
  planCatagory: PlanCatagory;
  planDate: string;
  location: string;
  machineName: string;
  equipment: string;
  taskDetails: string;
  requiredSpareParts: string;
  workStatus: JobStatus;
  plannedResponsibilities: string[];
  workNote: string;
  images: string[];
  dateNote: string;
  doneDate: string;
}

export default function AllPlanWorkTab({ planWork, settings, onAddBulk, onUpdateJob, isLoading }: AllPlanWorkTabProps) {
  // Today's date string
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Tomorrow's date string
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  // State for bulk-form modal expand
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  
  // State for draft bulk items
  const [draftJobs, setDraftJobs] = useState<DraftJob[]>([]);

  // State for bulk item individual detailed editing sub-modal
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [draftItemForm, setDraftItemForm] = useState<DraftJob | null>(null);

  // Editing single job state
  const [editingJob, setEditingJob] = useState<PlanWork | null>(null);

  // Selected job for mobile details popup
  const [selectedViewJob, setSelectedViewJob] = useState<PlanWork | null>(null);

  // Copy/Share toast indicators
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Prevent background body scroll when any modal is open on mobile only
  useEffect(() => {
    const handleScrollLock = () => {
      const isMobile = window.innerWidth < 768;
      const isAnyModalOpen = !!(showBulkForm || draftItemForm || editingJob || selectedViewJob);
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
  }, [showBulkForm, draftItemForm, editingJob, selectedViewJob]);

  // Unique lists from settings for select boxes
  const bomLocations = Array.from(new Set(settings.bom.map((b) => b.location)));
  const workersList = settings.workers || [];

  function createInitialDraft(): DraftJob {
    return {
      planCatagory: "daily",
      planDate: tomorrowStr,
      location: "",
      machineName: "",
      equipment: "",
      taskDetails: "",
      requiredSpareParts: "",
      workStatus: "Pending",
      plannedResponsibilities: [],
      workNote: "",
      images: [],
      dateNote: "",
      doneDate: ""
    };
  }

  // Handle draft changes with cascading updates
  const handleDraftChange = (index: number, field: keyof DraftJob, value: any) => {
    const updated = [...draftJobs];
    updated[index] = { ...updated[index], [field]: value } as DraftJob;

    // Cascade: If location changes, reset machine and equipment
    if (field === "location") {
      updated[index].machineName = "";
      updated[index].equipment = "";
    }
    // Cascade: If machineName changes, reset equipment
    if (field === "machineName") {
      updated[index].equipment = "";
    }

    setDraftJobs(updated);
  };

  const addDraftRow = () => {
    // Clone previous row to make manual bulk insertion extremely fast for recurring values
    const lastRow = draftJobs[draftJobs.length - 1];
    setDraftJobs([
      ...draftJobs,
      {
        ...createInitialDraft(),
        planCatagory: lastRow?.planCatagory || "daily",
        planDate: lastRow?.planDate || tomorrowStr,
        location: lastRow?.location || "",
        machineName: lastRow?.machineName || "",
      }
    ]);
  };

  const removeDraftRow = (index: number) => {
    setDraftJobs(draftJobs.filter((_, i) => i !== index));
  };

  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Convert image file to base64 and upload with customized name as per work details
  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Define details for naming
        let idVal = "DRAFT";
        let locVal = "General";
        let machVal = "Machine";
        let equipVal = "Equipment";
        let dateVal = new Date().toISOString().split("T")[0];

        if (isEditing && editingJob) {
          idVal = editingJob.id || "PLN";
          locVal = editingJob.location || "General";
          machVal = editingJob.machineName || "Machine";
          equipVal = editingJob.equipment || "Equipment";
          dateVal = editingJob.planDate || dateVal;
        } else {
          const draft = draftJobs[index];
          if (draft) {
            idVal = `DRF_${index + 1}`;
            locVal = draft.location || "General";
            machVal = draft.machineName || "Machine";
            equipVal = draft.equipment || "Equipment";
            dateVal = draft.planDate || dateVal;
          }
        }

        const sanitize = (str: string) => {
          return (str || "")
            .replace(/[^a-zA-Z0-9]/g, "_")
            .replace(/__+/g, "_")
            .replace(/^_+|_+$/g, "");
        };

        const fileExt = file.name.split('.').pop() || 'jpg';
        const timestamp = new Date().getTime();
        const customFileName = `${sanitize(idVal)}_${sanitize(locVal)}_${sanitize(machVal)}_${sanitize(equipVal)}_${sanitize(dateVal)}_${timestamp}.${fileExt}`;

        try {
          const res = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: base64String, fileName: customFileName })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.url) {
              if (isEditing && editingJob) {
                setEditingJob((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    images: [...(prev.images || []), data.url]
                  };
                });
              } else {
                setDraftJobs((prev) => {
                  const updated = [...prev];
                  if (updated[index]) {
                    updated[index].images = [...(updated[index].images || []), data.url];
                  }
                  return updated;
                });
              }
            }
          } else {
            console.error("Server rejected image upload");
          }
        } catch (uploadErr) {
          console.error("Error uploading image to server:", uploadErr);
        } finally {
          setIsUploadingImage(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read image file", err);
      setIsUploadingImage(false);
    }
  };

  const removeDraftImage = (rowIndex: number, imgIdx: number) => {
    const updated = [...draftJobs];
    updated[rowIndex].images = updated[rowIndex].images.filter((_, i) => i !== imgIdx);
    setDraftJobs(updated);
  };

  const submitBulkJobs = async () => {
    if (isSubmittingBulk) return;

    // Validate rows
    const validJobs = draftJobs.filter(job => 
      job.location.trim() !== "" && 
      job.machineName.trim() !== "" && 
      job.taskDetails.trim() !== ""
    );

    if (validJobs.length === 0) {
      alert("Please fill out at least one complete job row with Location, Machine Name, and Task Details!");
      return;
    }

    setIsSubmittingBulk(true);

    try {
      // Map to real jobs schema
      const mappedJobs: PlanWork[] = validJobs.map((job) => ({
        id: "", // Server will auto-assign PLN ID
        planCatagory: job.planCatagory,
        planDate: job.planDate,
        location: job.location,
        machineName: job.machineName,
        equipment: job.equipment,
        taskDetails: job.taskDetails,
        requiredSpareParts: job.requiredSpareParts,
        workStatus: job.workStatus,
        plannedResponsibilities: job.plannedResponsibilities,
        workNote: job.workNote,
        images: job.images,
        dateNote: job.dateNote,
        doneDate: job.workStatus === "Done" ? (job.doneDate || todayStr) : ""
      }));

      await onAddBulk(mappedJobs);
      setDraftJobs([]);
      setShowBulkForm(false);
      alert(`Successfully added ${mappedJobs.length} jobs in bulk!`);
    } catch (error: any) {
      alert("Failed to add bulk jobs: " + error.message);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // WhatsApp formatted string generator
  const getWhatsAppText = (category: PlanCatagory, targetDate: string) => {
    // Filter jobs for selected category and date
    const targetJobs = planWork.filter(job => 
      job.planCatagory === category && 
      job.planDate === targetDate
    );

    if (targetJobs.length === 0) {
      return `tomorrow job planning\nDate: ${formatDisplayDate(targetDate)}\nNo jobs registered for this date.`;
    }

    const title = category === "daily" ? "tomorrow job planning" : "shutdown job planning";
    const formattedDate = formatDisplayDate(targetDate);
    
    let text = `${title}\nDate: ${formattedDate}\n`;
    targetJobs.forEach((job, index) => {
      const responsibilities = job.plannedResponsibilities.length > 0 
        ? `(${job.plannedResponsibilities.join(", ")})` 
        : "";
      text += `${index + 1}. ${job.taskDetails} @ ${job.location}/${job.machineName} ${responsibilities}\n`;
    });

    return text;
  };

  // Trigger copy to clipboard and share toast
  const handleCopyText = (category: PlanCatagory, targetDate: string) => {
    const text = getWhatsAppText(category, targetDate || todayStr);
    navigator.clipboard.writeText(text);
    setShareSuccess(category === "daily" ? "Daily Plan Copied!" : "Shutdown Plan Copied!");
    setTimeout(() => setShareSuccess(null), 3000);
  };

  // WhatsApp open link
  const handleWhatsAppShare = (category: PlanCatagory, targetDate: string) => {
    const text = getWhatsAppText(category, targetDate || todayStr);
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // Formatting date for copy (DD/MM/YYYY)
  const formatDisplayDate = (dateVal: string) => {
    if (!dateVal) return "";
    const parts = dateVal.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateVal;
  };

  // Filter lists
  const filteredPlanWork = planWork.filter((job) => {
    const matchesSearch = 
      job.taskDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.requiredSpareParts.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.machineName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || job.planCatagory === filterCategory;
    const matchesStatus = filterStatus === "all" || job.workStatus === filterStatus;
    const matchesDate = !filterDate || job.planDate === filterDate;

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in" id="all-plan-work-view">
      
      {/* Search, Filter & Bulk Expand header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
            <Clipboard className="text-blue-600 w-5 h-5" />
            Engineering Maintenance Planner
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Define daily and shutdown tasks. Use the bulk planner to load items in one fast batch.
          </p>
        </div>

        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
          id="btn-toggle-bulk-form"
        >
          {showBulkForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showBulkForm ? "Close Bulk Planner" : "Bulk Plan Jobs"}
        </button>
      </div>

      {/* Copy / Share Alerts */}
      {shareSuccess && (
        <div className="bg-emerald-600 text-white font-semibold text-center py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow animate-bounce" id="clipboard-alert">
          <Check className="w-4.5 h-4.5" />
          {shareSuccess}
        </div>
      )}

      {/* 2. BULK PLANNER DIALOG OVERLAY */}
      {showBulkForm && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="bulk-planner-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-4xl overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 font-display">
                  <Sparkles className="text-blue-400 w-5 h-5" />
                  Bulk Task Planner
                </h3>
                <p className="text-xs text-slate-400">Add multiple engineering maintenance schedules at once. Items are listed below.</p>
              </div>
              <button 
                onClick={() => {
                  setShowBulkForm(false);
                  setDraftJobs([]);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of current draft rows */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  List of Draft Jobs ({draftJobs.filter(j => j.location).length} configured)
                </span>
                <button
                  onClick={() => setDraftJobs([])}
                  className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {draftJobs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 space-y-2">
                  <Clipboard className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No draft jobs configured yet.</p>
                  <p className="text-[10px] text-slate-400">Click "+ Add Job Details" below to configure a job and add it to this list.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {draftJobs.map((draft, idx) => (
                    <div key={idx} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border">
                            Row #{idx + 1}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 uppercase font-semibold">
                            {draft.planCatagory}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Date: {draft.planDate}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          {draft.location ? `${draft.location} ➔ ${draft.machineName || "N/A"} ➔ ${draft.equipment || "N/A"}` : <span className="text-red-500 italic">Not configured yet</span>}
                        </div>
                        <p className="text-xs text-slate-600 leading-normal truncate max-w-xl">
                          <span className="font-semibold text-slate-700">Task:</span> {draft.taskDetails || <span className="text-slate-400 italic">None</span>}
                        </p>
                        {draft.plannedResponsibilities.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[9px] font-bold text-slate-400">Assigned:</span>
                            {draft.plannedResponsibilities.map(w => (
                              <span key={w} className="text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-100 font-medium">
                                {w}
                              </span>
                            ))}
                          </div>
                        )}
                        {draft.requiredSpareParts && (
                          <div className="text-[10px] text-slate-500">
                            <span className="font-semibold">Spares:</span> {draft.requiredSpareParts}
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
                            setDraftJobs(draftJobs.filter((_, i) => i !== idx));
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
                  setEditingDraftIndex(draftJobs.length);
                  setDraftItemForm(createInitialDraft());
                }}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg text-xs transition inline-flex items-center justify-center gap-1 cursor-pointer border border-slate-200 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Job Details
              </button>

              <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowBulkForm(false);
                    setDraftJobs([]);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBulkJobs}
                  disabled={isSubmittingBulk || draftJobs.filter(j => j.location && j.taskDetails).length === 0}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-xs transition shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingBulk ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Please wait, submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Submit Bulk ({draftJobs.filter(j => j.location && j.taskDetails).length}) to Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2.1 PROPER FORM OVERLAY SUB-MODAL FOR INDIVIDUAL DRAFT ROW */}
      {draftItemForm && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="draft-item-sub-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-2xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-xl overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center border-b border-blue-700 shrink-0">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5 font-display">
                  <Sparkles className="w-4 h-4 text-white" />
                  Configure Job Details (Row #{editingDraftIndex !== null ? editingDraftIndex + 1 : "New"})
                </h4>
                <p className="text-[11px] text-blue-100">Configure parameters for this task using taxonomy cascades.</p>
              </div>
              <button onClick={() => setDraftItemForm(null)} className="text-blue-100 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={draftItemForm.planCatagory}
                    onChange={(e) => setDraftItemForm({ ...draftItemForm, planCatagory: e.target.value as PlanCatagory })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="daily">Daily Plan</option>
                    <option value="Shutdown">Shutdown Plan</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Schedule Date</label>
                  <input
                    type="date"
                    value={draftItemForm.planDate}
                    onChange={(e) => setDraftItemForm({ ...draftItemForm, planDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Cascading Taxonomy Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Location</label>
                  <select
                    value={draftItemForm.location}
                    onChange={(e) => {
                      const loc = e.target.value;
                      setDraftItemForm({
                        ...draftItemForm,
                        location: loc,
                        machineName: "",
                        equipment: ""
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white font-medium"
                  >
                    <option value="">-- Select Location --</option>
                    {bomLocations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Machine (Cascaded) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Machine Name</label>
                  <select
                    value={draftItemForm.machineName}
                    disabled={!draftItemForm.location}
                    onChange={(e) => {
                      setDraftItemForm({
                        ...draftItemForm,
                        machineName: e.target.value,
                        equipment: ""
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:opacity-50"
                  >
                    <option value="">-- Select Machine --</option>
                    {settings.bom
                      .filter((b) => b.location === draftItemForm.location)
                      .map((b) => b.machineName)
                      .filter((val, i, arr) => arr.indexOf(val) === i)
                      .map((mach) => (
                        <option key={mach} value={mach}>{mach}</option>
                      ))}
                  </select>
                </div>

                {/* Equipment (Cascaded) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Equipment / Section</label>
                  <select
                    value={draftItemForm.equipment}
                    disabled={!draftItemForm.machineName}
                    onChange={(e) => setDraftItemForm({ ...draftItemForm, equipment: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:opacity-50"
                  >
                    <option value="">-- Select Equipment --</option>
                    {(settings.bom.find((b) => b.location === draftItemForm.location && b.machineName === draftItemForm.machineName)?.equipments || [])
                      .map((eq) => (
                        <option key={eq} value={eq}>{eq}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Task Details */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Task Details / Maintenance Scope</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Clean oil filters and replace O-rings"
                  value={draftItemForm.taskDetails}
                  onChange={(e) => setDraftItemForm({ ...draftItemForm, taskDetails: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white font-sans text-xs"
                />
              </div>

              {/* Required Spares */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Required Spare Parts</label>
                <input
                  type="text"
                  placeholder="e.g. Graphite rope, 12mm Gland seal packings"
                  value={draftItemForm.requiredSpareParts}
                  onChange={(e) => setDraftItemForm({ ...draftItemForm, requiredSpareParts: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Checklist for registered workers */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Assign Manpower / Workers (Checklist)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                  {workersList.map((worker) => {
                    const isAssigned = draftItemForm.plannedResponsibilities.includes(worker);
                    return (
                      <label 
                        key={worker} 
                        className={`flex items-center gap-2 p-1.5 rounded border text-[11px] font-medium cursor-pointer transition-colors ${
                          isAssigned 
                            ? "bg-blue-50 border-blue-200 text-blue-900" 
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => {
                            const list = isAssigned
                              ? draftItemForm.plannedResponsibilities.filter(w => w !== worker)
                              : [...draftItemForm.plannedResponsibilities, worker];
                            setDraftItemForm({ ...draftItemForm, plannedResponsibilities: list });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                        />
                        <span className="truncate">{worker}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 text-xs shrink-0">
              <button
                onClick={() => setDraftItemForm(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!draftItemForm.location || !draftItemForm.machineName || !draftItemForm.taskDetails) {
                    alert("Please provide Location, Machine Name, and Task Details!");
                    return;
                  }
                  if (editingDraftIndex !== null) {
                    const updated = [...draftJobs];
                    updated[editingDraftIndex] = draftItemForm;
                    setDraftJobs(updated);
                  }
                  setDraftItemForm(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs transition cursor-pointer"
              >
                Save Job Draft
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bento Layout Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Summary, Info widget & Broadcaster (Col-span-3) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* STATS WIDGET */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-display">Total Work Status</h3>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">Pending Jobs</span>
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100">
                    {String(planWork.filter(j => j.workStatus === "Pending").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full">
                  <div 
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${planWork.length ? (planWork.filter(j => j.workStatus === "Pending").length / planWork.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">In Progress</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100">
                    {String(planWork.filter(j => j.workStatus === "Running").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${planWork.length ? (planWork.filter(j => j.workStatus === "Running").length / planWork.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 font-sans">Completed Done</span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                    {String(planWork.filter(j => j.workStatus === "Done").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${planWork.length ? (planWork.filter(j => j.workStatus === "Done").length / planWork.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>



          {/* WHATSAPP PLAN BROADCASTER */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
                Plan Broadcaster
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal font-medium font-sans">
                Export and copy jobs lists configured for target dates.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Target Share Date */}
              <div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  defaultValue={tomorrowStr}
                  onChange={(e) => {
                    (window as any).whatsAppTargetDate = e.target.value;
                  }}
                  className="text-xs outline-none bg-transparent font-semibold text-slate-700 text-right w-full font-sans"
                  id="whatsapp-target-date"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => {
                      const d = ((document.getElementById("whatsapp-target-date") as HTMLInputElement)?.value) || tomorrowStr;
                      handleCopyText("daily", d);
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                    title="Copy Daily Plan"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      const d = ((document.getElementById("whatsapp-target-date") as HTMLInputElement)?.value) || tomorrowStr;
                      handleWhatsAppShare("daily", d);
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                    title="Share directly in WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    Share
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => {
                      const d = ((document.getElementById("whatsapp-target-date") as HTMLInputElement)?.value) || tomorrowStr;
                      handleCopyText("Shutdown", d);
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                    title="Copy Shutdown Plan"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    Copy SD
                  </button>
                  <button
                    onClick={() => {
                      const d = ((document.getElementById("whatsapp-target-date") as HTMLInputElement)?.value) || tomorrowStr;
                      handleWhatsAppShare("Shutdown", d);
                    }}
                    className="px-2 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-white hover:shadow-sm rounded transition-all cursor-pointer flex items-center justify-center gap-1 font-sans"
                    title="Share directly in WhatsApp"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                    Share SD
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Table Area & Filters (Col-span-9) */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="planner-list-container">
            
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-50/50 gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  Maintenance Job Queue
                  <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-bold">
                    {filteredPlanWork.length} Jobs Listed
                  </span>
                </h3>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("all");
                    setFilterStatus("all");
                    setFilterDate("");
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm cursor-pointer transition-all flex items-center gap-1 font-sans"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-slate-100 text-xs bg-white font-sans">
              {/* Search text */}
              <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search machine, tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Category filter */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700"
                >
                  <option value="all">All Categories</option>
                  <option value="daily">Daily Plan</option>
                  <option value="Shutdown">Shutdown Plan</option>
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Running">Running</option>
                  <option value="Done">Done</option>
                </select>
              </div>



              {/* Date filter */}
              <div className="flex items-center space-x-1.5">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-medium"
                />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate("")}
                    className="text-xs text-red-500 font-bold hover:underline cursor-pointer shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Table representation (Desktop) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-200 uppercase tracking-widest font-sans">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Category / Date</th>
                    <th className="px-4 py-3">Location & Machine</th>
                    <th className="px-4 py-3 w-1/3">Task Details & Spares</th>
                    <th className="px-4 py-3">Responsibility</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date Note</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Fetching latest planner queue...
                      </td>
                    </tr>
                  ) : filteredPlanWork.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                        No active maintenance tasks match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPlanWork.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 transition group">
                        <td className="px-4 py-4 font-mono font-bold text-slate-400 text-xs">{job.id}</td>
                        
                        <td className="px-4 py-4 space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            job.planCatagory === "Shutdown" 
                              ? "bg-purple-50 text-purple-700 border-purple-200" 
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {job.planCatagory}
                          </span>
                          <div className="text-slate-500 font-semibold">{formatDisplayDate(job.planDate)}</div>
                        </td>

                        <td className="px-4 py-4 space-y-0.5">
                          <div className="font-bold text-slate-900 font-display">{job.location}</div>
                          <div className="text-slate-500 font-medium text-xs font-sans">{job.machineName}</div>
                          {job.equipment && (
                            <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 inline-block font-semibold mt-1">
                              {job.equipment}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 space-y-1.5">
                          <p className="text-slate-800 font-semibold break-words leading-relaxed">{job.taskDetails}</p>
                          {job.requiredSpareParts && (
                            <div className="text-[10px] text-slate-500 font-medium font-sans">
                              <span className="font-bold text-slate-600">Spare Required:</span> {job.requiredSpareParts}
                            </div>
                          )}
                          {job.workNote && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-dashed leading-normal font-medium font-sans">
                              <span className="font-semibold text-slate-700">Engineer Note:</span> {job.workNote}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 font-sans">
                            {job.plannedResponsibilities.length === 0 ? (
                              <span className="text-slate-400 italic">Unassigned</span>
                            ) : (
                              job.plannedResponsibilities.map((worker) => (
                                <span 
                                  key={worker}
                                  className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded border border-slate-200"
                                >
                                  {worker}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.workStatus === "Done"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : job.workStatus === "Running"
                              ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {job.workStatus === "Done" ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            ) : job.workStatus === "Running" ? (
                              <Clock className="w-3 h-3 text-amber-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-slate-500" />
                            )}
                            {job.workStatus}
                          </span>
                        </td>

                        <td className="px-4 py-4 space-y-1 text-[11px] font-sans">
                          {job.dateNote ? (
                            <div className="text-red-600 font-semibold leading-tight text-[10px] max-w-[180px]">
                              ⚠️ {job.dateNote}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px] font-medium font-sans">No carry-forwards</span>
                          )}
                          {job.doneDate && (
                            <div className="text-emerald-600 font-bold text-[10px]">
                              ✓ Completed: {formatDisplayDate(job.doneDate)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setEditingJob(job)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-slate-100 p-2 rounded-lg transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Card representation (Mobile) */}
            <div className="block md:hidden space-y-3.5">
              {isLoading ? (
                <div className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Fetching latest planner queue...
                </div>
              ) : filteredPlanWork.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium bg-white rounded-xl border border-slate-200">
                  No active maintenance tasks match the active filters.
                </div>
              ) : (
                filteredPlanWork.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedViewJob(job)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition cursor-pointer space-y-2.5 relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border text-[10px]">
                          {job.id}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          job.planCatagory === "Shutdown" 
                            ? "bg-purple-50 text-purple-700 border-purple-100" 
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          {job.planCatagory}
                        </span>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                        job.workStatus === "Done"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : job.workStatus === "Running"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {job.workStatus}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 font-display text-sm">
                        {job.location} &rarr; {job.machineName}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed line-clamp-2">
                        {job.taskDetails}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                      <span>Date: {formatDisplayDate(job.planDate)}</span>
                      <span className="text-blue-600 font-bold flex items-center gap-0.5">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
              <p className="text-xs text-slate-500 font-semibold">
                Showing {filteredPlanWork.length} of {planWork.length} active planner tasks
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Priority Required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-sans">Completed Done</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 5. SINGLE JOB EDIT OVERLAY MODAL */}
      {editingJob && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="edit-job-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold">Edit Plan Work Item: {editingJob.id}</h3>
                <p className="text-xs text-slate-400">Modify properties of this scheduled maintenance action.</p>
              </div>
              <button 
                onClick={() => setEditingJob(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Category, Date, Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={editingJob.planCatagory}
                    onChange={(e) => setEditingJob({ ...editingJob, planCatagory: e.target.value as PlanCatagory })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="daily">Daily Plan</option>
                    <option value="Shutdown">Shutdown Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Plan Date</label>
                  <input
                    type="date"
                    value={editingJob.planDate}
                    onChange={(e) => setEditingJob({ ...editingJob, planDate: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Status</label>
                  <select
                    value={editingJob.workStatus}
                    onChange={(e) => setEditingJob({ ...editingJob, workStatus: e.target.value as JobStatus })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Running">Running</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              {/* Location, Machine, Equipment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Location</label>
                  <input
                    type="text"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Machine Name</label>
                  <input
                    type="text"
                    value={editingJob.machineName}
                    onChange={(e) => setEditingJob({ ...editingJob, machineName: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Equipment</label>
                  <input
                    type="text"
                    value={editingJob.equipment}
                    onChange={(e) => setEditingJob({ ...editingJob, equipment: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Task details */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Task Details</label>
                <textarea
                  rows={2}
                  value={editingJob.taskDetails}
                  onChange={(e) => setEditingJob({ ...editingJob, taskDetails: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Required spare and worker responsibilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Required Spare Parts</label>
                  <input
                    type="text"
                    value={editingJob.requiredSpareParts}
                    onChange={(e) => setEditingJob({ ...editingJob, requiredSpareParts: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Worker Responsibilities
                  </label>
                  <div className="flex flex-wrap gap-1 border border-slate-200 p-1.5 rounded min-h-[38px]">
                    {workersList.map((worker) => {
                      const isAssigned = editingJob.plannedResponsibilities.includes(worker);
                      return (
                        <button
                          key={worker}
                          type="button"
                          onClick={() => {
                            const list = isAssigned
                              ? editingJob.plannedResponsibilities.filter(w => w !== worker)
                              : [...editingJob.plannedResponsibilities, worker];
                            setEditingJob({ ...editingJob, plannedResponsibilities: list });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                            isAssigned 
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {worker}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Work Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Work Note</label>
                <input
                  type="text"
                  value={editingJob.workNote}
                  onChange={(e) => setEditingJob({ ...editingJob, workNote: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* History / Date Notes (READ ONLY) */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Non-Editable System Trace Logs
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Date Note History:</span>
                    <p className="text-red-600 font-medium font-mono text-[10px] bg-red-50/40 p-1 mt-1 rounded border border-red-100/50">
                      {editingJob.dateNote || "No Carry Forwards Record"}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Done Date:</span>
                    <p className="text-emerald-700 font-semibold p-1 mt-1 rounded">
                      {editingJob.doneDate ? formatDisplayDate(editingJob.doneDate) : "Not completed yet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attached Images */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  Visual Attachments
                </label>
                <div className="flex items-center space-x-3 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(0, e, true)}
                    className="hidden"
                    id="modal-image-upload"
                    disabled={isUploadingImage}
                  />
                  <label
                    htmlFor={isUploadingImage ? "" : "modal-image-upload"}
                    className={`px-3 py-1.5 rounded text-xs border cursor-pointer inline-flex items-center gap-1 font-semibold transition ${
                      isUploadingImage 
                        ? "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                    }`}
                  >
                    {isUploadingImage ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                        Uploading to Drive...
                      </>
                    ) : (
                      "Add Photo"
                    )}
                  </label>
                </div>

                {editingJob.images && editingJob.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border border-slate-100 bg-slate-50 rounded-lg">
                    {editingJob.images.map((base64, index) => (
                      <div key={index} className="relative w-16 h-16 rounded border overflow-hidden shadow-sm">
                        <img src={base64} className="w-full h-full object-cover" alt="Attached Report" />
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = editingJob.images.filter((_, i) => i !== index);
                            setEditingJob({ ...editingJob, images: filtered });
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setEditingJob(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingJob) {
                    await onUpdateJob(editingJob.id, editingJob);
                    setEditingJob(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-xs transition cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 5.1 MOBILE SINGLE JOB DETAIL MODAL */}
      {selectedViewJob && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-0 md:p-4 z-50 overflow-hidden" id="view-job-details-modal">
          <div className="bg-white rounded-none md:rounded-xl shadow-xl border-t md:border border-slate-200 w-full h-full md:h-auto md:max-h-[90vh] max-w-2xl overflow-hidden animate-fade-in flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <Clipboard className="text-amber-400 w-5 h-5 shrink-0" />
                  Task Details Sheet: {selectedViewJob.id}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">Comprehensive overview of the scheduled maintenance action.</p>
              </div>
              <button 
                onClick={() => setSelectedViewJob(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    selectedViewJob.planCatagory === "Shutdown" 
                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {selectedViewJob.planCatagory}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Date</span>
                  <span className="text-slate-800 font-bold block mt-1">{formatDisplayDate(selectedViewJob.planDate)}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asset & Location</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Location</span>
                    <p className="text-slate-800 font-bold">{selectedViewJob.location}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Machine Name</span>
                    <p className="text-slate-800 font-bold">{selectedViewJob.machineName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Equipment Group</span>
                    <p className="text-slate-800 font-bold">{selectedViewJob.equipment || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Maintenance Task & Details</span>
                <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200/60 whitespace-pre-line">
                  {selectedViewJob.taskDetails}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Required Spares</span>
                  <p className="text-slate-800 font-medium bg-amber-50/30 text-amber-900 p-3 rounded-lg border border-amber-100/40 min-h-[44px]">
                    {selectedViewJob.requiredSpareParts || "No spare parts requested."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Manpower</span>
                  <div className="flex flex-wrap gap-1 border border-slate-200 p-2.5 rounded-lg min-h-[44px] bg-slate-50">
                    {selectedViewJob.plannedResponsibilities.length === 0 ? (
                      <span className="text-slate-400 italic">No workers assigned yet.</span>
                    ) : (
                      selectedViewJob.plannedResponsibilities.map((worker) => (
                        <span key={worker} className="px-2 py-0.5 bg-white text-slate-700 font-bold text-[10px] rounded border border-slate-300 shadow-sm">
                          {worker}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {selectedViewJob.workNote && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Execution Work Note / Remarks</span>
                  <p className="text-slate-800 font-medium leading-relaxed bg-blue-50/20 p-4 rounded-lg border border-blue-100/40">
                    {selectedViewJob.workNote}
                  </p>
                </div>
              )}

              {/* Status and Trace Logs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                    selectedViewJob.workStatus === "Done"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : selectedViewJob.workStatus === "Running"
                      ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {selectedViewJob.workStatus}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carry-Forward Log</span>
                  <p className="text-red-600 font-semibold text-[10px] mt-1">
                    {selectedViewJob.dateNote || "No Carry Forwards"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion Date</span>
                  <p className="text-emerald-700 font-semibold text-[10px] mt-1">
                    {selectedViewJob.doneDate ? formatDisplayDate(selectedViewJob.doneDate) : "Incomplete"}
                  </p>
                </div>
              </div>

              {/* Visual Attachments */}
              {selectedViewJob.images && selectedViewJob.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visual Attachments</span>
                  <div className="flex flex-wrap gap-3">
                    {selectedViewJob.images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                        <img src={img} className="w-full h-full object-cover" alt="Attachment" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100 shrink-0">
              <button
                onClick={() => {
                  setEditingJob(selectedViewJob);
                  setSelectedViewJob(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition cursor-pointer shadow-sm flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit / Update Work
              </button>
              
              <button
                onClick={() => setSelectedViewJob(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
