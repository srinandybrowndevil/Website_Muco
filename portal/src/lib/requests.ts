export type ProjectRequestStatus = "new" | "reviewing" | "needs_info" | "accepted" | "declined";

export type RequestAttachment = {
  name: string;
  size: number;
  type: string;
};

export type ProjectRequest = {
  id: string;
  organization_id: string;
  customer_id: string;
  status: ProjectRequestStatus;
  service: string | null;
  title: string;
  problem: string | null;
  requirements: string | null;
  budget_range: string | null;
  timeline: string | null;
  website: string | null;
  reference: string | null;
  contact_preference: "email" | "phone" | "video" | "chat" | null;
  attachments: RequestAttachment[];
  converted_at: string | null;
  converted_lead_id: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
  customers?: { name: string; company: string | null; email?: string | null; phone?: string | null } | null;
};

export const requestStatusOrder: ProjectRequestStatus[] = [
  "new",
  "reviewing",
  "needs_info",
  "accepted",
  "declined",
];

export const requestStatusLabel: Record<ProjectRequestStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  needs_info: "Needs info",
  accepted: "Accepted",
  declined: "Declined",
};

export function requestStatusTone(status: ProjectRequestStatus) {
  switch (status) {
    case "accepted":
      return "low active ontrack paid accepted";
    case "reviewing":
      return "medium pending viewed";
    case "needs_info":
      return "pending viewed";
    case "declined":
      return "high atrisk overdue";
    default:
      return "onboarding planning draft sent";
  }
}

export const contactPreferenceLabel: Record<string, string> = {
  email: "Email",
  phone: "Phone call",
  video: "Video call",
  chat: "Chat / WhatsApp",
};

export const budgetRangeOptions = [
  { value: "", label: "Select a budget range" },
  { value: "< ₹1L", label: "Under ₹1 lakh" },
  { value: "₹1L – ₹5L", label: "₹1 lakh – ₹5 lakhs" },
  { value: "₹5L – ₹15L", label: "₹5 lakhs – ₹15 lakhs" },
  { value: "₹15L – ₹50L", label: "₹15 lakhs – ₹50 lakhs" },
  { value: "> ₹50L", label: "Above ₹50 lakhs" },
  { value: "not-sure", label: "Not sure yet" },
];

export const serviceOptions = [
  { value: "", label: "Select a service" },
  { value: "website", label: "Website" },
  { value: "web-app", label: "Web application" },
  { value: "mobile-app", label: "Mobile app" },
  { value: "branding", label: "Branding & identity" },
  { value: "marketing", label: "Digital marketing" },
  { value: "gst-billing", label: "GST / Billing system" },
  { value: "other", label: "Something else" },
];

export const timelineOptions = [
  { value: "", label: "Select a timeline" },
  { value: "asap", label: "As soon as possible" },
  { value: "1-month", label: "Within 1 month" },
  { value: "1-3-months", label: "1 – 3 months" },
  { value: "3-6-months", label: "3 – 6 months" },
  { value: "6-plus-months", label: "6+ months" },
  { value: "not-sure", label: "Not sure yet" },
];

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const demoRequest: ProjectRequest = {
  id: "demo-request-1",
  organization_id: "demo",
  customer_id: "demo",
  status: "reviewing",
  service: "website",
  title: "Preview: New company website",
  problem: "This is a preview card shown while Supabase is not connected.",
  requirements: "Nothing here is persisted. Connect Supabase to submit real requests.",
  budget_range: "₹1L – ₹5L",
  timeline: "1-3-months",
  website: "https://mucolabs.com",
  reference: "Demo reference",
  contact_preference: "email",
  attachments: [],
  converted_at: null,
  converted_lead_id: null,
  converted_project_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  customers: { name: "Preview Customer", company: "MUCO LABS" },
};
