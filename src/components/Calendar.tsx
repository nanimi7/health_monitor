'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  recordedDates?: Set<string>;
  renderDayContent?: (date: Date) => React.ReactNode;
}

export default function Calendar({
  selectedDate,
  onSelectDate,
  recordedDates = new Set(),
  renderDayContent,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={prevMonth}
        className="p-2 hover:bg-[#F9FAFB] rounded-md transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
      </button>
      <h3 className="text-lg font-semibold">
        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
      </h3>
      <button
        onClick={nextMonth}
        className="p-2 hover:bg-[#F9FAFB] rounded-md transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-[#6B7280]" />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return (
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-medium py-2 ${
              index === 0 ? 'text-red-500' : 'text-[#6B7280]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dateStr = format(day, 'yyyy-MM-dd');
        const isSunday = i === 0;
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const hasRecord = recordedDates.has(dateStr);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={dateStr}
            onClick={() => onSelectDate(cloneDay)}
            className={`
              calendar-day relative min-h-[48px] md:min-h-[64px] p-1
              ${!isCurrentMonth ? 'opacity-30' : ''}
              ${isSunday ? 'sunday' : ''}
              ${isSelected ? 'selected' : hasRecord ? 'has-record' : ''}
              ${isToday && !isSelected ? 'ring-2 ring-[#7C3AED] ring-inset' : ''}
            `}
          >
            <span className="text-sm">{format(day, 'd')}</span>
            {renderDayContent && (
              <div className="mt-1">
                {renderDayContent(cloneDay)}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="card">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
