import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, ArrowRight } from "lucide-react"
import AuthLayout from "@/components/auth-layout"

export default function RegisterSuccessPage() {
  return (
    <AuthLayout>
      <div className="glass rounded-2xl p-8 border border-white/10 neon-border text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
          <Mail className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We&apos;ve sent a confirmation link to your email address. Please click the link to verify your account and
          complete registration.
        </p>

        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-6">
          <p className="text-sm text-purple-300">
            Didn&apos;t receive the email? Check your spam folder or try registering again.
          </p>
        </div>

        <Link href="/login">
          <Button className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-400 text-white font-semibold group">
            Go to Login
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </AuthLayout>
  )
}
