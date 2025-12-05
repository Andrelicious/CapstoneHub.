import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import BrowseCapstones from "@/components/browse-capstones"

const mockCapstones = [
  {
    id: "1",
    title: "AI-Powered Student Attendance System Using Facial Recognition",
    authors: ["Juan Dela Cruz", "Maria Santos"],
    year: 2024,
    category: "Artificial Intelligence",
    abstract:
      "This study presents an innovative approach to automating student attendance using deep learning facial recognition technology. The system achieves 98% accuracy in identifying students and reduces attendance taking time by 90%.",
    keywords: ["AI", "Facial Recognition", "Deep Learning", "Attendance"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2024-03-15",
  },
  {
    id: "2",
    title: "Blockchain-Based Academic Credential Verification System",
    authors: ["Pedro Reyes", "Ana Garcia"],
    year: 2024,
    category: "Blockchain",
    abstract:
      "A decentralized system for verifying academic credentials using blockchain technology to prevent fraud and ensure authenticity of educational documents.",
    keywords: ["Blockchain", "Verification", "Security", "Credentials"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2024-02-20",
  },
  {
    id: "3",
    title: "Mobile Learning Management System for K-12 Education",
    authors: ["Carlo Mendoza"],
    year: 2023,
    category: "Mobile Development",
    abstract:
      "Development of a comprehensive mobile LMS tailored for K-12 students and teachers in the Philippines, featuring offline support and gamification elements.",
    keywords: ["Mobile", "LMS", "Education", "K-12"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2023-11-10",
  },
  {
    id: "4",
    title: "IoT-Based Smart Campus Energy Management",
    authors: ["Sofia Torres", "Miguel Castro"],
    year: 2024,
    category: "Internet of Things",
    abstract:
      "An Internet of Things solution for monitoring and optimizing energy consumption across campus facilities, achieving 30% reduction in energy costs.",
    keywords: ["IoT", "Energy", "Smart Campus", "Sustainability"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2024-01-05",
  },
  {
    id: "5",
    title: "Natural Language Processing Chatbot for Student Services",
    authors: ["Elena Cruz", "James Lee"],
    year: 2023,
    category: "Artificial Intelligence",
    abstract:
      "A conversational AI assistant designed to handle student inquiries and automate common administrative tasks using NLP and machine learning.",
    keywords: ["NLP", "Chatbot", "AI", "Student Services"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2023-09-20",
  },
  {
    id: "6",
    title: "Augmented Reality Campus Navigation System",
    authors: ["Rodel Villanueva"],
    year: 2024,
    category: "Augmented Reality",
    abstract:
      "An AR-based mobile application that helps students and visitors navigate the campus using real-time visual overlays and indoor positioning.",
    keywords: ["AR", "Navigation", "Mobile", "Campus"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2024-04-01",
  },
  {
    id: "7",
    title: "Secure E-Voting System for Student Council Elections",
    authors: ["Angela Reyes", "Mark Santos"],
    year: 2023,
    category: "Cybersecurity",
    abstract:
      "A secure and transparent electronic voting system implementing end-to-end encryption and blockchain verification for student council elections.",
    keywords: ["E-Voting", "Security", "Blockchain", "Elections"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2023-08-15",
  },
  {
    id: "8",
    title: "Real-Time Traffic Monitoring Using Computer Vision",
    authors: ["John Paul Cruz", "Mary Grace Tan"],
    year: 2024,
    category: "Data Science",
    abstract:
      "Implementation of computer vision algorithms for real-time traffic monitoring and congestion prediction in urban areas surrounding the campus.",
    keywords: ["Computer Vision", "Traffic", "Data Science", "ML"],
    pdf_url: "#",
    thumbnail_url: null,
    status: "approved",
    created_at: "2024-03-25",
  },
]

const categories = [
  "All Categories",
  "Artificial Intelligence",
  "Blockchain",
  "Mobile Development",
  "Internet of Things",
  "Augmented Reality",
  "Web Development",
  "Data Science",
  "Cybersecurity",
  "Game Development",
  "Cloud Computing",
]

const years = ["All Years", "2024", "2023", "2022", "2021", "2020"]

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <main className="relative pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Browse{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Capstone Projects
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore research projects from CCS students and faculty
            </p>
          </div>

          {/* Client component for search/filter functionality */}
          <BrowseCapstones initialCapstones={mockCapstones} categories={categories} years={years} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
