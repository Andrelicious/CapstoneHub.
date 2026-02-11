'use client'

import { RoleGuard } from '@/components/RoleGuard'
import { DatasetSubmissionWizard } from '@/components/dataset-submission-wizard'

export default function SubmitPage() {
  return (
    <RoleGuard allowedRoles={['student']}>
      <DatasetSubmissionWizard />
    </RoleGuard>
  )
}
