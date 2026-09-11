import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { formatDate, humanise } from "@muco/core";
import { Callout, EmptyState, Icon } from "@muco/ui";
import { DocumentUpload } from "@/components/DocumentUpload";

export const metadata: Metadata = { title: "My documents" };

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1_000_000
    ? (bytes / 1_048_576).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

// Your own identity and bank documents. Yours to add, yours to see, and nobody
// else's to browse: the storage policy keys on the path, and the path carries
// your user id, so another employee asking for this folder is refused by the
// bucket rather than by this page.
export default async function DocumentsPage() {
  const { supabase, userId, organizationId } = await requireAccount("employee");

  const { data: documents } = await supabase
    .from("person_documents")
    .select("id,kind,label,path,mime_type,size_bytes,uploaded_at")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Yours alone</span>
        <h1>My documents</h1>
        <p className="lede">
          Identity and bank details the studio needs on file. You add them and you can see them; no
          other employee can, and the studio sees only that a document exists and what kind it is.
        </p>
      </div>

      <Callout tone="warn" icon="shield" title="Before you upload">
        Send the document the studio actually asked for and nothing more. An identity document is a
        photograph of a card, not a folder of everything with your name on it, and a smaller amount
        of your data here is better for you as well as for the studio.
      </Callout>

      <section className="panel">
        <div className="panel-head"><h2>Add a document</h2></div>
        <div className="panel-body">
          <DocumentUpload userId={userId} organizationId={organizationId} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>On file</h2>
          <span className="hint">{(documents ?? []).length} documents</span>
        </div>
        {(documents ?? []).length === 0 ? (
          <EmptyState icon="fileText" title="Nothing on file yet">
            The studio will tell you which documents it needs. Nothing is required simply to use
            this workspace.
          </EmptyState>
        ) : (
          <div className="list">
            {(documents ?? []).map(document => (
              <div className="item" key={document.id}>
                <Icon name="fileText" size={16} />
                <span className="item-main">
                  <b className="truncate">{document.label ?? humanise(document.kind)}</b>
                  <small>
                    {humanise(document.kind)} · uploaded {formatDate(document.uploaded_at)}
                    {document.size_bytes ? " · " + size(document.size_bytes) : ""}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="notice">
        <Icon name="lock" size={14} />
        <span>
          Files here are stored in a private bucket. A link to one is signed and short-lived; there
          is no public address for any of them.
        </span>
      </p>
    </div>
  );
}
