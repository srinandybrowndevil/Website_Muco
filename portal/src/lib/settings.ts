import { createClient } from "@/lib/supabase/server";

// The settings a workspace can state out loud: where somebody goes for help,
// what happens on final payment, how long a certificate window stays open.
//
// Everyone with a membership may read them, which is the point -- an intern
// needs the support address and a client needs the handover sentence. Only an
// administrator writes them.
export type WorkspaceSettings = {
  signaturePath: string | null;
  letterheadPath: string | null;
  graceDays: number;
  attendanceThreshold: number;
  supportEmail: string | null;
  handoverNote: string;
};

// Used when the row has not been created yet, or cannot be read. A missing
// settings row must never blank out a page that is otherwise fine -- the
// defaults here are the same ones the column defaults use.
export const SETTINGS_FALLBACK: WorkspaceSettings = {
  signaturePath: null,
  letterheadPath: null,
  graceDays: 7,
  attendanceThreshold: 75,
  supportEmail: null,
  handoverNote:
    "Your code, accounts and access transfer to you on final payment. Nothing is held back afterwards.",
};

export async function readSettings(organizationId: string): Promise<WorkspaceSettings> {
  const client = await createClient();
  if (!client) return SETTINGS_FALLBACK;

  const { data } = await client.from("organization_settings")
    .select("signature_path, letterhead_path, default_grace_days, attendance_threshold, support_email, handover_note")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return SETTINGS_FALLBACK;
  return {
    signaturePath: data.signature_path ?? null,
    letterheadPath: data.letterhead_path ?? null,
    graceDays: data.default_grace_days ?? SETTINGS_FALLBACK.graceDays,
    attendanceThreshold: data.attendance_threshold ?? SETTINGS_FALLBACK.attendanceThreshold,
    supportEmail: data.support_email ?? null,
    handoverNote: data.handover_note || SETTINGS_FALLBACK.handoverNote,
  };
}
