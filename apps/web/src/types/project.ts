/** 4 estados: solo "Terminado" lo marca una persona; el resto se calcula con los pagos. */
export type ProjectStatus = "PENDING_ADVANCE" | "IN_PROGRESS" | "FINISHED" | "DELIVERED";

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  total_value: string;
  advance_percent: number;
  progress: number;
  amount_paid: string;
  fully_paid: boolean;
  start_date: string | null;
  estimated_date: string | null;
  delivered_at: string | null;
  drive_folder_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  member_ids: string[];
  member_names: string[];
  engineer_profile_id?: string | null;
  engineer_profile_name?: string | null;
  assigned_engineer_id?: string | null;
  assigned_engineer_name?: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PENDING_ADVANCE: "Anticipo",
  IN_PROGRESS: "En curso",
  FINISHED: "Terminado",
  DELIVERED: "Entregado",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  PENDING_ADVANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  IN_PROGRESS:     "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  FINISHED:        "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  DELIVERED:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};
