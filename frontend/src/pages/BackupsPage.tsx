import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Database,
  Download,
  FileSpreadsheet,
  HardDriveDownload,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { formatBytes, formatDateTime, fromNow } from '../lib/format'
import { useToast } from '../components/Toast'
import { EmptyState, ErrorState, LoadingState, PageHeader, Section, Spinner } from '../components/ui'

export default function BackupsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [downloading, setDownloading] = useState<string | null>(null)

  const backups = useQuery({ queryKey: ['backups'], queryFn: api.backups })

  const run = useMutation({
    mutationFn: api.runBackup,
    onSuccess: (info) => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast.success('Snapshot created', info.filename)
    },
    onError: (error) =>
      toast.error(
        'Could not create a snapshot',
        error instanceof ApiError ? error.message : 'Please try again.',
      ),
  })

  const downloadCurrent = async () => {
    setDownloading('current')
    try {
      await api.downloadCurrentExcel()
      toast.success('Excel download started')
    } catch {
      toast.error('Could not download the workbook')
    } finally {
      setDownloading(null)
    }
  }

  const downloadSnapshot = async (filename: string) => {
    setDownloading(filename)
    try {
      await api.downloadBackup(filename)
      toast.success('Snapshot download started')
    } catch {
      toast.error('Could not download this snapshot')
    } finally {
      setDownloading(null)
    }
  }

  const snapshots = backups.data?.snapshots ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Excel backups"
        description="The database is the source of truth. These workbooks are a readable backup for the team and the President."
        actions={
          <button type="button" className="btn btn-primary" onClick={downloadCurrent} disabled={downloading === 'current'}>
            {downloading === 'current' ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            Download current Excel
          </button>
        }
      />

      <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr]">
        <Section title="Generated workbook">
          <div className="mt-6 flex items-start gap-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-paper text-paper">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="max-w-2xl text-[14px] leading-7 text-muted">
                A fresh{' '}
                <code className="border border-rule-strong px-1.5 py-0.5 font-mono text-[12px] text-graphite">
                  .xlsx
                </code>{' '}
                built from the live database. It contains the current tracker and every review round.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="badge">Tracker sheet</span>
                <span className="badge">Review history sheet</span>
                <span className="badge">Hyperlinks preserved</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Nightly snapshot">
          <p className="mt-5 text-[14px] leading-7 text-muted">
            The app writes one workbook every night at 02:00 IST and keeps the last{' '}
            {backups.data?.retentionDays ?? 30} days.
          </p>
          <button
            type="button"
            className="btn btn-secondary mt-6 w-full"
            onClick={() => run.mutate()}
            disabled={run.isPending}
          >
            {run.isPending ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            {run.isPending ? 'Creating snapshot…' : 'Run snapshot now'}
          </button>
        </Section>
      </div>

      <Section
        title="Stored snapshots"
        description="Download any snapshot for the Excel archive."
        action={
          <span className="inline-flex items-center gap-2 text-[12px] text-muted">
            <Archive className="h-4 w-4" />
            {snapshots.length} files
          </span>
        }
        className="mt-16"
      >
        {backups.isLoading ? <LoadingState label="Checking snapshots…" /> : null}
        {backups.isError ? (
          <div className="pt-8">
            <ErrorState message="Snapshots could not be listed." onRetry={() => backups.refetch()} />
          </div>
        ) : null}

        {backups.isSuccess ? (
          snapshots.length === 0 ? (
            <div className="border-b border-rule">
              <EmptyState
                icon={<HardDriveDownload className="h-5 w-5" />}
                title="No snapshots yet"
                description="The first nightly snapshot runs at 02:00 IST, or you can create one now."
                action={
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => run.mutate()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Create snapshot
                  </button>
                }
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="mt-7 w-full border-collapse">
                  <thead className="table-head">
                    <tr>
                      <th>File</th>
                      <th>Created</th>
                      <th>Size</th>
                      <th className="w-28 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.filename} className="table-row">
                        <td>
                          <span className="flex items-center gap-3">
                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-graphite" />
                            <span className="font-mono text-[12px] text-graphite">
                              {snapshot.filename}
                            </span>
                          </span>
                        </td>
                        <td className="text-[13px] whitespace-nowrap text-graphite">
                          {formatDateTime(snapshot.modifiedAt)}
                          <span className="mt-1 block text-[12px] text-muted">
                            {fromNow(snapshot.modifiedAt)}
                          </span>
                        </td>
                        <td className="text-[13px] whitespace-nowrap text-graphite">
                          {formatBytes(snapshot.sizeBytes)}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => downloadSnapshot(snapshot.filename)}
                            disabled={downloading === snapshot.filename}
                          >
                            {downloading === snapshot.filename ? (
                              <Spinner className="h-3.5 w-3.5" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-rule border-b border-rule md:hidden">
                {snapshots.map((snapshot) => (
                  <div key={snapshot.filename} className="py-6">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-graphite" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[12px] text-graphite">
                          {snapshot.filename}
                        </p>
                        <p className="mt-1.5 text-[12px] text-muted">
                          {formatDateTime(snapshot.modifiedAt)} / {formatBytes(snapshot.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mt-4 w-full"
                      onClick={() => downloadSnapshot(snapshot.filename)}
                      disabled={downloading === snapshot.filename}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download snapshot
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        ) : null}
      </Section>

      <div className="mt-16 grid gap-px border-y border-rule bg-rule sm:grid-cols-2">
        <div className="bg-ink p-6 sm:p-7">
          <div className="flex items-center gap-2.5">
            <Database className="h-4 w-4 text-muted" />
            <h3 className="text-[13px] font-medium text-paper">Database backups</h3>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted">
            On the server, a nightly PostgreSQL{' '}
            <code className="border border-rule-strong px-1.5 font-mono text-[11px]">pg_dump</code>{' '}
            runs outside the app and keeps 30 days in the backups volume. Ask the server administrator
            for a restore.
          </p>
        </div>
        <div className="bg-ink p-6 sm:p-7">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-muted" />
            <h3 className="text-[13px] font-medium text-paper">Safe by design</h3>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted">
            Excel export is one-way. Editing a workbook never changes the database, so the live tracker
            and review history stay authoritative.
          </p>
        </div>
      </div>
    </div>
  )
}
