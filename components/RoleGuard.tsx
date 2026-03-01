'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        // Fetch role from profiles table (database only, no metadata)
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (!error && data) {
          setRole(data.role || 'student')
        } else {
          setRole('student')
        }
      } else {
        setRole(null)
      }
      setLoading(false)
    }
    
    fetchRole()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  const isAllowed = role && allowedRoles.includes(role)

  if (!isAllowed) {
    const dashboardUrl = role === 'admin' ? '/admin/dashboard' : role === 'adviser' ? '/adviser/dashboard' : '/student/dashboard'
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#1a1425]/90 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl shadow-purple-500/10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">Access Denied</h1>
          <p className="text-gray-400 text-center mb-6">
            You don&apos;t have permission to access this page. 
            <span className="block mt-1">Required role: {allowedRoles.join(', ')}</span>
          </p>
          
          <Link href={dashboardUrl}>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
