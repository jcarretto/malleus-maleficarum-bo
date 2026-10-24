import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ComponentProps } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '@/copy'
import { adminAuthApi } from '@/services/auth'
import { ApiError, fieldErrorMessage } from '@/services/errors'
import type { AdminLoginInput } from '@/services/types'
import { setSession } from '@/stores/auth'

type FieldName = keyof AdminLoginInput
type FieldErrors = Partial<Record<FieldName, string>>

const totpPattern = /^\d{6}$/
const fieldOrder: readonly FieldName[] = ['email', 'password', 'totpCode']

function isFieldName(name: string): name is FieldName {
  return (fieldOrder as readonly string[]).includes(name)
}

/** Client-side checks that save a request. The API gives the same answer for every wrong credential. */
function validate(input: AdminLoginInput): FieldErrors {
  const errors: FieldErrors = {}
  if (input.email.trim() === '') errors.email = copy.auth.errors.emailRequired
  if (input.password === '') errors.password = copy.auth.errors.passwordRequired
  if (!totpPattern.test(input.totpCode)) errors.totpCode = copy.auth.errors.totpInvalid
  return errors
}

/** Per-field messages the API attached to a 422. Other errors have none. */
function apiFieldErrors(error: unknown): FieldErrors {
  const errors: FieldErrors = {}
  if (!(error instanceof ApiError)) return errors
  for (const f of error.fields) {
    if (isFieldName(f.field)) errors[f.field] ??= fieldErrorMessage(f)
  }
  return errors
}

interface FieldProps extends Omit<ComponentProps<typeof Input>, 'id' | 'aria-invalid'> {
  label: string
  hint?: string
  error?: string
}

function Field({ label, hint, error, ref, ...inputProps }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const totpRef = useRef<HTMLInputElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const inputRefs = { email: emailRef, password: passwordRef, totpCode: totpRef }

  const login = useMutation({
    mutationFn: (input: AdminLoginInput) => adminAuthApi.login(input),
    onSuccess: async (session) => {
      setSession(session)
      await navigate({ to: '/' })
    },
    onError: (error) => {
      setFieldErrors(apiFieldErrors(error))
      // A code is accepted once, so the old one is useless whatever went wrong.
      setTotpCode('')
    },
  })

  // Screen readers announce the alert; moving focus there also puts keyboard users at the message.
  useEffect(() => {
    if (login.error) alertRef.current?.focus()
  }, [login.error])

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return

    const input: AdminLoginInput = { email: email.trim(), password, totpCode }
    const errors = validate(input)
    setFieldErrors(errors)
    const firstInvalid = fieldOrder.find((name) => errors[name] !== undefined)
    if (firstInvalid) {
      inputRefs[firstInvalid].current?.focus()
      return
    }
    login.mutate(input)
  }

  const errorMessage = login.error instanceof ApiError ? login.error.userMessage : null

  return (
    <main className="grid min-h-svh place-items-center p-4">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6">
        <header className="mb-6 flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{copy.appName}</p>
          <h1 className="text-xl font-semibold">{copy.auth.signInTitle}</h1>
          <p className="text-muted-foreground text-sm">{copy.auth.signInDescription}</p>
        </header>

        <form noValidate onSubmit={handleSubmit} aria-busy={login.isPending}>
          <fieldset disabled={login.isPending} className="flex flex-col gap-4">
            {errorMessage ? (
              <Alert variant="destructive" ref={alertRef} tabIndex={-1}>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}
            <Field
              ref={emailRef}
              label={copy.auth.email}
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              error={fieldErrors.email}
            />
            <Field
              ref={passwordRef}
              label={copy.auth.password}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              error={fieldErrors.password}
            />
            <Field
              ref={totpRef}
              label={copy.auth.totpCode}
              hint={copy.auth.totpHint}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              spellCheck={false}
              value={totpCode}
              onChange={(e) => {
                setTotpCode(e.target.value.replace(/\D/g, ''))
              }}
              error={fieldErrors.totpCode}
            />
            <Button type="submit" className="w-full">
              {login.isPending ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  {copy.auth.submitting}
                </>
              ) : (
                copy.auth.submit
              )}
            </Button>
          </fieldset>
        </form>
      </div>
    </main>
  )
}
