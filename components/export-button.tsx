"use client";

import { Download } from "lucide-react";
import type { Repair } from "@/lib/types";

export function ExportButton({ repairs }: { repairs: Repair[] }) {
  return <button className="btn-secondary" onClick={() => {
    const rows = repairs.map((r) => ({
      "Repair Number": r.repair_number, "Customer Name": r.customers?.full_name,
      "Phone Number": r.customers?.phone_number, "Alternate Phone Number": r.alternate_phone_number,
      Email: r.customers?.email, Instrument: r.instrument, Issue: r.issue_description,
      Amount: r.amount, "Payment Status": r.payment_status,
      Status: r.status, "Received Date": r.received_date,
      "Completed Date": r.completed_date, "Collected Date": r.collected_date,
      "Cancelled Date": r.cancelled_date,
    }));
    const headers = Object.keys(rows[0] ?? {
      "Repair Number": "", "Customer Name": "", "Phone Number": "", "Alternate Phone Number": "",
      Email: "", Instrument: "", Issue: "", Amount: "", "Payment Status": "", Status: "", "Received Date": "",
      "Completed Date": "", "Collected Date": "",
      "Cancelled Date": "",
    });
    const escape = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rowXml = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
      .map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escape(cell)}</Data></Cell>`).join("")}</Row>`).join("");
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Repairs"><Table>${rowXml}</Table></Worksheet></Workbook>`;
    const url = URL.createObjectURL(new Blob([workbook], { type: "application/vnd.ms-excel" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `jas-repairs-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }}><Download size={16} />Export Excel</button>;
}
