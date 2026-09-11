import { Loader2 } from "lucide-react"
import { cn } from "cn"

/** Small inline spinner for buttons and other pending-state indicators. */
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
