export type PaymentType = "ADVANCE" | "PARTIAL" | "FINAL";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";

export interface Payment {
  id: string;
  project_id: string;
  user_id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: string;
  wompi_ref: string | null;
  wompi_id: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithCheckout extends Payment {
  checkout_url: string;
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  ADVANCE: "Anticipo",
  PARTIAL: "Pago parcial",
  FINAL: "Pago final",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  FAILED: "Fallido",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};
