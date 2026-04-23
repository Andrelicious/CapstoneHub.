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

  it("TC-REG-004: Duplicate email registration", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    })

    render(<RegisterPage />)

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Student User" },
    })

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@ccs.edu" },
    })

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "StrongPass123" },
    })

    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "StrongPass123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /create my workspace/i }))

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument()
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})
