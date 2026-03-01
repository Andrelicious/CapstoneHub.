"use client"

import { supabaseBrowser } from "@/lib/supabase/browser"

/**
 * Deprecated: use supabaseBrowser from lib/supabase/browser instead.
 */
export const getSupabaseClient = () => supabaseBrowser

/**
 * Deprecated: use supabaseBrowser from lib/supabase/browser instead.
 */
export const createClient = () => supabaseBrowser
