"use client"

import type React from "react"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  Download,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Heart,
  ExternalLink,
} from "lucide-react"

type CapstoneStatus = "pending" | "approved" | "rejected"

interface Capstone {
  id: string
  title: string
  abstract: string
  authors: string[]
  year: number
  program: string
  adviser: string
  category: string
  keywords: string[]
  pdf_url: string
  status: CapstoneStatus
  created_at: string
}

const mockCapstones: Record<string, Capstone> = {
  "1": {
    id: "1",
    title: "AI-Powered Student Attendance System Using Facial Recognition",
    abstract: `This study presents an innovative approach to automating student attendance using deep learning facial recognition technology. The system was developed to address the inefficiencies and inaccuracies associated with traditional manual attendance tracking methods in educational institutions.

The research involved the development of a comprehensive facial recognition system using Convolutional Neural Networks (CNN) trained on a custom dataset of student faces. The system achieves 98% accuracy in identifying students under various lighting conditions and angles.

Key features of the system include:
• Real-time face detection and recognition
• Automatic attendance logging to a cloud database
• Mobile app for students to view their attendance records
• Admin dashboard for faculty to manage classes and view reports
• Integration with existing student information systems

The implementation demonstrated significant improvements in attendance tracking efficiency, reducing the time spent on attendance from an average of 5 minutes per class to less than 30 seconds. Faculty members reported high satisfaction with the system's accuracy and ease of use.`,
    authors: ["Juan Dela Cruz", "Maria Santos"],
    year: 2024,
    program: "Bachelor of Science in Computer Science (BSCS)",
    adviser: "Dr. Jose Rizal",
    category: "Artificial Intelligence",
    keywords: ["AI", "Facial Recognition", "Deep Learning", "Attendance", "CNN", "Computer Vision"],
    pdf_url: "#",
    status: "approved",
    created_at: "2024-03-15",
  },
  "2": {
    id: "2",
    title: "Blockchain-Based Academic Credential Verification System",
    abstract: `A decentralized system for verifying academic credentials using blockchain technology to prevent fraud and ensure authenticity of educational documents.

This research addresses the growing concern of academic credential fraud by implementing an Ethereum-based smart contract system that creates immutable records of academic achievements. The system allows educational institutions to issue verifiable digital credentials that can be instantly validated by employers and other institutions.

Key innovations include:
• Decentralized credential storage using IPFS
• Smart contract-based verification
• QR code integration for easy scanning
• Multi-signature approval workflow
• Integration with existing student information systems

The system was tested with 500 sample credentials and achieved 100% verification accuracy with an average verification time of under 3 seconds.`,
    authors: ["Pedro Reyes", "Ana Garcia"],
    year: 2024,
    program: "Bachelor of Science in Information Technology (BSIT)",
    adviser: "Dr. Andres Bonifacio",
    category: "Blockchain",
    keywords: ["Blockchain", "Verification", "Security", "Credentials", "Ethereum", "Smart Contracts"],
    pdf_url: "#",
    status: "approved",
    created_at: "2024-02-20",
  },
  "3": {
    id: "3",
    title: "Mobile Learning Management System for K-12 Education",
    abstract: `Development of a comprehensive mobile LMS tailored for K-12 students and teachers in the Philippines, featuring offline support and gamification elements.

This research addresses the digital divide in Philippine education by creating a mobile-first learning management system that works seamlessly even with limited internet connectivity. The system incorporates gamification elements to increase student engagement and motivation.

Features include:
• Offline-first architecture with smart syncing
• Gamified learning modules with badges and rewards
• Parent dashboard for monitoring progress
• Teacher tools for creating interactive content
• Multi-language support (English, Filipino, Cebuano)

Pilot testing with 200 students showed a 45% improvement in course completion rates and 60% increase in student engagement compared to traditional LMS solutions.`,
    authors: ["Carlo Mendoza"],
    year: 2023,
    program: "Bachelor of Science in Information Technology (BSIT)",
    adviser: "Dr. Maria Clara",
    category: "Mobile Development",
    keywords: ["Mobile", "LMS", "Education", "K-12", "Offline", "Gamification"],
    pdf_url: "#",
    status: "approved",
    created_at: "2023-11-10",
  },
  "4": {
    id: "4",
    title: "IoT-Based Smart Campus Energy Management",
    abstract: `An Internet of Things solution for monitoring and optimizing energy consumption across campus facilities, achieving 30% reduction in energy costs.

This research developed a comprehensive IoT infrastructure for monitoring and controlling energy usage across campus buildings. The system uses a network of smart sensors and actuators to automatically optimize lighting, HVAC, and equipment power consumption.

Technical implementation:
• Distributed sensor network using ESP32 microcontrollers
• Real-time data collection and analysis
• Machine learning-based consumption prediction
• Automated scheduling and control systems
• Mobile app for facilities management

The system was deployed across 5 campus buildings and achieved:
- 30% reduction in electricity costs
- 25% decrease in peak power demand
- 40% improvement in HVAC efficiency`,
    authors: ["Sofia Torres", "Miguel Castro"],
    year: 2024,
    program: "Bachelor of Science in Computer Engineering (BSCpE)",
    adviser: "Dr. Emilio Aguinaldo",
    category: "Internet of Things",
    keywords: ["IoT", "Energy", "Smart Campus", "Sustainability", "Sensors", "Automation"],
    pdf_url: "#",
    status: "approved",
    created_at: "2024-01-05",
  },
  "5": {
    id: "5",
    title: "Natural Language Processing Chatbot for Student Services",
    abstract: `A conversational AI assistant designed to handle student inquiries and automate common administrative tasks using NLP and machine learning.

This research developed an intelligent chatbot system capable of understanding and responding to student queries in natural language. The system uses transformer-based NLP models fine-tuned on a custom dataset of student service interactions.

Capabilities include:
• Intent recognition for 50+ query types
• Context-aware multi-turn conversations
• Integration with enrollment and records systems
• Automatic ticket creation for complex issues
• Support for English and Filipino languages

The chatbot successfully handled 78% of student inquiries without human intervention, reducing average response time from 24 hours to under 5 seconds.`,
    authors: ["Elena Cruz", "James Lee"],
    year: 2023,
    program: "Bachelor of Science in Computer Science (BSCS)",
    adviser: "Dr. Apolinario Mabini",
    category: "Artificial Intelligence",
    keywords: ["NLP", "Chatbot", "AI", "Student Services", "Machine Learning", "Transformer"],
    pdf_url: "#",
    status: "approved",
    created_at: "2023-09-20",
  },
  "6": {
    id: "6",
    title: "Augmented Reality Campus Navigation System",
    abstract: `An AR-based mobile application that helps students and visitors navigate the campus using real-time visual overlays and indoor positioning.

This research developed an innovative navigation solution that uses augmented reality to guide users through campus buildings and outdoor areas. The system combines computer vision, indoor positioning, and AR technology to provide intuitive wayfinding.

Key features:
• Markerless AR navigation with visual anchors
• Indoor positioning using WiFi and BLE beacons
• Real-time crowd density information
• Accessibility routes for PWD users
• Event and schedule integration

User testing with 150 participants showed 95% success rate in reaching destinations and 85% preference over traditional map-based navigation.`,
    authors: ["Rodel Villanueva"],
    year: 2024,
    program: "Bachelor of Science in Computer Science (BSCS)",
    adviser: "Dr. Gabriela Silang",
    category: "Augmented Reality",
    keywords: ["AR", "Navigation", "Mobile", "Campus", "Indoor Positioning", "Computer Vision"],
    pdf_url: "#",
    status: "approved",
    created_at: "2024-04-01",
  },
  "7": {
    id: "7",
    title: "Secure E-Voting System for Student Council Elections",
    abstract: `A secure and transparent electronic voting system implementing end-to-end encryption and blockchain verification for student council elections.

This research addresses the need for a secure, transparent, and accessible voting system for student elections. The system combines modern cryptographic techniques with blockchain technology to ensure vote integrity and anonymity.

Security features:
• End-to-end encryption of votes
• Blockchain-based vote verification
• Biometric voter authentication
• Tamper-evident audit logs
• Zero-knowledge proofs for anonymity

The system was used for the 2023 student council elections with 3,500 voters, achieving 99.9% uptime and zero reported security incidents.`,
    authors: ["Angela Reyes", "Mark Santos"],
    year: 2023,
    program: "Bachelor of Science in Information Technology (BSIT)",
    adviser: "Dr. Manuel Quezon",
    category: "Cybersecurity",
    keywords: ["E-Voting", "Security", "Blockchain", "Elections", "Cryptography", "Authentication"],
    pdf_url: "#",
    status: "approved",
    created_at: "2023-08-15",
  },
  "8": {
    id: "8",
    title: "Real-Time Traffic Monitoring Using Computer Vision",
    abstract: `Implementation of computer vision algorithms for real-time traffic monitoring and congestion prediction in urban areas surrounding the campus.

This research developed a traffic monitoring system using existing CCTV infrastructure and advanced computer vision algorithms. The system provides real-time traffic analysis and predictive congestion modeling.

Technical components:
• YOLO-based vehicle detection and tracking
• Lane-wise traffic flow analysis
• Congestion prediction using LSTM networks
• Integration with navigation apps
• Dashboard for traffic management

The system achieved 94% accuracy in vehicle counting and 87% accuracy in congestion prediction 15 minutes ahead.`,
    authors: ["John Paul Cruz", "Mary Grace Tan"],
    year: 2024,
    program: "Bachelor of Science in Computer Science (BSCS)",
    adviser: "Dr. Sergio Osmeña",
    category: "Data Science",
    keywords: ["Computer Vision", "Traffic", "Data Science", "ML", "YOLO", "Prediction"],
    pdf_url: "#",
    status: "approved",
    created_at: "2024-03-25",
  },
}

