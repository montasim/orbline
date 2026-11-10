import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "#/lib/utils"
import { Slot } from "radix-ui"

// Sizes follow components/DESIGN.md (Controls).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-display text-sm font-extrabold uppercase tracking-wider whitespace-nowrap transition-all outline-none active:scale-95 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        /** primary: mint → teal gradient pill with dark ink text */
        aurora: "btn-aurora",
        /** secondary: frosted pill */
        frost: "frost-chip text-ice border-mint/25",
      },
      size: {
        /** primary */
        default: "h-12 px-6 text-lg",
        /** secondary */
        md: "h-11 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        /** chip-sized action */
        /** touch screens grow chip and icon buttons to a 44px tap target */
        chip: "h-9 pointer-coarse:h-11 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-10 pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
