export type RepairStatus = "RECEIVED" | "DONE" | "COLLECTED";

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
  status: RepairStatus;
  received_date: string;
  completed_date: string | null;
  collected_date: string | null;
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
