"use client";

import { Printer } from "lucide-react";

export function ReceiptActions() {
  return <div className="print:hidden"><button className="btn-secondary" onClick={() => window.print()}><Printer size={16} />Print receipt</button></div>;
}
