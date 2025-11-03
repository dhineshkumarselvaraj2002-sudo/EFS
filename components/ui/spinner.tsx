import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ 
  className, 
  size = 'default',
  ...props 
}: React.ComponentProps<'svg'> & { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'size-3',
    default: 'size-4',
    lg: 'size-6',
  }

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin', sizeClasses[size], className)}
      {...props}
    />
  )
}

export { Spinner }
