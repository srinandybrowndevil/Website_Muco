"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function LogoutButton({className="secondary compact"}:{className?:string}){const router=useRouter();const [loading,setLoading]=useState(false);async function logout(){setLoading(true);if(isSupabaseConfigured)await createClient()!.auth.signOut();router.replace("/login");router.refresh()}return <button type="button" className={className} disabled={loading} onClick={logout}>{loading?"Signing out…":"Sign out"}</button>}
