import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LoginPage from "@/app/(public)/login/page"

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      signInWithPassword: authMocks.signInWithPassword,
      signInWithOAuth: authMocks.signInWithOAuth,
      getSession: authMocks.getSession,
    },
  })),
}))

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authMocks.getSession.mockResolvedValue({
      data: {
        session: null,
      },
    })

    Object.defineProperty(window, "location", {
      value: {
        href: "/login",
        origin: "http://localhost:3000",
      },
      writable: true,
      configurable: true,
    })

    vi.stubGlobal("fetch", vi.fn())
  })

  it("TC-LOGIN-006: Admin login", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    })

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          role: "admin",
        },
      }),
    } as Response)

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "admin@ccs.edu" },
    })

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "CorrectPassword123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /access workspace/i }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: "admin@ccs.edu",
        password: "CorrectPassword123",
      })
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/get-profile?ensure=false", {
        method: "GET",
      })
    })

    await waitFor(() => {
      expect(window.location.href).toBe("/admin/dashboard")
    })
  })
})
