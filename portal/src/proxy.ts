import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoAllowed, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { workspaceDestination } from "@/lib/auth";

const publicPaths=["/login","/signup","/forgot-password","/reset-password","/verify-email","/complete-profile","/accept-invite","/auth/error","/auth/callback"];
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
  const path=request.nextUrl.pathname;
  const redirect=(destination:string)=>{const result=NextResponse.redirect(new URL(destination,request.url));response.cookies.getAll().forEach(cookie=>result.cookies.set(cookie));return result};
  if(!claims&&!isPublic(path))return redirect(`/login?next=${encodeURIComponent(`${path}${request.nextUrl.search}`)}`);
  if(!claims)return response;

  const userId=typeof claims.sub==="string"?claims.sub:null;
  const {data:membership}=userId?await supabase
    .from("memberships")
    .select("role")
    .eq("user_id",userId)
    .limit(1)
    .maybeSingle():{data:null};

  if(!membership){
    if(isPublic(path))return response;
    return redirect("/complete-profile");
  }

  // An already-signed-in visitor still carries the destination they asked for
  // — the marketing site links here as /login?next=/portal/contact — so honour
  // it instead of dropping everyone on their role's home page.
  if(path==="/login"||path==="/signup")return redirect(workspaceDestination(membership.role,request.nextUrl.searchParams.get("next")));
  // Landing somewhere else than the link you clicked is confusing on its own.
  // ?wrongworkspace lets the destination say which account is actually signed
  // in, instead of leaving a team link looking simply broken.
  if(membership.role==="client"&&!path.startsWith("/portal")&&!isPublic(path))return redirect("/portal?wrongworkspace=team");
  if(membership.role!=="client"&&path.startsWith("/portal"))return redirect("/?wrongworkspace=customer");
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf|ico)$).*)"]};
