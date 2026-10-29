import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { copy } from '@/copy'
import { accessListApi, accessListQueryKey } from '@/features/access-list/api'
import { ApiError } from '@/services/errors'

interface RemoveEmailButtonProps {
  email: string
  /** Called with the message to announce once the email is no longer listed. */
  onRemoved: (message: string) => void
  /** Where focus goes after the removal, since this row's button disappears. */
  focusAfterRemoval: RefObject<HTMLElement | null>
}

/** Per-row remove button. Removal asks for confirmation first. */
export function RemoveEmailButton({ email, onRemoved, focusAfterRemoval }: RemoveEmailButtonProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  // Set before the dialog closes, so its close handler knows the row is going away.
  const removedRef = useRef(false)

  const remove = useMutation({
    mutationFn: () => accessListApi.remove(email),
    onSuccess: () => {
      finish(copy.accessList.removed(email))
    },
    onError: (error) => {
      // Someone else removed it first: the outcome is what the admin asked for.
      if (error instanceof ApiError && error.code === 'not_found') {
        finish(copy.accessList.alreadyRemoved(email))
      }
    },
  })

  function finish(message: string) {
    removedRef.current = true
    setOpen(false)
    onRemoved(message)
    void queryClient.invalidateQueries({ queryKey: accessListQueryKey })
  }

  const errorMessage =
    remove.error instanceof ApiError && remove.error.code !== 'not_found'
      ? remove.error.userMessage
      : null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return
        if (next) remove.reset()
        setOpen(next)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={copy.accessList.removeLabel(email)}>
          <Trash2 aria-hidden="true" />
          {copy.accessList.remove}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (removedRef.current) {
            event.preventDefault()
            focusAfterRemoval.current?.focus()
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="break-all">
            {copy.accessList.confirmTitle(email)}
          </AlertDialogTitle>
          <AlertDialogDescription>{copy.accessList.confirmBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>
            {copy.accessList.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(event) => {
              // Keep the dialog open until the API answers, so errors show here.
              event.preventDefault()
              remove.mutate()
            }}
          >
            {remove.isPending ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                {copy.accessList.removing}
              </>
            ) : (
              copy.accessList.remove
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
