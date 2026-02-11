'use server'

import { createClient } from '@/lib/supabase/server'
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
 * Upload file to storage and update dataset with file path
 */
export async function uploadDatasetFile(datasetId: string, file: File) {
  const supabase = await createClient()

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
    .from('dataset-files')
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    throw new Error(`File upload failed: ${uploadError.message}`)
  }

  // Update dataset with file info
  const { error: updateError } = await supabase
    .from('datasets')
    .update({
      file_path: filePath,
      file_name: file.name,
    })
    .eq('id', datasetId)
    .eq('user_id', user.id)

  if (updateError) {
    throw new Error(`Failed to update dataset: ${updateError.message}`)
  }

  revalidateTag('datasets')
  return filePath
}

/**
 * Submit dataset for OCR processing
 */
export async function submitForOCR(datasetId: string) {
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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
