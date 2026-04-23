import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import BrowseCapstones from "@/components/browse-capstones"

const authMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  favoritesSelect: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      getUser: authMocks.getUser,
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: authMocks.profileMaybeSingle,
            })),
          })),
        }
      }

      if (table === "dataset_favorites") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => authMocks.favoritesSelect()),
          })),
        }
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
        })),
      }
    }),
  })),
}))

describe("Repository View", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "adviser-001",
        },
      },
    })

    authMocks.profileMaybeSingle.mockResolvedValue({
      data: {
        role: "adviser",
      },
    })

    authMocks.favoritesSelect.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  it("TC-WORK-001: Adviser can only view repositories", async () => {
    render(
      <BrowseCapstones
        initialCapstones={[
          {
            id: "capstone-001",
            title: "Smart Capstone Repository",
            description: "A repository entry for testing adviser view-only access.",
            user_id: "student-001",
            program: "BSIT",
            doc_type: "pdf",
            school_year: "2025-2026",
            category: "Research",
            tags: ["testing", "repository"],
            file_path: "https://example.com/file.pdf",
            file_name: "file.pdf",
            status: "approved",
            created_at: "2026-04-18T00:00:00.000Z",
            approved_at: "2026-04-18T00:00:00.000Z",
            profiles: [{ display_name: "Student User", id: "student-001" }],
          },
        ]}
        categories={['All Categories', 'Research']}
        years={['All Years', '2025-2026']}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Smart Capstone Repository")).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument()
  })
})
