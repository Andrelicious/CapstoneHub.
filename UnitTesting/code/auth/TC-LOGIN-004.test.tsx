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

  it("TC-LOGIN-004: Empty login fields", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Login failed. Please try again." },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "" },
    })

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "" },
    })

    fireEvent.click(screen.getByRole("button", { name: /access workspace/i }))

    await waitFor(() => {
      expect(screen.getByText("Login failed. Please try again.")).toBeInTheDocument()
    })
  })
})