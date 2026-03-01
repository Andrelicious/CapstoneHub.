'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

/**
 * Fetch a draft dataset with all its data for resuming the wizard
 */
export async function getDraftDataset(datasetId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch the dataset with only valid columns from the schema
  const { data: dataset, error } = await supabase
    .from('datasets')
    .select('id,title,description,program,doc_type,school_year,category,tags,status,user_id,created_at')
    .eq('id', datasetId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch draft: ${error.message}`)
  }

  if (!dataset) {
    throw new Error('Draft not found or you do not have access to it')
  }

  return dataset
}

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
  const supabase = await createClient()

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
      license: 'CC-BY-4.0', // Default license for educational content
    })
    .select('id,title,status,created_at')
    .single()

  if (error) {
    throw new Error(`Failed to create dataset: ${error.message}`)
  }

  revalidateTag('datasets')
  return dataset
}

/**
 * Upload file to storage for dataset
 */
export async function uploadDatasetFile(datasetId: string, file: File) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    // Upload file to storage using dataset versions table
    const fileExt = file.name.split('.').pop()
    const fileName = `${datasetId}-${Date.now()}.${fileExt}`
    const filePath = `datasets/${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('dataset-files')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      throw new Error(`File upload failed: ${uploadError.message}`)
    }

    // Store file version info
    const { error: versionError } = await supabase
      .from('dataset_versions')
      .insert({
        dataset_id: datasetId,
        file_name: file.name,
        file_size: file.size,
        version_number: 1,
      })

    if (versionError) {
      throw new Error(`Failed to store file version: ${versionError.message}`)
    }

    revalidateTag('datasets')
    return { success: true, filePath, fileName }
  } catch (error) {
    throw error
  }
}

/**
 * Submit dataset for OCR processing
 */
export async function submitForOCR(datasetId: string) {
  try {
    const supabase = await createClient()

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

    // Create OCR job
    const { error: jobError } = await supabase.from('ocr_jobs').insert({
      dataset_id: datasetId,
      status: 'queued',
      attempts: 0,
    })

    if (jobError) {
      throw new Error(`Failed to create OCR job: ${jobError.message}`)
    }

    revalidateTag('datasets')
    revalidateTag(`dataset-${datasetId}`)
    return { success: true }
  } catch (error) {
    throw error
  }
  return { success: true }
}

/**
 * Poll OCR job status
 */
export async function getOCRStatus(datasetId: string) {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('ocr_jobs')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to get OCR status: ${error.message}`)
  }

  return job
}

/**
 * Get OCR results for a dataset
 */
export async function getOCRResults(datasetId: string) {
  const supabase = await createClient()

  const { data: results, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('dataset_id', datasetId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows" error, which is ok
    throw new Error(`Failed to get OCR results: ${error.message}`)
  }

  return results || null
}

/**
 * Submit dataset for admin review
 */
export async function submitForAdminReview(datasetId: string) {
  const supabase = await createClient()

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin using user metadata
  const userRole = user.user_metadata?.role || 'student'
  if (userRole !== 'admin') {
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin using user metadata
  const userRole = user.user_metadata?.role || 'student'
  if (userRole !== 'admin') {
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if user is admin using user metadata
  const userRole = user.user_metadata?.role || 'student'
  if (userRole !== 'admin') {
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
  const supabase = await createClient()

  // Select specific columns to avoid RLS infinite recursion
  const { data: datasets, error } = await supabase
    .from('datasets')
    .select('id,title,program,doc_type,user_id,created_at,status')
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Use selective columns to avoid RLS infinite recursion
  let query = supabase
    .from('datasets')
    .select('id,title,description,program,doc_type,user_id,school_year,category,tags,status,created_at,license,admin_remarks')
    .eq('id', datasetId)

  // If user is not authenticated, only show approved datasets
  if (!user) {
    query = query.eq('status', 'approved')
  } else {
    // Get role from user metadata instead of querying profiles table
    const userRole = user.user_metadata?.role || 'student'

    if (userRole === 'admin') {
      // Admins can see all pending datasets
      query = query.in('status', ['pending_admin_review', 'approved', 'draft', 'returned'])
    } else if (userRole === 'adviser') {
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
