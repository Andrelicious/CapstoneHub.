import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AdminPendingSubmissions from "@/components/admin-pending-submissions"

const authMocks = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  routerRefresh: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    from: vi.fn(() => ({
      update: authMocks.update.mockReturnValue({
        eq: authMocks.eq.mockReturnValue(Promise.resolve({ error: null })),
      }),
    })),
  })),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: authMocks.routerRefresh,
  }),
}))

describe("Admin Submission Review", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMocks.eq.mockResolvedValue({ error: null })
  })

  it("TC-WORK-002: Admin approve submission", async () => {
    render(
      <AdminPendingSubmissions
        initialCapstones={[
          {
            id: "capstone-002",
            title: "AI Research Archive",
            abstract: "Test abstract",
            authors: ["Student User"],
            year: 2026,
            category: "Research",
            keywords: ["ai", "archive"],
            pdf_url: null,
            status: "pending_admin_review",
            created_at: "2026-04-18T00:00:00.000Z",
            uploader_id: "student-001",
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm approval/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /confirm approval/i }))

    await waitFor(() => {
      expect(authMocks.update).toHaveBeenCalledWith({ status: "approved" })
    })

    await waitFor(() => {
      expect(authMocks.eq).toHaveBeenCalledWith("id", "capstone-002")
    })

    await waitFor(() => {
      expect(authMocks.routerRefresh).toHaveBeenCalled()
    })
  })
})
