export type Lead = {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: "New" | "Qualified" | "Proposal" | "Negotiation";
  owner: string;
  source: string;
  lastContact: string;
};

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  value: number;
  status: "Active" | "At risk" | "Onboarding";
  initials: string;
};

export type Project = {
  name: string;
  client: string;
  progress: number;
  due: string;
  budget: number;
  health: "On track" | "At risk" | "Planning";
};

// All names, companies and figures below are clearly illustrative demo data.
// They are not real clients of MUCO LABS.

export const leads: Lead[] = [
  { id: "LD-1048", name: "Arun Kumar", company: "Sri Sakthi Agencies", value: 240000, stage: "New", owner: "Srinivash", source: "WhatsApp", lastContact: "12m ago" },
  { id: "LD-1044", name: "Priya Venkatesh", company: "Salem Systems", value: 480000, stage: "Qualified", owner: "Yuvan", source: "Website", lastContact: "2h ago" },
  { id: "LD-1039", name: "Manoj Ramesh", company: "Royal Tex", value: 365000, stage: "Proposal", owner: "Srinivash", source: "Referral", lastContact: "Yesterday" },
  { id: "LD-1034", name: "Deepa S", company: "Palani Foods", value: 180000, stage: "Negotiation", owner: "Keerthi", source: "Direct walk-in", lastContact: "2d ago" },
  { id: "LD-1028", name: "Kavin Raj", company: "Karur Exports", value: 620000, stage: "Qualified", owner: "Yuvan", source: "Google Business", lastContact: "3d ago" },
  { id: "LD-1022", name: "Lakshmi N", company: "Kovai Traders", value: 295000, stage: "New", owner: "Keerthi", source: "Website", lastContact: "4d ago" },
];

export const customers: Customer[] = [
  { id: "CU-248", name: "Anitha Ramesh", company: "Sri Sakthi Agencies", email: "accounts@srisakthi.demo.local", value: 840000, status: "Active", initials: "AR" },
  { id: "CU-241", name: "Bharath Kumar", company: "Kovai Traders", email: "bharath@kovaitraders.demo.local", value: 475000, status: "Onboarding", initials: "BK" },
  { id: "CU-237", name: "Chitra Devi", company: "Royal Tex", email: "chitra@royaltex.demo.local", value: 920000, status: "Active", initials: "CD" },
  { id: "CU-229", name: "Daniel Joseph", company: "Salem Systems", email: "daniel@salemsystems.demo.local", value: 330000, status: "At risk", initials: "DJ" },
  { id: "CU-218", name: "Esther Jeyakumar", company: "Karur Exports", email: "esther@karurexports.demo.local", value: 685000, status: "Active", initials: "EJ" },
];

export const tasks = [
  { title: "Follow up with Sri Sakthi Agencies", meta: "Sri Sakthi Agencies · Today, 10:30", priority: "High", done: false },
  { title: "Send revised GST scope to Royal Tex", meta: "Royal Tex · Today, 14:00", priority: "High", done: false },
  { title: "Onboarding call with Kovai Traders", meta: "Kovai Traders · Tomorrow, 09:00", priority: "Medium", done: false },
  { title: "Quarterly review with Salem Systems", meta: "Salem Systems · Wed, 11:00", priority: "Low", done: false },
  { title: "Archive signed Karur Exports NDA", meta: "Karur Exports · Completed", priority: "Low", done: true },
];

export const projects: Project[] = [
  { name: "Sri Sakthi Billing System", client: "Sri Sakthi Agencies", progress: 76, due: "31 Oct 2026", budget: 420000, health: "On track" },
  { name: "Royal Tex E-Commerce", client: "Royal Tex", progress: 52, due: "15 Nov 2026", budget: 685000, health: "On track" },
  { name: "Palani Foods Mobile App", client: "Palani Foods", progress: 34, due: "05 Dec 2026", budget: 310000, health: "At risk" },
  { name: "Kovai Traders Website", client: "Kovai Traders", progress: 18, due: "22 Dec 2026", budget: 475000, health: "Planning" },
];

export type DocumentRow = {
  id: string;
  customer: string;
  detail: string;
  value: number;
  status: "Sent" | "Viewed" | "Draft" | "Accepted" | "Paid" | "Pending" | "Overdue";
};

export const documents: { proposals: DocumentRow[]; invoices: DocumentRow[] } = {
  proposals: [
    { id: "PR-1092", customer: "Salem Systems", detail: "Digital flagship store", value: 480000, status: "Sent" },
    { id: "PR-1089", customer: "Royal Tex", detail: "B2B order portal", value: 365000, status: "Viewed" },
    { id: "PR-1083", customer: "Karur Exports", detail: "Product catalogue", value: 620000, status: "Draft" },
    { id: "PR-1077", customer: "Palani Foods", detail: "Growth sprint", value: 180000, status: "Accepted" },
  ],
  invoices: [
    { id: "INV-2048", customer: "Sri Sakthi Agencies", detail: "31 Oct 2026", value: 140000, status: "Paid" },
    { id: "INV-2047", customer: "Royal Tex", detail: "08 Nov 2026", value: 225000, status: "Pending" },
    { id: "INV-2044", customer: "Palani Foods", detail: "28 Oct 2026", value: 100000, status: "Overdue" },
    { id: "INV-2041", customer: "Kovai Traders", detail: "12 Nov 2026", value: 85000, status: "Draft" },
  ],
};

export const nav = [
  ["Command center", "/", "grid"],
  ["Enquiries", "/enquiries", "mail"],
  ["Requests", "/requests", "inbox"],
  ["Analytics", "/analytics", "barChart"],
  ["Leads", "/leads", "target"],
  ["Customers", "/customers", "users"],
  ["Follow-ups", "/tasks", "check"],
  ["Projects", "/projects", "briefcase"],
  ["Proposals", "/proposals", "file"],
  ["Invoices", "/invoices", "receipt"],
  ["Files", "/files", "folder"],
  ["Reports", "/reports", "chart"],
  ["Automation", "/automation", "bolt"],
  ["Team", "/settings", "users"],
] as const;

export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const shortDate = (date: Date) =>
  date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
