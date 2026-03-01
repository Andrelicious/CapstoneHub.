'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

/**
 * Create or update a dataset draft
 */
export async function createDatasetDraft(data: {
  title: string
  description?: string
  program: string
  doc_type: string
  school_year: string
  category?: string
  tags?: string[]
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description,
      program: data.program,
      doc_type: data.doc_type,
      school_year: data.school_year,
      category: data.category,
      tags: data.tags,
      status: 'draft',
      license: 'CC BY 4.0',
      is_public: false,
      download_count: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create dataset: ${error.message}`)
  }

  revalidateTag('datasets')
  return dataset
}

/**
 * Get a student's own draft by ID
 */
export async function getOwnDatasetDraft(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .single()

  if (error || !dataset) {
    throw new Error('Draft not found')
  }

  return dataset
}

/**
 * Update an existing student's draft
 */
export async function updateDatasetDraft(
  datasetId: string,
  data: {
    title: string
    description?: string
    program: string
    doc_type: string
    school_year: string
    category?: string
    tags?: string[]
  }
) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: dataset, error } = await supabase
    .from('datasets')
    .update({
      title: data.title,
      description: data.description,
      program: data.program,
      doc_type: data.doc_type,
      school_year: data.school_year,
      category: data.category,
      tags: data.tags,
    })
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !dataset) {
    throw new Error(`Failed to update draft: ${error?.message || 'Unknown error'}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return dataset
}

/**
 * Upload file to storage and update dataset with file path
 */
export async function uploadDatasetFile(datasetId: string, file: File) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Upload file to storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${datasetId}-${Date.now()}.${fileExt}`
  const filePath = `datasets/${user.id}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('datasets')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`)
  }

  // Update dataset with file info when these columns exist in the current schema.
  // Some deployed schemas do not include file_path/file_name on datasets.
  const { error: updateError } = await supabase
    .from('datasets')
    .update({
      file_path: filePath,
      file_name: file.name,
    })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (updateError) {
    const message = (updateError.message || '').toLowerCase()
    const isMissingColumn =
      message.includes("could not find the 'file_path' column") ||
      message.includes("could not find the 'file_name' column")

    if (!isMissingColumn) {
      throw new Error(`Failed to update dataset: ${updateError.message}`)
    }
  }

  revalidateTag('datasets')
  return filePath
}

/**
 * Submit dataset for OCR processing
 */
export async function submitForOCR(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Update dataset status to ocr_processing
  const { error: statusError } = await supabase
    .from('datasets')
    .update({ status: 'ocr_processing' })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (statusError) {
    throw new Error(`Failed to update status: ${statusError.message}`)
  }

  // Create OCR job with schema compatibility fallbacks.
  // Some deployments differ on:
  // - unique constraint presence on dataset_id
  // - attempts column existence
  // - ocr_jobs table availability
  let { error: jobError } = await supabase.from('ocr_jobs').insert({
    dataset_id: datasetId,
    status: 'queued',
    attempts: 0,
  })

  if (jobError) {
    const firstMessage = (jobError.message || '').toLowerCase()
    const isRLSInsertError =
      firstMessage.includes('row-level security policy') ||
      firstMessage.includes('permission denied')

    if (isRLSInsertError) {
      try {
        const serviceClient = await createSupabaseServerClient({
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })

        const serviceInsert = await serviceClient.from('ocr_jobs').insert({
          dataset_id: datasetId,
          status: 'queued',
          attempts: 0,
        })

        jobError = serviceInsert.error

        if (jobError) {
          const serviceRetryMessage = (jobError.message || '').toLowerCase()
          const isMissingAttemptsColumnOnService =
            serviceRetryMessage.includes("could not find the 'attempts' column") ||
            serviceRetryMessage.includes('column "attempts" does not exist')

          if (isMissingAttemptsColumnOnService) {
            const retryWithoutAttempts = await serviceClient.from('ocr_jobs').insert({
              dataset_id: datasetId,
              status: 'queued',
            })
            jobError = retryWithoutAttempts.error
          }
        }
      } catch {
        // keep existing error handling paths below
      }
    }

    const message = (jobError.message || '').toLowerCase()
    const isMissingAttemptsColumn =
      message.includes("could not find the 'attempts' column") ||
      message.includes('column "attempts" does not exist')

    if (isMissingAttemptsColumn) {
      const retry = await supabase.from('ocr_jobs').insert({
        dataset_id: datasetId,
        status: 'queued',
      })
      jobError = retry.error
    }

    if (jobError) {
      const nextMessage = (jobError.message || '').toLowerCase()
      const isDuplicateJob =
        nextMessage.includes('duplicate key value violates unique constraint') ||
        nextMessage.includes('already exists')

      if (isDuplicateJob) {
        const updateExisting = await supabase
          .from('ocr_jobs')
          .update({ status: 'queued' })
          .eq('dataset_id', datasetId)

        if (!updateExisting.error) {
          jobError = null
        }
      }
    }

    if (jobError) {
      const finalMessage = (jobError.message || '').toLowerCase()
      const isMissingOCRJobsTable =
        finalMessage.includes('relation "ocr_jobs" does not exist') ||
        finalMessage.includes("could not find the table 'ocr_jobs'")
      const isRLSInsertError =
        finalMessage.includes('row-level security policy') ||
        finalMessage.includes('permission denied')

      if (!isMissingOCRJobsTable && !isRLSInsertError) {
        throw new Error(`Failed to create OCR job: ${jobError.message}`)
      }
    }
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Poll OCR job status
 */
export async function getOCRStatus(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  let { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (isRLSReadError) {
      try {
        const serviceClient = await createSupabaseServerClient({
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
        const serviceRead = await serviceClient
          .from('ocr_jobs')
          .select('*')
          .eq('dataset_id', datasetId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        job = serviceRead.data
        error = serviceRead.error
      } catch {
        // fall through to existing tolerant handling
      }
    }
  }

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isNoRows = error.code === 'PGRST116'
    const isMissingOCRJobsTable =
      message.includes('relation "ocr_jobs" does not exist') ||
      message.includes("could not find the table 'ocr_jobs'")
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (!isNoRows && !isMissingOCRJobsTable && !isRLSReadError) {
      throw new Error(`Failed to get OCR status: ${error.message}`)
    }

    return null
  }

  return job
}

/**
 * Get OCR results for a dataset
 */
export async function getOCRResults(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  let { data: results, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('dataset_id', datasetId)
    .single()

  if (error) {
    const message = (error.message || '').toLowerCase()
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (isRLSReadError) {
      try {
        const serviceClient = await createSupabaseServerClient({
          supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        })
        const serviceRead = await serviceClient
          .from('ocr_results')
          .select('*')
          .eq('dataset_id', datasetId)
          .single()

        results = serviceRead.data
        error = serviceRead.error
      } catch {
        // fall through to existing tolerant handling
      }
    }
  }

  if (error && error.code !== 'PGRST116') {
    const message = (error.message || '').toLowerCase()
    const isMissingOCRResultsTable =
      message.includes('relation "ocr_results" does not exist') ||
      message.includes("could not find the table 'ocr_results'")
    const isRLSReadError =
      message.includes('row-level security policy') ||
      message.includes('permission denied')

    if (!isMissingOCRResultsTable && !isRLSReadError) {
      throw new Error(`Failed to get OCR results: ${error.message}`)
    }
  }

  return results || null
}

/**
 * Submit dataset for admin review
 */
export async function submitForAdminReview(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('datasets')
    .update({ status: 'pending_admin_review' })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to submit: ${error.message}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Approve dataset
 */
export async function approveDataset(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can approve datasets')
  }

  const { error } = await supabase
    .from('datasets')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', datasetId)

  if (error) {
    throw new Error(`Failed to approve: ${error.message}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Return dataset for revisions
 */
export async function returnDataset(datasetId: string, remarks: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can return datasets')
  }

  const { error } = await supabase
    .from('datasets')
    .update({ status: 'returned', admin_remarks: remarks })
    .eq('id', datasetId)

  if (error) {
    throw new Error(`Failed to return: ${error.message}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Admin: Reject dataset
 */
export async function rejectDataset(datasetId: string, remarks: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can reject datasets')
  }

  const { error } = await supabase
    .from('datasets')
    .update({ status: 'rejected', admin_remarks: remarks })
    .eq('id', datasetId)

  if (error) {
    throw new Error(`Failed to reject: ${error.message}`)
  }

  revalidateTag('datasets')
  revalidateTag(`dataset-${datasetId}`)
  return { success: true }
}

/**
 * Get pending datasets for admin review
 */
export async function getPendingDatasets() {
  const supabase = await createSupabaseServerClient()

  const { data: datasets, error } = await supabase
    .from('datasets')
    .select(`*, profiles(display_name, id)`)
    .eq('status', 'pending_admin_review')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch datasets: ${error.message}`)
  }

  return datasets || []
}

/**
 * Get dataset by ID (with full permissions check)
 */
export async function getDatasetById(datasetId: string) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let query = supabase
    .from('datasets')
    .select(`*, profiles(display_name, id), ocr_results(*)`)
    .eq('id', datasetId)

  // If user is not authenticated, only show approved datasets
  if (!user) {
    query = query.eq('status', 'approved')
  } else {
    // Check role for access control
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role === 'admin') {
      // Admins can see all pending datasets
      query = query.in('status', ['pending_admin_review', 'approved', 'draft', 'returned'])
    } else if (profile?.role === 'adviser') {
      // Advisers can only see approved datasets
      query = query.eq('status', 'approved')
    } else {
      // Students can see approved datasets and their own
      query = query.or(`status.eq.approved,user_id.eq.${user.id}`)
    }
  }

  const { data: dataset, error } = await query.single()

  if (error) {
    throw new Error(`Dataset not found: ${error.message}`)
  }

  return dataset
}
