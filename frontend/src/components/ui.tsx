import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { initials } from '../lib/format'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-14 border-t border-paper/70 pt-7 sm:mb-20">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
        <div className="min-w-0 max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title mt-4">{title}</h1>
          {description ? (
            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:pb-1">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}

export function Section({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-t border-rule-strong pt-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="section-title">{title}</h2>
          {description ? (
            <p className="mt-2.5 text-[13px] leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin border border-rule-strong border-t-paper ${className}`}
      aria-hidden="true"
    />
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-32">
      <span className="relative h-px w-32 overflow-hidden bg-rule">
        <span className="absolute inset-y-0 left-0 w-1/2 animate-[line-in_1.1s_ease-in-out_infinite_alternate] bg-paper" />
      </span>
      <p className="meta">{label}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="border border-rule-strong bg-surface px-6 py-20 text-center sm:px-10">
      <TriangleAlert className="mx-auto h-6 w-6 text-paper" />
      <h3 className="mt-6 font-sans text-2xl font-medium tracking-[-0.02em] text-paper">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-muted">
        {message ?? 'Please try again.'}
      </p>
      {onRetry ? (
        <button type="button" className="btn btn-secondary mt-8" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      {icon ? <div className="mb-6 text-muted">{icon}</div> : null}
      <h3 className="font-sans text-2xl font-medium tracking-[-0.02em] text-paper">{title}</h3>
      {description ? (
        <p className="mt-3 max-w-md text-[14px] leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  )
}

export function Avatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const dimensions = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-[11px]',
    md: 'h-11 w-11 text-[12px]',
    lg: 'h-20 w-20 text-base',
  }[size]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-rule-strong bg-surface-2 font-mono font-medium tracking-[0.06em] text-paper uppercase ${dimensions}`}
      title={name}
    >
      {initials(name)}
    </span>
  )
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-sans text-[12px] font-medium text-muted">{label}</dt>
      <dd className="mt-2 text-[14px] leading-6 text-graphite">{children}</dd>
    </div>
  )
}
