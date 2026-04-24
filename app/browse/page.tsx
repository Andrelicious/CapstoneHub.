import { createSupabaseServerClient } from "@/lib/supabase/server"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BrowseCapstones from "@/components/browse-capstones"

interface BrowseDatasetRow {
  id: string
  title: string | null
  description: string | null
  user_id: string
  program: string | null
  doc_type: string | null
  school_year: string | null
  category: string | null
  tags: string[] | null
  file_name?: string | null
  mime_type?: string | null
  status: string
  created_at: string
}

interface OcrRow {
  dataset_id?: string | null
  submission_id?: string | null
  title?: string | null
  title_hint?: string | null
  abstract_text?: string | null
}

interface BrowseDataset {
  id: string
  title: string
  description: string | null
  user_id: string
  program: string | null
  doc_type: string | null
  school_year: string | null
  category: string | null
  tags: string[] | null
  file_path: string | null
  file_name: string | null
  mime_type: string | null
  status: string
  created_at: string
  approved_at: string | null
  profiles?: { display_name: string; id: string }
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

export default async function BrowsePage() {
  const supabase = await createSupabaseServerClient()
  const dataClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await createSupabaseServerClient({ supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY })
    : supabase

  let datasetsQuery = await dataClient
    .from("datasets")
    .select("id, title, description, user_id, program, doc_type, school_year, category, tags, file_name, mime_type, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (datasetsQuery.error) {
    const message = datasetsQuery.error.message || ""
    const hasFileNameMissing = hasMissingColumnError(message, "file_name")
    const hasMimeTypeMissing = hasMissingColumnError(message, "mime_type")

    if (hasFileNameMissing || hasMimeTypeMissing) {
      datasetsQuery = await dataClient
        .from("datasets")
        .select("id, title, description, user_id, program, doc_type, school_year, category, tags, status, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
    }
  }

  const datasets = datasetsQuery.data

  const baseDatasets = (datasets || []) as BrowseDatasetRow[]

  const datasetIds = baseDatasets.map((d) => d.id)
  let ocrMap: Record<string, OcrRow> = {}

  if (datasetIds.length > 0) {
    let ocrRead = await dataClient
      .from('ocr_results')
      .select('dataset_id, title, title_hint, abstract_text')
      .in('dataset_id', datasetIds)

    if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
      ocrRead = await dataClient
        .from('ocr_results')
        .select('dataset_id, title_hint, abstract_text')
        .in('dataset_id', datasetIds)
    }

    if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'dataset_id')) {
      ocrRead = await dataClient
        .from('ocr_results')
        .select('submission_id, title, title_hint, abstract_text')
        .in('submission_id', datasetIds)

      if (ocrRead.error && hasMissingColumnError(ocrRead.error.message || '', 'title')) {
        ocrRead = await dataClient
          .from('ocr_results')
          .select('submission_id, title_hint, abstract_text')
          .in('submission_id', datasetIds)
      }
    }

    if (!ocrRead.error) {
      ocrMap = Object.fromEntries(
        ((ocrRead.data || []) as OcrRow[])
          .map((row) => [row.dataset_id || row.submission_id || '', row])
          .filter(([id]) => Boolean(id))
      )
    } else if (
      !hasMissingTableError(ocrRead.error.message || '', 'ocr_results') &&
      !isPermissionError(ocrRead.error.message || '')
    ) {
      throw new Error(`Failed to load OCR results for browse: ${ocrRead.error.message}`)
    }
  }

  const userIds = Array.from(new Set(baseDatasets.map((d) => d.user_id).filter(Boolean)))
  let profileMap: Record<string, { display_name: string; id: string }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await dataClient
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds)

    profileMap = Object.fromEntries(
      (profiles || []).map((profile) => [profile.id, { id: profile.id, display_name: profile.display_name || "Unknown" }])
    )
  }

  const initialCapstones: BrowseDataset[] = baseDatasets.map((dataset) => ({
    id: dataset.id,
    title: ((ocrMap[dataset.id]?.title || ocrMap[dataset.id]?.title_hint || '').trim() || dataset.title || 'Untitled'),
    description: ((ocrMap[dataset.id]?.abstract_text || '').trim() || dataset.description || null),
    user_id: dataset.user_id,
    program: dataset.program,
    doc_type: dataset.doc_type,
    school_year: dataset.school_year,
    category: dataset.category,
    tags: dataset.tags,
    file_path: `/api/datasets/${dataset.id}/download`,
    file_name: dataset.file_name || `${(dataset.title || 'document').replace(/\s+/g, '_')}.pdf`,
    mime_type: dataset.mime_type || null,
    status: dataset.status,
    created_at: dataset.created_at,
    approved_at: null,
    profiles: profileMap[dataset.user_id],
  }))

  const categories = [
    "All Categories",
    ...Array.from(new Set(initialCapstones.map((d) => d.category).filter((category): category is string => Boolean(category)))).sort(),
  ]

  const years = [
    "All Years",
    ...Array.from(new Set(initialCapstones.map((d) => d.school_year).filter((year): year is string => Boolean(year)))).sort(
      (a, b) => b.localeCompare(a)
    ),
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Browse Repository</h1>
            <p className="text-lg text-gray-400 max-w-3xl">
              Discover approved capstones and research projects from the College of Computer Studies.
            </p>
          </div>

          <BrowseCapstones initialCapstones={initialCapstones} categories={categories} years={years} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
