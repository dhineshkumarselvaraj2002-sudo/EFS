import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import * as React from "react"

interface SpinnerButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export function SpinnerButton({
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: SpinnerButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Spinner />
          <span>{loadingText || 'Loading...'}</span>
        </div>
      ) : (
        children
      )}
    </Button>
  )
}

