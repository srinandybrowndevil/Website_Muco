export type WebsiteEnquiryStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "closed"
  | "spam";

export type WebsiteEnquiry = {
  id: string;
  organization_id: string;
  name: string;
  business: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  service: string | null;
  website: string | null;
  budget: string | null;
  timeline: string | null;
  message: string;
  page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  channel: string | null;
  ip: string | null;
  status: WebsiteEnquiryStatus;
  created_at: string;
  updated_at: string;
  converted_at?: string | null;
  converted_lead_id?: string | null;
};

export const statusOrder: WebsiteEnquiryStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
  "spam",
];

export const statusLabel: Record<WebsiteEnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  closed: "Closed",
  spam: "Spam",
};

export function statusTone(status: WebsiteEnquiryStatus) {
  switch (status) {
    case "converted":
      return "low active ontrack paid accepted";
    case "qualified":
      return "medium pending viewed";
    case "contacted":
      return "pending viewed";
    case "closed":
      return "high atrisk overdue";
    case "spam":
      return "high atrisk overdue";
    default:
      return "onboarding planning draft sent";
  }
}

export const demoEnquiries: WebsiteEnquiry[] = [
  {
    id: "demo-enquiry-1",
    organization_id: "demo",
    name: "Preview Customer",
    business: "MUCO LABS",
    phone: "+91 9876543210",
    email: "preview@mucolabs.demo.local",
    location: "Erode",
    service: "Website",
    website: null,
    budget: "₹1L – ₹5L",
    timeline: "1–3 months",
    message:
      "This is a preview enquiry shown while Supabase is not connected. Connect Supabase to see real submissions.",
    page: "/contact",
    referrer: "direct",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    channel: "whatsapp",
    ip: null,
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
