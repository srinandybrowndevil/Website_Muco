import { isLocalPreview } from "./preview-mode";
import { executePreview, readPreviewFile } from "./preview-server";
import type { PreviewOperation } from "./preview-client";
import type { WorkspaceKey } from "./workspaces";

function localRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return isLocalPreview && (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost"));
}
const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export function previewRoutes(workspace: WorkspaceKey) {
  return {
    async POST(request: Request) {
      if (!localRequest(request)) return new Response(null, { status: 404 });
      if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
      if (!request.headers.get("content-type")?.includes("application/json")) return new Response(null, { status: 415 });
      if (Number(request.headers.get("content-length")) > 36 * 1024 * 1024) return new Response(null, { status: 413 });
      try {
        const body = await request.text();
        if (body.length > 36 * 1024 * 1024) return new Response(null, { status: 413 });
        const operation = JSON.parse(body) as PreviewOperation;
        if (!operation || typeof operation !== "object" || Array.isArray(operation)) return new Response(null, { status: 400 });
        const result = await executePreview(workspace, operation);
        return Response.json(result, { headers: noStore });
      } catch { return Response.json({ data: null, error: { message: "The local preview request could not be read." } }, { status: 400, headers: noStore }); }
    },
    async GET(request: Request) {
      if (!localRequest(request)) return new Response(null, { status: 404 });
      const url = new URL(request.url);
      if (["project", "lesson"].includes(url.searchParams.get("sample") ?? "")) {
        const lesson = url.searchParams.get("sample") === "lesson";
        return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MUCO LABS local sample</title><style>body{margin:0;background:#eef3f5;color:#122d40;font:18px/1.7 system-ui}main{max-width:720px;margin:auto;padding:48px 24px}small{font-weight:700}h1{line-height:1.15}a{display:inline-block;padding:12px 0;color:#124c78}</style><main><small>LOCAL PREVIEW · SAMPLE ONLY</small><h1>${lesson ? "Build a form people can use" : "Sample Studio website"}</h1><p>${lesson ? "Give each field a visible label. Use a clear primary action, helpful error messages and a visible keyboard focus. Test at 320px and 390px before reviewing on desktop." : "This local page stands in for a project preview. It lets you check the preview link and return journey without opening a production deployment."}</p><a href="/">Return to workspace</a></main></html>`, { headers: { ...noStore, "Content-Type": "text/html; charset=utf-8" } });
      }
      const bucket = url.searchParams.get("bucket"), path = url.searchParams.get("path");
      if (!bucket || !path) return Response.json({ preview: true, workspace }, { headers: noStore });
      const file = readPreviewFile(bucket, path);
      if (!file) return new Response("This local sample file does not exist.", { status: 404 });
      const image = ["image/jpeg", "image/png", "image/webp"].includes(file.contentType);
      return new Response(new Uint8Array(file.bytes), { headers: { ...noStore, "Content-Type": image ? file.contentType : "application/octet-stream", "X-Content-Type-Options": "nosniff", ...(!image ? { "Content-Disposition": "attachment" } : {}) } });
    },
  };
}
