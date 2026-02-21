export type ExpenseStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";

export type ExpenseHeading = {
  id: string;
  name: string;
  code: string;
  glAccount?: string;
  taxTreatment?: "INCLUSIVE" | "EXCLUSIVE" | "NA";
  perTxnLimit?: number | null;
  dailyLimit?: number | null;
  isActive: boolean;
  notes?: string;
};

export type ExpenseHeadingResponse = {
  rowId: number;
  expenseName: string;
  expenseCode: string;
  isActive: boolean;
  taxTreatment: "INCLUSIVE" | "EXCLUSIVE" | "NA";
  perTxnLimit: number | null;
  dailyLimit: number | null;
  note: string | null;
  glAccount?: string | null;
};

export type Expense = {
  id: string;
  businessId: string;
  title: string;
  headingId: string;
  amount: number;
  currency: string;
  date: string;
  merchant?: string;
  description?: string;
  requesterId: string;
  status: ExpenseStatus;
  attachments?: { id: string; name: string; url?: string }[];
  approvals: {
    managerId: string;
    requestedAt: string;
    decidedAt?: string;
    decision?: "APPROVE" | "REJECT";
    note?: string;
  }[];
  transaction?: {
    id: string;
    method: PaymentMethod;
    paidAt: string;
    reference?: string;
    amount: number;
    attachmentUrl?: string;
  };
};

export type CreateExpensePayload = {
  title: string;
  headingId: string;
  amount: number;
  currency: string;
  date: string;
  merchant?: string;
  description?: string;
  requesterId: string;
};
