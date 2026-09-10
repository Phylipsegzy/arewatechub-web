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
