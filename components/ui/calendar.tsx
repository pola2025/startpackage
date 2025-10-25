"use client"

import * as React from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

function CustomCalendar({
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  return (
    <div className="w-fit">
      <Calendar
        value={selected}
        onChange={(value) => {
          if (value instanceof Date) {
            onSelect?.(value)
          }
        }}
        tileDisabled={({ date }) => {
          const day = date.getDay()
          const isWeekend = day === 0 || day === 6
          if (isWeekend) return true
          if (disabled) return disabled(date)
          return false
        }}
        tileClassName={({ date }) => {
          const day = date.getDay()
          if (day === 0) return "weekend-sunday"
          if (day === 6) return "weekend-saturday"
          return ""
        }}
        className={className}
        locale="ko-KR"
        formatDay={(locale, date) => date.getDate().toString()}
      />
    </div>
  )
}

CustomCalendar.displayName = "Calendar"

export { CustomCalendar as Calendar }
