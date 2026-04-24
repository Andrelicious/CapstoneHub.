import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentProfileServer } from '@/lib/profile-server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArchiveRestore, Clock3, Trash2, Calendar } from 'lucide-react'

type TrashDataset = {
  id: string
  title: string
  program: string
  school_year: string
  deleted_at: string | null
}

function formatRelativePurgeDate(deletedAt: string | null | undefined) {
  if (!deletedAt) {
    return 'Unknown'
  }

  const deletedDate = new Date(deletedAt)
  const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  const remainingMs = purgeDate.getTime() - Date.now()

  if (remainingMs <= 0) {
    return 'Ready for permanent deletion'
  }

  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
  return `${remainingDays} day${remainingDays === 1 ? '' : 's'} until permanent deletion`
}

type StudentTrashPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function StudentTrashPage({ searchParams }: StudentTrashPageProps) {
  const supabase = await createSupabaseServerClient()
  const resolvedSearchParams = (await searchParams) || {}

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let profile = null
  try {
    const resolved = await getCurrentProfileServer()
    profile = resolved.profile
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  }

  const userRole = profile?.role || 'student'
  if (userRole !== 'student') {
    if (userRole === 'admin') redirect('/admin/dashboard')
    if (userRole === 'adviser') redirect('/adviser/dashboard')
  }

  const removedQuery = await supabase
    .from('datasets')
    .select('id, title, program, school_year, deleted_at')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  const removedDatasets: TrashDataset[] = removedQuery.data || []
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Student'
  const currentTimeMs = Number(new Date())
  const restoreError = typeof resolvedSearchParams.restoreError === 'string' ? resolvedSearchParams.restoreError : ''
  const restored = resolvedSearchParams.restored === '1'

  return (
    <div className="relative pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-400">Recovery Area</p>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Trash for <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">{displayName.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground text-lg">Recently removed submissions stay here until they are permanently deleted after 30 days.</p>
          </div>
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm" className="bg-card border-border text-foreground hover:bg-accent">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Removed Submissions</h2>
            <Badge className="bg-amber-500/20 border-amber-500/30 text-amber-300">
              <Clock3 className="w-3 h-3 mr-1" />
              30-day recovery window
            </Badge>
          </div>

          {restored && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              Submission restored successfully.
            </div>
          )}

          {restoreError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {restoreError}
            </div>
          )}

          {removedDatasets.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Trash is empty</h3>
              <p className="text-muted-foreground">Removed submissions will appear here for 30 days before permanent deletion.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {removedDatasets.map((dataset) => {
                const purgeLabel = formatRelativePurgeDate(dataset.deleted_at)
                const deletedDateLabel = dataset.deleted_at ? new Date(dataset.deleted_at).toLocaleDateString() : 'Unknown'
                const canRestore = !!dataset.deleted_at && new Date(dataset.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000 > currentTimeMs

                return (
                  <div key={dataset.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-accent/40 border border-border">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className="bg-amber-500/20 border-amber-500/30 text-amber-300">
                          Removed
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Removed {deletedDateLabel}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground mb-1 line-clamp-1">{dataset.title}</h3>
                      <p className="text-sm text-muted-foreground">{dataset.program} | {dataset.school_year}</p>
                      <p className="text-xs text-amber-300 mt-2">{purgeLabel}</p>
                    </div>
                    <div className="flex gap-2">
                      {canRestore && (
                        <form method="post" action="/api/student/trash/restore">
                          <input type="hidden" name="datasetId" value={dataset.id} />
                          <Button type="submit" variant="outline" size="sm" className="bg-card border-border text-foreground hover:bg-accent">
                            <ArchiveRestore className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
