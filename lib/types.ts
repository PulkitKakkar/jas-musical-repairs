export type RepairStatus = "RECEIVED" | "DONE" | "COLLECTED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type HireStatus = "HIRED" | "RETURNED";
export type HirePaymentMethod = "CASH" | "CARD";

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  created_at: string;
};

export type Repair = {
  id: string;
  repair_number: string;
  customer_id: string;
  instrument: string;
  issue_description: string;
  amount: number;
  payment_status: PaymentStatus;
  payment_amount: number;
  alternate_phone_number: string | null;
  status: RepairStatus;
  received_date: string;
  completed_date: string | null;
  collected_date: string | null;
  cancelled_date: string | null;
  collection_reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
};

export type Hire = {
  id: string;
  hire_number: string;
  customer_id: string;
  instrument: string;
  hire_date: string;
  return_due_date: string;
  returned_date: string | null;
  hire_duration_days: number;
  hire_cost: number;
  hire_vat: number;
  hire_total: number;
  late_return_daily_charge: number;
  security_deposit: number;
  payment_method: HirePaymentMethod;
  card_processing_fee: number;
  extra_charge: number;
  return_amount: number;
  status: HireStatus;
  hire_sms_sent_at: string | null;
  return_reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
};

export type AuditLog = {
  id: string;
  repair_id: string;
  user_id: string | null;
  action: string;
  old_status: RepairStatus | null;
  new_status: RepairStatus | null;
  created_at: string;
};
