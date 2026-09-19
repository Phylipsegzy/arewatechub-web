export interface Customer {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  wallet_balance: string;
}

export interface WalletTransaction {
  id: number;
  type: "credit" | "debit";
  amount: string;
  source: string;
  reference: string;
  status: "pending" | "successful" | "failed";
  description: string | null;
  created_at: string;
}

export interface Room {
  id: number;
  name: string;
  seat_start: number;
  seat_end: number;
}

export interface WorkspacePlan {
  id: number;
  name: string;
  requires_seat_selection: boolean;
  promo_fixed_end_date: string | null;
  restricted_weekday: number | null;
}

export interface WorkspaceSessionOption {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
}

export interface PlanDuration {
  id: number;
  name: string;
  days: number;
  price: string;
}

export interface Availability {
  available_seats: number[];
  session_name: string;
  start_datetime: string;
  end_datetime: string;
  end_date: string;
}

export interface InternetAccess {
  start_date: string;
  end_date: string;
  internet_account: { username: string; password: string; duration_type: string };
}

export interface Booking {
  id: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  price: string;
  start_date: string;
  end_date: string;
  seat_number: number;
  plan: WorkspacePlan;
  room: Room;
  workspace_session?: WorkspaceSessionOption | null;
  internet_access?: InternetAccess | null;
}

export interface AcademyBatch {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  slots_remaining: number;
  full: boolean;
}

export interface AcademyPricing {
  bootcamp_fee: number;
  non_bootcamp_fee: number;
  tuition_full: number;
  tuition_current: number;
  discount_active: boolean;
  discount_ends_at: string;
}

export interface AcademyEnrollment {
  id: number;
  track_selected: string;
  programme_selected: string;
  bootcamp_option: "bootcamp" | "non_bootcamp";
  status_type: string;
  tuition_tier: string | null;
  bootcamp_fee: string;
  tuition_fee: string;
  amount_due: string;
  amount_paid: string;
  reference: string | null;
  payment_status: "unpaid" | "partial" | "paid";
  application_status: "pending" | "accepted" | "rejected";
  batch: { id: number; name: string; start_date?: string; end_date?: string };
}

export interface TeenProgramPayment {
  id: number;
  payment_type: "registration" | "vip";
  amount: string;
  reference: string;
  created_at: string;
}

export interface TeenProgramRegistration {
  id: number;
  child_firstname: string;
  child_lastname: string;
  child_age: number;
  child_gender: string | null;
  school: string | null;
  parent_name: string;
  parent_phone: string;
  parent_address: string;
  nearest_landmark: string;
  relationship: string | null;
  registration_amount: string;
  registration_payment_status: "unpaid" | "paid";
  vip_requested: boolean;
  vip_amount: string;
  vip_payment_status: "not_requested" | "unpaid" | "paid";
  created_at: string;
  payments?: TeenProgramPayment[];
}
