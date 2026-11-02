import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { Spinner } from '../components/ui'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (signedIn) => {
      queryClient.setQueryData(['me'], signedIn)
      navigate('/', { replace: true })
    },
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage: 'linear-gradient(to right, #f4f2ed 1px, transparent 1px)',
          backgroundSize: '25% 100%',
        }}
      />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-rule px-5 py-5 sm:px-10 lg:px-16">
          <Link to="/" className="inline-flex items-baseline gap-2.5">
            <span className="text-sm font-semibold tracking-[0.2em] uppercase">Specanciens</span>
            <span className="hidden text-[11px] text-muted sm:inline">Social Desk</span>
          </Link>
          <p className="hidden text-[12px] text-muted sm:block">Private team workspace / {new Date().getFullYear()}</p>
        </header>

        <div className="grid flex-1 lg:grid-cols-[1.15fr_.85fr]">
          <section className="relative flex flex-col justify-between overflow-hidden border-b border-rule px-5 py-14 sm:px-10 lg:border-r lg:border-b-0 lg:px-16 lg:py-16">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-10 font-serif text-[26rem] leading-none text-paper/[0.025] select-none"
            >
              S
            </span>

            <div className="relative">
              <p className="eyebrow">St. Peter&apos;s College / Hyderabad</p>
              <h1 className="mt-7 font-serif text-[clamp(3.5rem,7.5vw,7rem)] leading-[0.86] tracking-[-0.035em]">
                The
                <br />
                <span className="italic">Social</span>
                <br />
                Desk.
              </h1>
              <p className="mt-8 max-w-md text-[15px] leading-7 text-graphite">
                Plan every Instagram, Facebook and LinkedIn post, send review requests through Gmail,
                and keep every approval in one private editorial workspace.
              </p>
            </div>

            <div className="relative mt-14 grid border-y border-rule sm:grid-cols-3">
              {[
                { label: 'Plan', text: 'One shared tracker for every post, owner and date.' },
                { label: 'Review', text: 'Gmail review requests with a secure link for the President.' },
                { label: 'Publish', text: 'Approvals, live links and the Excel record in one place.' },
              ].map((step, index) => (
                <div
                  key={step.label}
                  className={`py-6 sm:px-5 ${
                    index > 0 ? 'border-t border-rule sm:border-t-0 sm:border-l' : ''
                  }`}
                >
                  <p className="text-[15px] font-medium text-paper">{step.label}</p>
                  <p className="mt-2.5 text-[13px] leading-6 text-muted">{step.text}</p>
                </div>
              ))}
            </div>

            <div className="relative mt-10 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
              <p>Private workspace / No public sign-up</p>
              <p>{new Date().getFullYear()}</p>
            </div>
          </section>

          <section className="flex flex-col justify-center px-5 py-14 sm:px-10 lg:px-16 lg:py-16">
            <div className="mx-auto w-full max-w-md">
              <p className="eyebrow">Team sign in</p>
              <h2 className="mt-4 font-serif text-5xl leading-none">Welcome back.</h2>
              <p className="mt-4 text-[15px] leading-7 text-muted">
                Use the account created for you by the Super Admin.
              </p>

              <form
                className="mt-10 space-y-7"
                onSubmit={handleSubmit((values) => login.mutate(values))}
                noValidate
              >
                <div>
                  <label className="label" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    className="input"
                    placeholder="you@example.com"
                    {...register('email')}
                  />
                  {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
                </div>

                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="input pr-12"
                      placeholder="••••••••"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute top-0 right-0 flex h-12 w-12 items-center justify-center border-l border-rule-strong text-muted transition-colors hover:text-paper"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? <p className="field-error">{errors.password.message}</p> : null}
                </div>

                {login.isError ? (
                  <div className="flex items-start gap-3.5 border-2 border-paper px-5 py-4">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-paper" />
                    <p className="text-[14px] leading-6 text-paper">
                      {login.error instanceof ApiError
                        ? login.error.message
                        : 'Could not sign in. Please try again.'}
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={login.isPending}
                >
                  {login.isPending ? <Spinner className="h-4 w-4" /> : null}
                  {login.isPending ? 'Signing in…' : 'Sign in'}
                  {!login.isPending ? <ArrowLeft className="h-4 w-4" /> : null}
                </button>
              </form>

              <p className="mt-10 border-t border-rule pt-6 text-[13px] leading-6 text-muted">
                No public sign-up. Accounts are created by the Super Admin. Forgot your password?
                Ask the President to reset it.
              </p>

              <p className="mt-7 text-[12px] text-muted">
                Specanciens Social Desk / {new Date().getFullYear()}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
