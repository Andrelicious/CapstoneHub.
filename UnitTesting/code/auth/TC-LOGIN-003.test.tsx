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

  it("TC-LOGIN-003: Invalid password", async () => {
    authMocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Incorrect email or password" },
    })

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@ccs.edu" },
    })

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "WrongPassword123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /access workspace/i }))

    await waitFor(() => {
      expect(screen.getByText("Wrong password")).toBeInTheDocument()
    })
  })
})