import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate } from "@muco/core";
import { EmptyState, Icon } from "@muco/ui";
import { loadCustomer } from "@/lib/project";
import { FileLink } from "@/components/FileLink";

export const metadata: Metadata = { title: "Files" };

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_000_000
    ? (bytes / 1_048_576).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

// Documents the studio has shared with this customer.
//
// The policy admits kind = 'document' and nothing else, so working files,
// source and internal notes attached to the same project are not merely hidden
// from this page — they are not returned to this account at all.
export default async function FilesPage() {
  const { supabase, userId } = await requireAccount("client");
  const customer = await loadCustomer(supabase, userId);
  if (!customer) return <div className="page"><EmptyState icon="building" title="Your organisation is not linked yet" /></div>;

  const { data: files } = await supabase
    .from("files")
    .select("id,name,kind,bucket,path,mime_type,size_bytes,created_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Shared with you</span>
        <h1>Files</h1>
        <p className="lede">
          Documents the studio has shared: proposals, scope sheets, exports and handover material.
          Working files and source code are not shared here — those arrive at handover, on final
          payment, in the accounts that become yours.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Documents</h2>
          <span className="hint">{(files ?? []).length}</span>
        </div>
        {(files ?? []).length === 0 ? (
          <EmptyState icon="folder" title="Nothing shared yet">
            When the studio shares a document it appears here, and it stays here — you do not have
            to keep the email it arrived in.
          </EmptyState>
        ) : (
          <div className="list">
            {(files ?? []).map(file => (
              <div className="item" key={file.id}>
                <Icon name="fileText" size={17} />
                <span className="item-main">
                  <b className="truncate">{file.name}</b>
                  <small>
                    {formatDate(file.created_at)}
                    {file.size_bytes ? " · " + size(file.size_bytes) : ""}
                  </small>
                </span>
                <FileLink bucket={file.bucket} path={file.path} name={file.name} />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="lock" size={14} />
        <span>
          These are stored privately. Opening one creates a link that works for a few minutes and
          then stops, so a copied address is not a permanent back door into your documents.
        </span>
      </p>
    </div>
  );
}
