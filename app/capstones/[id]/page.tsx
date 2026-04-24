import { createSupabaseServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import CapstoneDetailClient from "@/components/capstone-detail-client"
import { extractOcrInsights } from "@/lib/ocr-insights"

interface CapstoneDetailPageProps {
  params: Promise<{ id: string }>
}

function hasMissingColumnError(message: string, column: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes(`column "${column}" does not exist`) ||
    normalized.includes(`column ${column} does not exist`) ||
    normalized.includes(`column datasets.${column} does not exist`) ||
    normalized.includes(`column ocr_results.${column} does not exist`)
  )
}

function hasMissingTableError(message: string, table: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes(`relation "${table}" does not exist`) ||
    normalized.includes(`could not find the table '${table}'`)
  )
}

function isPermissionError(message: string) {
  const normalized = (message || '').toLowerCase()
  return (
    normalized.includes('permission denied') ||
    normalized.includes('row-level security policy') ||
    normalized.includes('not authorized')
  )
}

async function getCapstone(id: string) {
  const supabase = await createSupabaseServerClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dataSupabase = serviceRoleKey
    ? await createSupabaseServerClient({ supabaseKey: serviceRoleKey })
    : supabase

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole: string | null = null
  if (user) {
    const { data: profile } = await dataSupabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    userRole = profile?.role || null
  }

  let query = dataSupabase
    .from("datasets")
    .select("id, title, description, user_id, school_year, category, tags, file_name, mime_type, status, created_at")
    .eq("id", id)

  let { data: dataset, error } = await query.single()

  if (error) {
    const message = error.message || ""
    const hasFileNameMissing = hasMissingColumnError(message, "file_name")
    const hasMimeTypeMissing = hasMissingColumnError(message, "mime_type")

    if (hasFileNameMissing || hasMimeTypeMissing) {
      let fallbackQuery = dataSupabase
        .from("datasets")
        .select("id, title, description, user_id, school_year, category, tags, status, created_at")
        .eq("id", id)

      if (!user) {
        fallbackQuery = fallbackQuery.eq("status", "approved")
      }

      const fallbackResult = await fallbackQuery.single()
      dataset = fallbackResult.data
      error = fallbackResult.error
    }
  }

  if (error || !dataset) {
    return null
  }

  const isOwner = Boolean(user && dataset.user_id === user.id)
  const canBypassApproval = userRole === 'admin' || userRole === 'adviser'
  if (!canBypassApproval && !isOwner && dataset.status !== 'approved') {
    return null
  }

  let authorName = "Unknown"
  const { data: profile } = await dataSupabase
    .from("profiles")
    .select("display_name")
    .eq("id", dataset.user_id)
    .maybeSingle()

  if (profile?.display_name) {
    authorName = profile.display_name
  }

  let ocrTitle: string | null = null
  let ocrAbstract: string | null = null

  let ocrRead = await dataSupabase
    .from('ocr_results')
    .select('title, title_hint, abstract_text, full_text')
    .eq('dataset_id', dataset.id)
    .maybeSingle()

  if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
    ocrRead = await dataSupabase
      .from('ocr_results')
      .select('title_hint, abstract_text, full_text')
      .eq('dataset_id', dataset.id)
      .maybeSingle()
  }

  if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'dataset_id')) {
    ocrRead = await dataSupabase
      .from('ocr_results')
      .select('title, title_hint, abstract_text, full_text')
      .eq('submission_id', dataset.id)
      .maybeSingle()

    if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
      ocrRead = await dataSupabase
        .from('ocr_results')
        .select('title_hint, abstract_text, full_text')
        .eq('submission_id', dataset.id)
        .maybeSingle()
    }
  }

  if (
    ocrRead.error &&
    !hasMissingTableError(ocrRead.error.message || '', 'ocr_results') &&
    !isPermissionError(ocrRead.error.message || '')
  ) {
    throw new Error(`Failed to load OCR detail: ${ocrRead.error.message}`)
  }

  if (ocrRead.data) {
    const row = ocrRead.data as { title?: string | null; title_hint?: string | null; abstract_text?: string | null; full_text?: string | null }
    ocrTitle = (row.title || row.title_hint || '').trim() || null
    ocrAbstract = (row.abstract_text || extractOcrInsights(row.full_text || '').abstract || '').trim() || null
  }

  return {
    id: dataset.id,
    title: ocrTitle || dataset.title || "Untitled",
    abstract: ocrAbstract || null,
    authors: [authorName],
    year: dataset.school_year ? Number.parseInt(String(dataset.school_year), 10) || null : null,
    category: dataset.category || null,
    keywords: Array.isArray(dataset.tags) ? dataset.tags : null,
    pdf_url: `/api/datasets/${dataset.id}/download`,
    thumbnail_url: null,
    file_name: dataset.file_name || null,
    mime_type: dataset.mime_type || null,
    status: dataset.status || "pending_admin_review",
    created_at: dataset.created_at,
  }
}

export default async function CapstoneDetailPage({ params }: CapstoneDetailPageProps) {
  const { id } = await params
  const capstone = await getCapstone(id)

  if (!capstone) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <CapstoneDetailClient capstone={capstone} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
