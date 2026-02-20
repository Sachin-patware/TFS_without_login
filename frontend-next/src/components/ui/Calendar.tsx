"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-0", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-3",
                caption: "flex justify-center pt-1 relative items-center px-2",
                caption_label: "text-sm font-bold text-white",
                nav: "space-x-1 flex items-center",
                button_previous: cn(
                    "absolute left-1 h-8 w-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-0 transition-all duration-200 text-slate-400 hover:text-white inline-flex items-center justify-center"
                ),
                button_next: cn(
                    "absolute right-1 h-8 w-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-0 transition-all duration-200 text-slate-400 hover:text-white inline-flex items-center justify-center"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-slate-300 rounded-md w-9 font-normal text-[0.8rem] uppercase",
                week: "flex w-full mt-2",
                day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day_button: cn(
                    "h-9 w-9 p-0 font-medium rounded-lg hover:bg-white/10 hover:text-white transition-all duration-200 text-slate-300 aria-selected:opacity-100"
                ),
                range_end: "day-range-end",
                selected:
                    "bg-blue-600 text-white hover:bg-blue-500 hover:text-white focus:bg-blue-600 focus:text-white font-bold shadow-lg shadow-blue-600/20",
                today: "bg-slate-700 text-white font-semibold border border-white/20",
                outside:
                    "day-outside text-slate-600 opacity-40 aria-selected:bg-blue-600/50 aria-selected:text-white aria-selected:opacity-30",
                disabled: "text-slate-700 opacity-30 cursor-not-allowed hover:bg-transparent",
                range_middle:
                    "aria-selected:bg-white/5 aria-selected:text-white",
                hidden: "invisible",
                ...classNames,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
