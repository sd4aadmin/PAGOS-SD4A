export type ProjectStatus =
  | "PENDING_ADVANCE"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "FINISHED"
  | "PENDING_FINAL"
  | "PAID"
  | "DELIVERED";

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  total_value: string;
  advance_percent: number;
  progress: number;
  start_date: string | null;
  estimated_date: string | null;
  delivered_at: string | null;
  drive_folder_id: string | null;
  client_id: string;
  client_name: string;
  client_email: string;
  member_ids: string[];
  member_names: string[];
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  PENDING_ADVANCE: "Pendiente anticipo",
  IN_PROGRESS: "En ejecución",
  IN_REVIEW: "En revisión",
  FINISHED: "Finalizado",
  PENDING_FINAL: "Pendiente pago final",
  PAID: "Pagado",
  DELIVERED: "Entregado",
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  PENDING_ADVANCE: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-purple-100 text-purple-800",
  FINISHED: "bg-green-100 text-green-800",
  PENDING_FINAL: "bg-orange-100 text-orange-800",
  PAID: "bg-emerald-100 text-emerald-800",
  DELIVERED: "bg-gray-100 text-gray-800",
};
