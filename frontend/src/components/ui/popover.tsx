import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className = '', align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={`z-50 min-w-[8rem] overflow-hidden rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-3 shadow-lg border border-white/40 dark:border-gray-700/60 animate-in fade-in-0 zoom-in-95 ${className}`}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
}
