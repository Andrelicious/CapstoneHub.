'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { OCRStatusBadge, type OCRStatus } from '@/components/ocr-status-badge'
import { OCRPreview } from '@/components/ocr-preview'
import { Upload, ChevronRight, CheckCircle2, FileText, RotateCcw } from 'lucide-react'

type WizardStep = 1 | 2 | 3 | 4 | 5

interface WizardState {
  step: WizardStep
  file: File | null
  fileName: string
  fileSize: string
  ocrStatus: OCRStatus
  ocrText: string
  ocrConfirmed: boolean
  title: string
  docType: string
  program: string
  schoolYear: string
}

const INITIAL_STATE: WizardState = {
  step: 1,
  file: null,
  fileName: '',
  fileSize: '',
  ocrStatus: 'queued',
  ocrText: '',
  ocrConfirmed: false,
  title: '',
  docType: '',
  program: '',
  schoolYear: '',
}

export function SubmissionWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [isDragging, setIsDragging] = useState(false)

  // Mock OCR processing simulation
  const simulateOCRProcessing = () => {
    setState((prev) => ({ ...prev, ocrStatus: 'processing' }))
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        ocrStatus: 'done',
        ocrText: `Abstract

This capstone project explores the intersection of artificial intelligence and sustainable development. 
Through comprehensive research and practical implementation, we demonstrate novel approaches to 
environmental monitoring and resource optimization using advanced machine learning techniques.

Our methodology combines satellite imagery analysis with ground-truth validation, achieving 
a 94% accuracy rate in identifying critical environmental zones requiring intervention.

References

[1] Smith, J. et al. "Sustainable AI", Journal of Environmental Computing, 2024
[2] Johnson, A. "Machine Learning for Conservation", Tech Review, 2023
[3] Lee, S. "Satellite Data Analysis", Nature Methods, 2024`,
      }))
    }, 3000)
  }

  const handleFileUpload = (file: File) => {
    setState((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      step: 2,
    }))
    // Automatically start OCR processing
    simulateOCRProcessing()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  const handleRetryOCR = () => {
    setState((prev) => ({ ...prev, ocrStatus: 'queued' }))
    simulateOCRProcessing()
  }

  const moveToNextStep = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 5) as WizardStep }))
  }

  const moveToPrevStep = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) as WizardStep }))
  }

  const stepLabels: Record<WizardStep, string> = {
    1: 'Upload Document',
    2: 'OCR Processing',
    3: 'Review & Validate',
    4: 'Submission Details',
    5: 'Final Submit',
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                state.step >= step
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                  : 'bg-white/10 text-gray-400 border border-white/20'
              }`}
            >
              {state.step > step ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 5 && (
              <div
                className={`h-1 flex-1 mx-2 rounded ${
                  state.step > step ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <h2 className="text-2xl font-bold text-white mb-6">{stepLabels[state.step]}</h2>

      {/* Step Content */}
      <div className="min-h-96">
        {/* Step 1: Upload */}
        {state.step === 1 && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/20 hover:border-purple-500/50 bg-white/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Drag & drop your document</h3>
            <p className="text-sm text-gray-400 mb-4">or click to browse</p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.currentTarget.files?.[0]
                if (file) handleFileUpload(file)
              }}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
                Browse Files
              </Button>
            </label>
            <p className="text-xs text-gray-500 mt-4">Supported: PDF, JPG, PNG (Max 50MB)</p>
          </div>
        )}

        {/* Step 2: OCR Processing */}
        {state.step === 2 && (
          <Card className="bg-white/5 border border-white/10 p-8">
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-gray-400 mb-2">File Details</p>
                <p className="text-lg font-semibold text-white">{state.fileName}</p>
                <p className="text-sm text-gray-400">{state.fileSize}</p>
              </div>

              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-20 h-20">
                    {state.ocrStatus === 'processing' && (
                      <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" />
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center rounded-full ${
                        state.ocrStatus === 'done'
                          ? 'bg-green-500/20 border border-green-500/30'
                          : state.ocrStatus === 'failed'
                            ? 'bg-red-500/20 border border-red-500/30'
                            : 'bg-blue-500/20 border border-blue-500/30'
                      }`}
                    >
                      <FileText
                        className={`w-8 h-8 ${
                          state.ocrStatus === 'done'
                            ? 'text-green-400'
                            : state.ocrStatus === 'failed'
                              ? 'text-red-400'
                              : 'text-blue-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <OCRStatusBadge status={state.ocrStatus} />
                  <p className="text-sm text-gray-400 mt-3">
                    {state.ocrStatus === 'queued' && 'Waiting to process...'}
                    {state.ocrStatus === 'processing' && 'Extracting text from document...'}
                    {state.ocrStatus === 'done' && 'OCR completed successfully!'}
                    {state.ocrStatus === 'failed' && 'OCR processing failed. Please retry.'}
                  </p>
                </div>

                {state.ocrStatus === 'done' && (
                  <Button
                    onClick={moveToNextStep}
                    className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white mt-4"
                  >
                    Continue to Review <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {state.ocrStatus === 'failed' && (
                  <Button
                    onClick={handleRetryOCR}
                    className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white mt-4"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Retry OCR
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: OCR Review */}
        {state.step === 3 && (
          <div className="space-y-6">
            <OCRPreview
              text={state.ocrText}
              wordCount={state.ocrText.split(/\s+/).length}
              pageCount={1}
              flags={[
                { type: 'info', message: 'Abstract found: ✓' },
                { type: 'info', message: 'References found: ✓' },
              ]}
            />

            <Card className="bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.ocrConfirmed}
                  onChange={(e) => setState((prev) => ({ ...prev, ocrConfirmed: e.target.checked }))}
                  className="w-5 h-5 mt-1 rounded border-white/20 bg-white/10 accent-purple-500"
                />
                <span className="text-sm text-gray-300">
                  I confirm that the OCR content matches my document and is ready for submission.
                </span>
              </label>
            </Card>
          </div>
        )}

        {/* Step 4: Submission Details */}
        {state.step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <Input
                value={state.title}
                onChange={(e) => setState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter capstone title"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Document Type *</label>
              <Select value={state.docType} onValueChange={(value) => setState((prev) => ({ ...prev, docType: value }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capstone">Capstone</SelectItem>
                  <SelectItem value="thesis">Thesis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Program *</label>
              <Select value={state.program} onValueChange={(value) => setState((prev) => ({ ...prev, program: value }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ccs">Computer Science</SelectItem>
                  <SelectItem value="ict">Information & Communication Technology</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">School Year *</label>
              <Input
                type="text"
                value={state.schoolYear}
                onChange={(e) => setState((prev) => ({ ...prev, schoolYear: e.target.value }))}
                placeholder="e.g., 2023-2024"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
        )}

        {/* Step 5: Final Submit */}
        {state.step === 5 && (
          <Card className="bg-white/5 border border-white/10 p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Document</p>
                <p className="text-lg font-semibold text-white">{state.fileName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Title</p>
                <p className="text-lg font-semibold text-white">{state.title || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Program</p>
                <p className="text-lg font-semibold text-white">{state.program || 'Not specified'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <OCRStatusBadge status="done" />
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-300">
                  ✓ Ready for Admin Review - Your submission will be reviewed by our team and you'll receive updates via email.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 gap-4">
        <Button
          variant="outline"
          onClick={moveToPrevStep}
          disabled={state.step === 1}
          className="border-white/20 text-gray-300 hover:bg-white/10 bg-transparent"
        >
          Back
        </Button>

        <Button
          onClick={moveToNextStep}
          disabled={
            (state.step === 1 && !state.file) ||
            (state.step === 2 && state.ocrStatus !== 'done') ||
            (state.step === 3 && !state.ocrConfirmed) ||
            (state.step === 4 && (!state.title || !state.docType || !state.program || !state.schoolYear)) ||
            state.step === 5
          }
          className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.step === 5 ? 'Submitted' : 'Next'} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
