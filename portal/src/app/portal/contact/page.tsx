import { CustomerShell } from "@/components/portal/CustomerShell";
import { requireWorkspace } from "@/lib/workspace";
import Link from "next/link";

export default async function ContactPage() {
  await requireWorkspace(true);
  return <CustomerShell><section className="panel"><h1>Talk to MUCO LABS.</h1><p>Submit a project request to keep your requirements and progress together in your workspace. For a conversation, choose email, WhatsApp or a phone call.</p><div className="contact-actions"><Link className="primary" href="/portal/requests/new">Submit project request</Link><a className="secondary" href="mailto:founder@mucolabs.com">Send email</a><a className="secondary" href="https://wa.me/916381809844" target="_blank" rel="noopener noreferrer">Open WhatsApp</a><a className="secondary" href="tel:+916381809844">Call MUCO LABS</a></div><p>WhatsApp and email open their own apps. Press Send there to send your message. Only portal requests appear in your request history.</p></section></CustomerShell>;
}
