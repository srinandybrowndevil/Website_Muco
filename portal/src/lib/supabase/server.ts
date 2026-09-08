import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";
export async function createClient(){if(!isSupabaseConfigured)return null;const store=await cookies();return createServerClient(supabaseUrl!,supabaseAnonKey!,{cookies:{getAll:()=>store.getAll(),setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}})}