// Mock current user - change role to test different views
const mockCurrentUser = {
  id: "user-1",
  role: "student" as "student" | "faculty" | "admin",
}

const statusConfig: Record<CapstoneStatus, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "Pending Review",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20 border-yellow-500/30",
  },
  approved: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: "Approved",
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/30",
  },
  rejected: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Rejected",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/30",
  },
}

export default function CapstoneDetailPage() {
  const params = useParams()
  const capstoneId = params.id as string
  const capstone = mockCapstones[capstoneId]

  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  const isAdmin = mockCurrentUser.role === "admin" || mockCurrentUser.role === "faculty"
  const canModerate = isAdmin && capstone?.status === "pending"

  const handleAction = (action: "approve" | "reject") => {
    setActionType(action)
    setIsActionDialogOpen(true)
  }

  const confirmAction = () => {
    console.log(`${actionType} capstone ${capstoneId}`)
    setIsActionDialogOpen(false)
    setActionType(null)
    setRejectionReason("")
  }

  if (!capstone) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="relative pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Capstone Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The capstone project you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link href="/browse">
              <Button className="bg-gradient-to-r from-purple-600 to-cyan-500">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Browse
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </Link>

          {/* Header Card */}
          <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-6">
            {/* Status & Category */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge
                className={`${statusConfig[capstone.status].bgColor} ${statusConfig[capstone.status].color} border`}
              >
                {statusConfig[capstone.status].icon}
                <span className="ml-1">{statusConfig[capstone.status].label}</span>
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{capstone.category}</Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {capstone.year}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">{capstone.title}</h1>

            {/* Meta Info */}
            <div className="grid sm:grid-cols-2 gap-4 text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Authors</p>
                  <span className="text-white">{capstone.authors.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Program</p>
                  <span className="text-white">{capstone.program}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Adviser</p>
                  <span className="text-white">{capstone.adviser}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date Submitted</p>
                  <span className="text-white">
                    {new Date(capstone.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-2">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {capstone.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-3 py-1 rounded-full bg-white/5 text-sm text-gray-300 border border-white/10 hover:border-purple-500/50 transition-colors cursor-pointer"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {capstone.status === "approved" && (
                <>
                  <Button className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View Document
                  </Button>
                </>
              )}
              <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                className={`bg-white/5 border-white/10 hover:bg-pink-500/10 hover:border-pink-500/30 transition-colors ${isSaved ? "text-pink-400 border-pink-500/30 bg-pink-500/10" : "text-white"}`}
                onClick={() => setIsSaved(!isSaved)}
              >
                <Heart className={`w-4 h-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>

          {/* Abstract */}
          <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Abstract
            </h2>
            <div className="prose prose-invert max-w-none">
              {capstone.abstract.split("\n\n").map((paragraph, index) => (
                <p key={index} className="text-gray-300 leading-relaxed mb-4 last:mb-0 whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Document Preview Placeholder */}
          {capstone.status === "approved" && (
            <div className="glass rounded-2xl border border-white/10 p-6 md:p-8 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                Document Preview
              </h2>
              <div className="aspect-[3/4] bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-xl border border-white/10 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-20 h-20 text-white/20 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">PDF Preview will appear here</p>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {canModerate && (
            <div className="glass rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-yellow-200 mb-2">Admin Actions</h2>
              <p className="text-yellow-200/70 mb-6">
                This capstone is pending review. Please approve or reject this submission.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-green-600 hover:bg-green-500 text-white" onClick={() => handleAction("approve")}>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve Submission
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 bg-transparent"
                  onClick={() => handleAction("reject")}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject Submission
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Action Confirmation Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="glass border-white/10 bg-[#0a0612]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {actionType === "approve" ? "Approve Submission" : "Reject Submission"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {actionType === "approve"
                ? "This capstone will be published and visible to all users."
                : "Please provide a reason for rejection. This will be sent to the student."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <h4 className="font-medium text-white mb-2">{capstone.title}</h4>
            <p className="text-sm text-muted-foreground">By {capstone.authors.join(", ")}</p>
          </div>

          {actionType === "reject" && (
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              rows={4}
            />
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }
            >
              {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
