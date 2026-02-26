"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, BookOpen } from "lucide-react"

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuthAndFetchDatasets = async () => {
      try {
        const supabase = getSupabaseClient()
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session?.user)
        
        // Try to fetch public/approved datasets
        // Note: This requires RLS policies to allow public read access
        const { data, error } = await supabase
          .from('datasets')
          .select('id,title,program,created_at,status')
          .eq('status', 'approved')
          .limit(20)
        
        if (data) {
          setDatasets(data)
        }
      } catch (err) {
        console.error('[v0] Failed to fetch datasets:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndFetchDatasets()
  }, [])

  const filteredDatasets = datasets.filter(d =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.program?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Browse Capstone Projects</h1>
            <p className="text-lg text-muted-foreground">
              Discover published student research from the College of Computer Studies
            </p>
          </div>

          {/* Search */}
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              placeholder="Search by title or program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button disabled={loading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading datasets...
            </div>
          ) : filteredDatasets.length === 0 ? (
            <Card className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No datasets match your search" : "No datasets available yet"}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredDatasets.map(dataset => (
                <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{dataset.title}</CardTitle>
                    <CardDescription>{dataset.program}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Published {new Date(dataset.created_at).toLocaleDateString()}
                    </p>
                    {isAuthenticated && (
                      <Button className="mt-4" variant="outline">
                        View Details
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
