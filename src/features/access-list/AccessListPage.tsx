import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useRef, useState, type RefObject } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { copy } from '@/copy'
import { AddEmailForm } from '@/features/access-list/AddEmailForm'
import { accessListApi, accessListQueryKey } from '@/features/access-list/api'
import { RemoveEmailButton } from '@/features/access-list/RemoveEmailButton'
import { formatDate } from '@/lib/format'
import { ApiError } from '@/services/errors'
import type { AccessList } from '@/services/types'

function isNotConfigured(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'access_list_not_configured'
}

/**
 * "Acceso a la app": the emails allowed to open the player app during pre-release.
 * Needs API-102 (/v1/admin/access-list).
 */
export function AccessListPage() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [notice, setNotice] = useState('')

  const list = useQuery({
    queryKey: accessListQueryKey,
    queryFn: ({ signal }) => accessListApi.list(signal),
    // A missing configuration does not fix itself by retrying.
    retry: (failureCount, error) => !isNotConfigured(error) && failureCount < 1,
  })

  return (
    <section className="flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
          {copy.accessList.title}
        </h1>
        <p className="text-muted-foreground">{copy.accessList.description}</p>
      </header>

      {/* Announces additions and removals; the list itself changes silently. */}
      <output className="text-sm empty:hidden">{notice}</output>

      <AccessListBody
        list={list}
        onAdded={(email) => {
          setNotice(copy.accessList.added(email))
        }}
        onRemoved={setNotice}
        headingRef={headingRef}
      />
    </section>
  )
}

interface AccessListBodyProps {
  list: UseQueryResult<AccessList>
  onAdded: (email: string) => void
  onRemoved: (message: string) => void
  headingRef: RefObject<HTMLHeadingElement | null>
}

function AccessListBody({ list, onAdded, onRemoved, headingRef }: AccessListBodyProps) {
  if (list.isPending) {
    return <output className="text-muted-foreground text-sm">{copy.accessList.loading}</output>
  }

  if (list.isError) {
    if (isNotConfigured(list.error)) {
      return (
        <Alert>
          <AlertTitle>{copy.accessList.notConfiguredTitle}</AlertTitle>
          <AlertDescription>{copy.accessList.notConfiguredBody}</AlertDescription>
        </Alert>
      )
    }
    const message =
      list.error instanceof ApiError ? list.error.userMessage : copy.errors.unexpectedBody
    return (
      <Alert variant="destructive">
        <AlertTitle>{copy.accessList.loadErrorTitle}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <p>{message}</p>
          <Button
            variant="outline"
            disabled={list.isFetching}
            onClick={() => {
              void list.refetch()
            }}
          >
            {copy.actions.retry}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const { items } = list.data
  return (
    <>
      <AddEmailForm onAdded={onAdded} />
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{copy.accessList.empty}</p>
      ) : (
        <Table>
          <TableCaption className="sr-only">{copy.accessList.tableCaption}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.accessList.columnEmail}</TableHead>
              <TableHead>{copy.accessList.columnAddedAt}</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">{copy.accessList.columnActions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.email}>
                <TableCell className="font-medium">{entry.email}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                </TableCell>
                <TableCell className="text-right">
                  <RemoveEmailButton
                    email={entry.email}
                    onRemoved={onRemoved}
                    focusAfterRemoval={headingRef}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
