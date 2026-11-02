import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center border-t border-paper/70 pt-14 text-center">
      <span
        aria-hidden="true"
        className="font-serif text-[clamp(6rem,18vw,12rem)] leading-[0.7] tracking-[-0.05em] text-paper/[0.12]"
      >
        404
      </span>
      <span className="-mt-6 flex h-14 w-14 items-center justify-center border border-paper text-paper">
        <Compass className="h-5 w-5" />
      </span>
      <p className="eyebrow mt-8">Error / Not found</p>
      <h1 className="mt-4 max-w-2xl font-sans text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-medium tracking-[-0.03em]">
        This page is not in the tracker
      </h1>
      <p className="mt-5 max-w-md text-[14px] leading-7 text-muted">
        The link may be outdated or the page may have moved. Head back to the dashboard to keep
        working.
      </p>
      <Link to="/" className="btn btn-primary mt-9">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
    </div>
  )
}
