/**
 * Demo Mode Configuration
 * Freezes system for reliable demo experience
 * 
 * Features:
 * - Non-blocking OCR (always progresses wizard)
 * - Graceful error handling (shows error but continues)
 * - Demo data support (pre-populated dashboards)
 * - Safe timeouts (never hangs)
 */

export const DEMO_MODE = {
  // Enable demo-safe features
  ENABLED: true,
  
  // OCR Configuration (demo-safe)
  OCR: {
    // Never wait longer than this to avoid blocking
    TIMEOUT_MS: 20000, // 20 seconds
    
    // Poll frequency for status checks
    POLL_INTERVAL_MS: 2000, // 2 seconds
    
    // If OCR fails/times out, show this placeholder
    PLACEHOLDER_TEXT: `[Demo: OCR Processing in Background]

This is a demonstration of Capstone Hub's OCR capabilities. In production, 
the extracted text from your PDF would appear here. The OCR process runs 
asynchronously and doesn't block the submission wizard.

You can edit this text before final submission for admin review.

Key Features Demonstrated:
• Non-blocking file upload and OCR processing
• Graceful error handling with user-friendly messages
• Ability to continue submission even if OCR is still processing
• Real-time status updates without page refresh
`,
  },

  // Validation Configuration
  VALIDATION: {
    // Skip heavy validations during demo
    SKIP_DUPLICATE_CHECK: false,
    
    // Show helpful hints instead of strict errors
    SHOW_HINTS: true,
  },

  // Demo Data Configuration
  DATA: {
    // Enable demo data seeding
    SEED_DEMO_DATA: true,
    
    // Demo submissions to show in dashboards
    DEMO_SUBMISSIONS: [
      {
        id: 'demo-1',
        title: 'AI-Powered Student Performance Prediction System',
        status: 'approved' as const,
        program: 'IT',
        school_year: '2024',
        created_at: new Date(2024, 0, 15).toISOString(),
        description: 'Predictive analytics system using machine learning',
      },
      {
        id: 'demo-2',
        title: 'Real-time Inventory Management Platform',
        status: 'pending_admin_review' as const,
        program: 'CS',
        school_year: '2024',
        created_at: new Date(2024, 1, 20).toISOString(),
        description: 'Cloud-based inventory system with real-time updates',
      },
      {
        id: 'demo-3',
        title: 'Mobile App for Healthcare Management',
        status: 'approved' as const,
        program: 'IT',
        school_year: '2024',
        created_at: new Date(2024, 2, 10).toISOString(),
        description: 'HIPAA-compliant healthcare mobile application',
      },
      {
        id: 'demo-4',
        title: 'Blockchain-Based Supply Chain Tracking',
        status: 'ocr_processing' as const,
        program: 'CS',
        school_year: '2024',
        created_at: new Date(2024, 3, 5).toISOString(),
        description: 'Secure supply chain verification using blockchain',
      },
      {
        id: 'demo-5',
        title: 'IoT-Enabled Smart Agriculture System',
        status: 'draft' as const,
        program: 'IT',
        school_year: '2024',
        created_at: new Date(2024, 4, 12).toISOString(),
        description: 'Smart farming using IoT sensors and AI analytics',
      },
    ],
  },

  // Logging Configuration
  LOGGING: {
    // Enable detailed demo logs
    VERBOSE: true,
    
    // Prefix for all demo logs
    PREFIX: '[DEMO]',
  },
}

/**
 * Demo logger - helps trace demo execution
 */
export function demoLog(message: string, data?: any) {
  if (!DEMO_MODE.LOGGING.VERBOSE) return
  
  const prefix = DEMO_MODE.LOGGING.PREFIX
  if (data) {
    console.log(`${prefix} ${message}`, data)
  } else {
    console.log(`${prefix} ${message}`)
  }
}

/**
 * Check if we should use demo data
 */
export function shouldUseDemoData(): boolean {
  return DEMO_MODE.DATA.SEED_DEMO_DATA && DEMO_MODE.ENABLED
}

/**
 * Get OCR demo timeout
 */
export function getOCRTimeout(): number {
  return DEMO_MODE.OCR.TIMEOUT_MS
}

/**
 * Get OCR demo placeholder text
 */
export function getOCRPlaceholder(): string {
  return DEMO_MODE.OCR.PLACEHOLDER_TEXT
}
