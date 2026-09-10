import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoAllowed, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { ACCESS_CLOSED_PATH, homeForRole, isAccountPath, isAdminPath, isClientPath, isInternPath, isStaffPath, workspaceDestination } from "@/lib/auth";
import { accessSwitchedOff, primaryMembership } from "@/lib/membership";
import { hostForWorkspace, stripWorkspacePrefix, workspaceForHost } from "@/lib/workspace-host";

// /verify is deliberately public: an employer checking a certificate has no
// account here. The function behind it returns only the fields the
// specification allows on that page.
// /api/password-breach is public because the pages that call it -- signing up
// and recovering an account -- are reached by people who are not signed in. It
// exposes nothing: it accepts five characters of a hash and returns rows from
// a public corpus. Without it here the proxy sends the call to /login, and the
// breach check silently reports itself unavailable forever.
const publicPaths=["/login","/signup","/forgot-password","/reset-password","/verify-email","/complete-profile","/accept-invite","/auth/error","/auth/callback","/verify","/api/password-breach"];
const isPublic=(path:string)=>publicPaths.some(route=>path===route||path.startsWith(`${route}/`));

export async function proxy(request:NextRequest){
  if(!isSupabaseConfigured){
    // Fail closed. Serving the workspace with authentication disabled is worse
    // than serving nothing, so an unconfigured production build refuses rather
    // than quietly dropping every check below.
    if(!isDemoAllowed)return new NextResponse("Workspace is not configured.",{status:503});
    return NextResponse.next({request});
  }
  let response=NextResponse.next({request});
  const supabase=createServerClient(supabaseUrl!,supabaseAnonKey!,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const {data}=await supabase.auth.getClaims();
  const claims=data?.claims;
  const requestHost=request.headers.get("host");
  // Which workspace this address belongs to. null means portal.mucolabs.com or
  // localhost, which serve all four by path exactly as before.
  const hostWorkspace=workspaceForHost(requestHost);
  // On a workspace address the hostname already names the workspace, so the
  // path is written without it. Everything below this line reasons in the
  // app's own terms -- /admin/audit -- whichever address it arrived on.
  const rawPath=request.nextUrl.pathname;
  const path=hostWorkspace&&!isPublic(rawPath)&&!isAccountPath(rawPath)&&rawPath!==hostWorkspace&&!rawPath.startsWith(`${hostWorkspace}/`)
    ?`${hostWorkspace}${rawPath==="/"?"":rawPath}`
    :rawPath;
  // Serve the workspace path while the address bar keeps the short one.
  const serve=()=>{
    if(path===rawPath)return response;
    const target=request.nextUrl.clone();
    target.pathname=path;
    const rewritten=NextResponse.rewrite(target,{request});
    response.cookies.getAll().forEach(cookie=>rewritten.cookies.set(cookie));
    return rewritten;
  };
  // Redirects keep the address the visitor arrived on. Building them from
  // request.url loses it -- the runtime reports its own host there, not the one
  // in the request -- so admin.mucolabs.com would bounce people to the portal
  // address to sign in and leave them there afterwards.
  const redirect=(destination:string)=>{
    const target=new URL(destination,request.nextUrl.origin);
    if(requestHost)target.host=requestHost;
    const result=NextResponse.redirect(target);
    response.cookies.getAll().forEach(cookie=>result.cookies.set(cookie));
    return result;
  };
  // The destination is remembered in the app's own terms, with the workspace
  // prefix, because that is the only form workspaceDestination will keep: it
  // hands back anything that does not sit inside the role's own workspace. A
  // short /certificate looks like it belongs to nobody, so signing in would
  // quietly drop it and land the intern on their home page instead.
  // The proxy shortens it again on the way back.
  if(!claims&&!isPublic(path))return redirect(`/login?next=${encodeURIComponent(`${path}${request.nextUrl.search}`)}`);
  if(!claims)return serve();

  const userId=typeof claims.sub==="string"?claims.sub:null;
  const {data:rows}=userId?await supabase
    .from("memberships")
    .select("organization_id,role,disabled_at")
    .eq("user_id",userId):{data:null};
  const membership=primaryMembership(rows);

  if(!membership){
    if(isPublic(path))return serve();
    // Switched off is not the same as never joined, even though both leave
    // primaryMembership with nothing to return. Onboarding somebody whose
    // access was just revoked would be the product arguing with itself.
    if(accessSwitchedOff(rows))return redirect(ACCESS_CLOSED_PATH);
    return redirect("/complete-profile");
  }

  // An already-signed-in visitor still carries the destination they asked for
  // — the marketing site links here as /login?next=/portal/contact — so honour
  // it instead of dropping everyone on their role's home page.
  if(path==="/login"||path==="/signup")return redirect(workspaceDestination(membership.role,request.nextUrl.searchParams.get("next")));

  // The hard split the specification asks for. A client token cannot open the
  // team workspace and a team token cannot open the client portal, and neither
  // is decided by what the interface chooses to render -- this runs before any
  // page does. "/" is not a workspace; it routes and is left alone.
  //
  // ?wrongworkspace lets the destination say which account is actually signed
  // in, so a link that lands somewhere unexpected reads as the wrong account
  // rather than a broken link.
  const home = homeForRole(membership.role);

  // Arriving at another workspace's address is not a refusal, it is the wrong
  // front door. Send them to their own address rather than showing them a
  // locked page on somebody else's.
  if(hostWorkspace&&hostWorkspace!==home&&!isPublic(rawPath)&&!isAccountPath(rawPath)){
    const ownHost=hostForWorkspace(requestHost,home);
    if(ownHost){
      const target=request.nextUrl.clone();
      target.host=ownHost;
      target.pathname="/";
      target.search="";
      const away=NextResponse.redirect(target);
      response.cookies.getAll().forEach(cookie=>away.cookies.set(cookie));
      return away;
    }
    // No sibling address available -- development on a bare host -- so fall
    // back to the path form on the address we already have.
    return redirect(home);
  }

  // Right address, but the path still spells the workspace out. Shorten it, so
  // the URL never repeats what the hostname already says.
  if(hostWorkspace&&(rawPath===hostWorkspace||rawPath.startsWith(`${hostWorkspace}/`))){
    return redirect(`${stripWorkspacePrefix(rawPath,hostWorkspace)}${request.nextUrl.search}`);
  }
  // Which workspace this path belongs to, if any. "/" belongs to none: it is
  // the router and is left alone.
  const owner = isClientPath(path) ? "/portal"
    : isInternPath(path) ? "/intern"
    : isStaffPath(path) ? "/staff"
    : isAdminPath(path) ? "/admin"
    : null;

  // Your own account is not a workspace, so it is never somebody else's.
  if(!isPublic(path) && !isAccountPath(path) && path !== "/" && owner !== home){
    // A path inside someone else's workspace says so, because landing
    // elsewhere reads as a broken link rather than the wrong account.
    // A path in no workspace at all is simply gone, and goes home quietly.
    const reason = owner === "/portal" ? "customer"
      : owner === "/intern" ? "intern"
      : owner === "/staff" ? "staff"
      : owner ? "team" : null;
    return redirect(reason ? `${home}?wrongworkspace=${reason}` : home);
  }
  return serve();
}
export const config={matcher:["/((?!_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|ico)$).*)"]};
