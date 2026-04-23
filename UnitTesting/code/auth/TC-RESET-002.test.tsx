import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ResetPasswordPage from "@/app/reset-password/page"

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      getSession: authMocks.getSession,
      updateUser: authMocks.updateUser,
    },
  })),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe("Reset Password Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(window, "location", {
      value: {
        href: "/reset-password",
        origin: "http://localhost:3000",
      },
      writable: true,
      configurable: true,
    })

    authMocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token",
        },
      },
    })
  })

  it("TC-RESET-002: Reset password validation", async () => {
    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "StrongPass123" },
    })

    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "WrongPass123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /update security credentials/i }))

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument()
    })

    expect(authMocks.updateUser).not.toHaveBeenCalled()
  })
})
