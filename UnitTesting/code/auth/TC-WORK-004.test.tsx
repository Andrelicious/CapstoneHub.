import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { DatasetSubmissionWizard } from "@/components/dataset-submission-wizard"

const workflowMocks = vi.hoisted(() => ({
  createDatasetDraft: vi.fn(),
  uploadDatasetFile: vi.fn(),
  submitForOCR: vi.fn(),
  getOCRStatus: vi.fn(),
  getOCRResults: vi.fn(),
  submitForAdminReview: vi.fn(),
  routerPush: vi.fn(),
  toast: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: workflowMocks.routerPush,
  }),
  useSearchParams: () => new URLSearchParams(""),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: workflowMocks.toast,
  }),
}))

vi.mock("@/lib/datasets-actions", () => ({
  createDatasetDraft: workflowMocks.createDatasetDraft,
  getOwnDatasetDraft: vi.fn(),
  uploadDatasetFile: workflowMocks.uploadDatasetFile,
  submitForOCR: workflowMocks.submitForOCR,
  getOCRStatus: workflowMocks.getOCRStatus,
  getOCRResults: workflowMocks.getOCRResults,
  submitForAdminReview: workflowMocks.submitForAdminReview,
  updateDatasetDraft: vi.fn(),
}))

describe("Student Submission Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as unknown as ReturnType<typeof setInterval>)
    vi.spyOn(globalThis, "clearInterval").mockImplementation(() => undefined)

    workflowMocks.createDatasetDraft.mockResolvedValue({ id: "dataset-001" })
    workflowMocks.uploadDatasetFile.mockResolvedValue(undefined)
    workflowMocks.submitForOCR.mockResolvedValue(undefined)
    workflowMocks.getOCRStatus.mockResolvedValue({ status: "done" })
    workflowMocks.getOCRResults.mockResolvedValue({
      full_text: "Smart Analytics Capstone\n\nAbstract\n\nThis is a test OCR result.",
    })
    workflowMocks.submitForAdminReview.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("TC-WORK-004: Student submit research work", async () => {
    const { container } = render(<DatasetSubmissionWizard />)

    fireEvent.change(screen.getByPlaceholderText(/enter project title/i), {
      target: { value: "Smart Analytics Capstone" },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }))

    await waitFor(() => {
      expect(workflowMocks.createDatasetDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Smart Analytics Capstone",
        }),
      )
    })

    expect(screen.getByRole("heading", { name: /upload document/i })).toBeInTheDocument()

    const fileInputs = container.querySelectorAll('input[type="file"]')
    expect(fileInputs.length).toBeGreaterThan(0)

    const file = new File(["test pdf"], "capstone.pdf", { type: "application/pdf" })
    fireEvent.change(fileInputs[0], { target: { files: [file] } })

    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }))

    await waitFor(() => {
      expect(workflowMocks.uploadDatasetFile).toHaveBeenCalledWith("dataset-001", file)
    })

    await waitFor(() => {
      expect(workflowMocks.submitForOCR).toHaveBeenCalledWith("dataset-001")
    })

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /ocr processing/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /^Next$/i }))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /review ocr results/i })).toBeInTheDocument()
    })

    vi.spyOn(globalThis, "setTimeout").mockImplementation(
      (((callback: TimerHandler, _delay?: number, ...args: unknown[]) => {
        if (typeof callback === "function") {
          callback(...args)
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      }) as unknown) as typeof setTimeout,
    )

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /submit for admin review/i }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(workflowMocks.submitForAdminReview).toHaveBeenCalledWith("dataset-001")
    expect(screen.getByRole("heading", { name: /submission complete!/i })).toBeInTheDocument()

    expect(workflowMocks.routerPush).toHaveBeenCalledWith("/student/dashboard")
  })
})