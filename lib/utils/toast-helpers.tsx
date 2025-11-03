'use client'

import { useToast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'

/**
 * Helper hook to show error toasts with actions
 */
export function useErrorToast() {
  const { toast } = useToast()

  const showError = (
    title: string,
    description?: string,
    action?: {
      label: string
      onClick: () => void
    }
  ) => {
    toast({
      variant: 'destructive',
      title,
      description,
      action: action ? (
        <ToastAction altText={action.label} onClick={action.onClick}>
          {action.label}
        </ToastAction>
      ) : undefined,
    })
  }

  const showRetryError = (
    title: string,
    description: string,
    onRetry: () => void
  ) => {
    showError(title, description, {
      label: 'Try again',
      onClick: onRetry,
    })
  }

  return { showError, showRetryError }
}

