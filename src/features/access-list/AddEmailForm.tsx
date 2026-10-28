import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '@/copy'
import { accessListApi, accessListQueryKey } from '@/features/access-list/api'
import { ApiError, fieldErrorMessage } from '@/services/errors'

/**
 * Deliberately loose: it only catches typos (empty, no "@", spaces) and saves a request.
 * The API decides what a valid email is.
 */
const looksLikeEmail = /^[^\s@]+@[^\s@]+$/

function clientEmailError(email: string): string | undefined {
  if (email === '') return copy.accessList.errors.emailRequired
  if (!looksLikeEmail.test(email)) return copy.accessList.errors.emailInvalid
  return undefined
}

/** Errors that belong next to the email field; anything else goes to the form alert. */
function apiEmailError(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined
  if (error.code === 'already_listed') return error.userMessage
  const field = error.fields.find((f) => f.field === 'email')
  return field ? fieldErrorMessage(field) : undefined
}

interface AddEmailFormProps {
  onAdded: (email: string) => void
}

export function AddEmailForm({ onAdded }: AddEmailFormProps) {
  const queryClient = useQueryClient()
  const id = useId()
  const errorId = `${id}-error`
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  const add = useMutation({
    mutationFn: (value: string) => accessListApi.add(value),
    onSuccess: async (entry) => {
      setEmail('')
      onAdded(entry.email)
      await queryClient.invalidateQueries({ queryKey: accessListQueryKey })
    },
  })

  const apiFieldError = apiEmailError(add.error)
  const emailError = clientError ?? apiFieldError
  // Errors without a field (server, network, configuration) are announced in the alert.
  const formError = add.error instanceof ApiError && !apiFieldError ? add.error.userMessage : null

  // Focus moves once the fieldset is enabled again: to the field to fix, the alert,
  // or back to the empty field for the next email.
  useEffect(() => {
    if (add.isPending) return
    if (formError) alertRef.current?.focus()
    else if (apiFieldError || add.isSuccess) inputRef.current?.focus()
  }, [add.isPending, add.isSuccess, apiFieldError, formError])

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (add.isPending) return

    const value = email.trim()
    const error = clientEmailError(value)
    setClientError(error)
    if (error) {
      add.reset()
      inputRef.current?.focus()
      return
    }
    add.mutate(value)
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-busy={add.isPending}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3"
    >
      <h2 id={`${id}-title`} className="text-base font-medium">
        {copy.accessList.addTitle}
      </h2>
      {formError ? (
        <Alert variant="destructive" ref={alertRef} tabIndex={-1}>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <fieldset disabled={add.isPending} className="flex flex-col gap-1.5">
        <Label htmlFor={id}>{copy.accessList.email}</Label>
        <div className="flex items-start gap-2">
          <Input
            id={id}
            ref={inputRef}
            type="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={copy.accessList.emailPlaceholder}
            className="max-w-sm"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? errorId : undefined}
          />
          <Button type="submit">
            {add.isPending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                {copy.accessList.adding}
              </>
            ) : (
              copy.accessList.add
            )}
          </Button>
        </div>
        {emailError ? (
          <p id={errorId} className="text-destructive text-xs">
            {emailError}
          </p>
        ) : null}
      </fieldset>
    </form>
  )
}
