'use client'

import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { RoleGuard } from '@/components/RoleGuard'
import { AdminReviewQueue } from '@/components/admin-review-queue'

export default function AdminReviewPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-[#0a0612]">
        <Navbar />
        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Admin Review Queue</h1>
              <p className="text-gray-400">
                Review pending capstone submissions. Approve to publish to repository, return for revisions, or reject submissions.
              </p>
            </div>

            <AdminReviewQueue />
          </div>
        </main>
        <Footer />
      </div>
    </RoleGuard>
  )
}
