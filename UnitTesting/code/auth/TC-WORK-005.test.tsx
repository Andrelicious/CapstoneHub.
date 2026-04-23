import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import StudentDashboardPage from "@/app/(app)/student/dashboard/page"

const studentMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  datasetsOrder: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: studentMocks.redirect,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
  })),
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: studentMocks.getUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: studentMocks.datasetsOrder,
          })),
        })),
      })),
    })),
  })),
}))

describe("Student Tracking Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    studentMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "student-001",
          email: "student@example.com",
        },
      },
    })

    studentMocks.datasetsOrder.mockResolvedValue({
      data: [
        {
          id: "dataset-001",
          title: "Smart Analytics Capstone",
          status: "pending_admin_review",
          created_at: "2026-04-18T00:00:00.000Z",
          program: "BSIT",
          school_year: "2025-2026",
        },
        {
          id: "dataset-002",
          title: "Approved Repository Entry",
          status: "approved",
          created_at: "2026-04-17T00:00:00.000Z",
          program: "BSIT",
          school_year: "2024-2025",
        },
      ],
      error: null,
    })

    vi.stubGlobal(
      "fetch",
      (vi.fn(async () => ({
        ok: true,
        json: async () => ({
          profile: {
            role: "student",
            display_name: "Jordan Cruz",
          },
        }),
      })) as unknown) as typeof fetch,
    )
  })

  it("TC-WORK-005: Student track submissions", async () => {
    const page = await StudentDashboardPage()
    render(page)

    expect(screen.getByText(/research workspace/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /submit research work/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /explore approved repository/i })).toBeInTheDocument()
    expect(screen.getByText("My Submissions")).toBeInTheDocument()
    expect(screen.getByText("Smart Analytics Capstone")).toBeInTheDocument()
    expect(screen.getByText("Approved Repository Entry")).toBeInTheDocument()
    expect(screen.getAllByText(/pending admin review/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^approved$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /open details/i }).length).toBeGreaterThan(0)
  })
})