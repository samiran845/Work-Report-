export type PlanCatagory = "daily" | "Shutdown";
export type JobStatus = "Done" | "Running" | "Pending";

export interface SettingBOM {
  location: string;
  machineName: string;
  equipments: string[];
}

export interface Settings {
  bom: SettingBOM[];
  engineers: string[];
  workers: string[];
  appsScriptUrl: string;
  isConfigured?: boolean;
}

export interface PlanWork {
  id: string;
  planCatagory: PlanCatagory;
  planDate: string; // YYYY-MM-DD
  location: string;
  machineName: string;
  equipment: string;
  taskDetails: string;
  requiredSpareParts: string;
  workStatus: JobStatus;
  plannedResponsibilities: string[]; // worker names
  workNote: string;
  images: string[]; // URLs or base64
  dateNote: string; // "1st Carried Forward from:Date, ..."
  doneDate: string; // YYYY-MM-DD or empty
}

export interface ExtraWork {
  id: string;
  date: string; // YYYY-MM-DD
  machineName: string;
  taskDetails: string;
  engineer: string;
  status: JobStatus;
  workNote: string;
  dateNote: string; // "1st Carried Forward from:Date, ..."
  doneDate: string; // YYYY-MM-DD or empty
}

export type ShiftName = "A" | "B" | "C";
