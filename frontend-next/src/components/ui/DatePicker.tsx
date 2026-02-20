"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/Calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/Popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select"

interface DatePickerProps {
    value?: string
    onChange?: (date: string) => void
    placeholder?: string
    className?: string
    icon?: React.ReactNode
}

export function DatePicker({ value, onChange, placeholder = "Select date", className, icon }: DatePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
        value ? new Date(value) : undefined
    )
    const [month, setMonth] = React.useState<Date>(selectedDate || new Date())
    const [open, setOpen] = React.useState(false);

    // Update internal state if value prop changes
    React.useEffect(() => {
        if (value) {
            const date = new Date(value);
            setSelectedDate(date);
            setMonth(date);
        } else {
            setSelectedDate(undefined);
        }
    }, [value]);

    const handleSelect = (date: Date | undefined) => {
        setSelectedDate(date)
        if (date) {
            setMonth(date); // Sync calendar view with selected date
            if (onChange) {
                const formattedDate = format(date, "yyyy-MM-dd")
                onChange(formattedDate)
            }
        } else {
            if (onChange) onChange("");
        }
        setOpen(false)
    }

    const handleMonthSelect = (monthStr: string) => {
        const newDate = new Date(month)
        newDate.setMonth(parseInt(monthStr))
        setMonth(newDate)
    }

    const handleYearSelect = (yearStr: string) => {
        const newDate = new Date(month)
        newDate.setFullYear(parseInt(yearStr))
        setMonth(newDate)
    }

    // Generate year options (from 1950 to current year)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: currentYear - 1949 }, (_, i) => (currentYear - i).toString())
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        type="button"
                        className={cn(
                            "w-full justify-start text-left font-normal h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all",
                            !selectedDate && "text-muted-foreground",
                            icon ? "pl-10" : "pl-3",
                            className
                        )}
                    >
                        {selectedDate ? (
                            <span className="text-white">{format(selectedDate, "PPP")}</span>
                        ) : (
                            <span className="text-slate-400">{placeholder}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50 text-slate-400" />
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-slate-950 border-slate-800" align="start">
                <div className="p-3 space-y-3">
                    <div className="flex gap-5">
                        <Select
                            value={month.getMonth().toString()}
                            onValueChange={handleMonthSelect}
                        >
                            <SelectTrigger className="w-[110px] bg-slate-900 border-slate-800 text-white focus:ring-slate-700">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[200px]">
                                {months.map((m, i) => (
                                    <SelectItem key={m} value={i.toString()} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={month.getFullYear().toString()}
                            onValueChange={handleYearSelect}
                        >
                            <SelectTrigger className="w-[80px] bg-slate-900 border-slate-800 text-white focus:ring-slate-700">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-[200px]">
                                {years.map((y) => (
                                    <SelectItem key={y} value={y} className="focus:bg-slate-800 focus:text-white cursor-pointer">
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="p-3 pt-0 border-t border-slate-800/50">

                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        month={month}
                        onMonthChange={setMonth}
                        className="p-0 pointer-events-auto"
                        classNames={{
                            selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white font-bold rounded-lg",
                            today: "bg-slate-700 text-white font-semibold rounded-lg",
                            day_button: "h-8 w-8  font-normal aria-selected:opacity-100 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg",
                            caption_label: "hidden", // Hide default caption since we have custom selectors
                            nav: "hidden", // Hide default nav arrows since we have custom selectors
                        }}
                    />

                </div>

                <div className="flex items-center justify-between p-2 border-t border-slate-800 bg-slate-900/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                            setSelectedDate(undefined)
                            if (onChange) onChange("")
                            setOpen(false)
                        }}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                            const today = new Date()
                            handleSelect(today)
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white h-8 p-2"
                    >
                        Today
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
