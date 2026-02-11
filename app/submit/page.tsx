'use client'

import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { RoleGuard } from '@/components/RoleGuard'
import { SubmissionWizard } from '@/components/submission-wizard'

export default function SubmitPage() {
  return (
    <RoleGuard allowedRoles={['student']}>
      <div className="min-h-screen bg-[#0a0612]">
        <Navbar />
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Submit Capstone</h1>
              <p className="text-gray-400">
                Follow the steps below to submit your capstone project. Our OCR system will automatically extract text from your
                document for review.
              </p>
            </div>

            <SubmissionWizard />
          </div>
        </main>
        <Footer />
      </div>
    </RoleGuard>
  )
}
