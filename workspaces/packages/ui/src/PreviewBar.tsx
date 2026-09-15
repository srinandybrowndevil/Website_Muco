import { isLocalPreview, previewWorkspaces } from "@muco/core";

export function PreviewBar() {
  if (!isLocalPreview) return null;
  return (
    <aside className="local-preview" aria-label="Local preview">
      <div>
        <strong>Local preview · Sample data</strong>
        <p>Authentication is disconnected. Changes stay on this computer.</p>
      </div>
      <nav aria-label="Switch preview workspace">
        <a href="http://localhost:8123">Website</a>
        {previewWorkspaces.map(workspace => (
          <a key={workspace.key} href={`http://localhost:${workspace.port}/login`}>{workspace.name}</a>
        ))}
      </nav>
    </aside>
  );
}
