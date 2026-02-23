import { ArrowRight, CheckCircle2 } from "lucide-react"

export default function RoleWorkflowSection() {
  const steps = [
    {
      title: "Student Submits",
      description: "Student uploads PDF through OCR wizard, document is queued for processing",
      role: "Student",
      color: "from-purple-500 to-purple-700",
    },
    {
      title: "Adviser Reviews",
      description: "Adviser browses submissions, provides feedback and recommendations",
      role: "Adviser",
      color: "from-blue-500 to-blue-700",
    },
    {
      title: "Admin Approves",
      description: "Admin performs final review, approves or rejects, publishes to repository",
      role: "Admin",
      color: "from-cyan-500 to-cyan-700",
    },
  ]

  return (
    <section className="py-20 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">How the Review Flow Works</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            A streamlined three-step workflow ensuring quality submissions and efficient approval
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hidden md:block" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                {/* Circle connector */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1025] to-[#0f0a1e] border-4 border-white/20 flex items-center justify-center hidden md:flex">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <span className="text-white font-bold text-lg">{idx + 1}</span>
                  </div>
                </div>

                {/* Card */}
                <div className="mt-24 rounded-2xl bg-gradient-to-b from-[#1a1025] to-[#0f0a1e] border border-white/10 p-6 hover:border-white/30 transition-all duration-300">
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 mb-4">{step.description}</p>

                  {/* Role badge */}
                  <div className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${step.color} bg-opacity-20 border border-white/20`}>
                    <span className="text-sm font-medium text-white">{step.role}</span>
                  </div>
                </div>

                {/* Arrow */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-4 top-32 text-white/40">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role Permissions Summary */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              role: "Students",
              permissions: ["Submit documents via OCR wizard", "Track submission status", "View approved works", "Receive feedback"],
              color: "purple",
            },
            {
              role: "Advisers",
              permissions: ["Browse pending submissions", "Provide recommendations", "View submission details", "No approval authority"],
              color: "blue",
            },
            {
              role: "Admins",
              permissions: ["Review all submissions", "Approve or reject", "Publish to repository", "Manage users & records"],
              color: "cyan",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl bg-gradient-to-b from-${item.color}-500/10 to-${item.color}-600/5 border border-${item.color}-500/30 p-6`}
            >
              <h4 className={`text-lg font-semibold text-white mb-4`}>{item.role}</h4>
              <ul className="space-y-2">
                {item.permissions.map((perm, pidx) => (
                  <li key={pidx} className="flex items-start gap-2">
                    <CheckCircle2 className={`w-5 h-5 text-${item.color}-400 flex-shrink-0 mt-0.5`} />
                    <span className="text-sm text-gray-300">{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
