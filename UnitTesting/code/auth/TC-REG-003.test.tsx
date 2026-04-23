import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import RegisterPage from "@/app/(public)/register/page"

const authMocks = vi.hoisted(() => ({
  signUp: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      signUp: authMocks.signUp,
    },
  })),
}))

describe("Register Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(window, "location", {
      value: {
        href: "/register",
        origin: "http://localhost:3000",
      },
      writable: true,
      configurable: true,
    })

    vi.stubGlobal("fetch", vi.fn())
  })

  it("TC-REG-003: Admin registration", async () => {
    authMocks.signUp.mockResolvedValue({
      data: {
        user: {
          id: "admin-user-001",
        },
      },
      error: null,
    })

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    render(<RegisterPage />)

    fireEvent.click(screen.getByRole("button", { name: /admin/i }))

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Admin User" },
    })

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "admin@ccs.edu" },
    })

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "StrongPass123" },
    })

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "StrongPass123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /create my workspace/i }))

    await waitFor(() => {
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: "admin@ccs.edu",
        password: "StrongPass123",
        options: {
          emailRedirectTo: "http://localhost:3000",
          data: {
            display_name: "Admin User",
            role: "admin",
          },
        },
      })
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/create-profile",
        expect.objectContaining({
          method: "POST",
        }),
      )
    })

    const createProfileCall = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse((createProfileCall.body as string) || "{}")

    expect(body).toMatchObject({
      id: "admin-user-001",
      email: "admin@ccs.edu",
      display_name: "Admin User",
      role: "admin",
    })

    await waitFor(
      () => {
        expect(window.location.href).toBe("/admin/dashboard")
      },
      { timeout: 2500 },
    )
  })

})