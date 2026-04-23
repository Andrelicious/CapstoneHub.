import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ForgotPasswordPage from "@/app/forgot-password/page"

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
    },
  })),
}))

describe("Forgot Password Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(window, "location", {
      value: {
        href: "/forgot-password",
        origin: "http://localhost:3000",
      },
      writable: true,
      configurable: true,
    })
  })

  it("TC-RESET-001: Forgot password request", async () => {
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null })

    render(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "student@ccs.edu" },
    })

    fireEvent.click(screen.getByRole("button", { name: /send secure reset link/i }))

    await waitFor(() => {
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith("student@ccs.edu", {
        redirectTo: "http://localhost:3000/reset-password",
      })
    })

    await waitFor(() => {
      expect(
        screen.getByText("Password reset link has been sent to your email. Please check your inbox."),
      ).toBeInTheDocument()
    })
  })
})
