"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn("flex flex-col sm:flex-row gap-2", defaultClassNames.months),
        month: cn("flex flex-col gap-4", defaultClassNames.month),
        month_caption: cn(
          "flex justify-center pt-1 relative items-center w-full",
          defaultClassNames.month_caption
        ),
        caption_label: cn("text-sm font-medium", defaultClassNames.caption_label),
        nav: cn(
          "flex items-center gap-1 absolute inset-x-0 top-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_next
        ),
        month_grid: cn("w-full border-collapse space-x-1", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected=true])]:bg-accent [&:has([data-range-end=true])]:rounded-r-md",
          props.mode === "range"
            ? "[&:has([data-range-end=true])]:rounded-r-md [&:has([data-range-start=true])]:rounded-l-md first:[&:has([data-selected=true])]:rounded-l-md last:[&:has([data-selected=true])]:rounded-r-md"
            : "[&:has([data-selected=true])]:rounded-md",
          defaultClassNames.day
        ),
        range_start: cn("bg-primary text-primary-foreground", defaultClassNames.range_start),
        range_end: cn("bg-primary text-primary-foreground", defaultClassNames.range_end),
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          defaultClassNames.selected
        ),
        today: cn("bg-accent text-accent-foreground", defaultClassNames.today),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
          defaultClassNames.range_middle
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", className)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("size-4", className)} {...chevronProps} />
          ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      data-selected={modifiers.selected || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      className={cn(
        "size-8 p-0 font-normal aria-selected:opacity-100",
        className
      )}
      {...props}
    />
  )
}

export { Calendar }
