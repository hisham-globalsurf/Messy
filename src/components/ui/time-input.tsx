import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

function TimeInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <InputGroup className={cn("w-40", className)}>
      <InputGroupAddon>
        <Clock />
      </InputGroupAddon>
      <InputGroupInput type="time" {...props} />
    </InputGroup>
  )
}

export { TimeInput }
