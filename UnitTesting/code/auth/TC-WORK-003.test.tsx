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

  it("TC-WORK-003: Admin reject submission", async () => {
    render(
      <AdminPendingSubmissions
        initialCapstones={[
          {
            id: "capstone-003",
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

    fireEvent.click(screen.getByRole("button", { name: /reject/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm rejection/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/enter reason for rejection/i), {
      target: { value: "Needs revision" },
    })

    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }))

    await waitFor(() => {
      expect(authMocks.update).toHaveBeenCalledWith({
        status: "rejected",
        rejection_reason: "Needs revision",
      })
    })

    await waitFor(() => {
      expect(authMocks.eq).toHaveBeenCalledWith("id", "capstone-003")
    })

    await waitFor(() => {
      expect(authMocks.routerRefresh).toHaveBeenCalled()
    })
  })
})
