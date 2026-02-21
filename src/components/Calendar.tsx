'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Plus } from 'lucide-react';

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

  const prevYear = () => setCurrentMonth(subYears(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const nextYear = () => setCurrentMonth(addYears(currentMonth, 1));

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
      <div className="flex items-center gap-1">
        <button
          onClick={prevYear}
          className="p-2 hover:bg-[#F3F4F6] rounded-md transition-colors"
          aria-label="이전 년도"
        >
          <ChevronsLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-[#F3F4F6] rounded-md transition-colors"
          aria-label="이전 월"
        >
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>
      <h3 className="text-xl font-bold text-[#1F2937]">
        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
      </h3>
      <div className="flex items-center gap-1">
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-[#F3F4F6] rounded-md transition-colors"
          aria-label="다음 월"
        >
          <ChevronRight className="w-5 h-5 text-[#6B7280]" />
        </button>
        <button
          onClick={nextYear}
          className="p-2 hover:bg-[#F3F4F6] rounded-md transition-colors"
          aria-label="다음 년도"
        >
          <ChevronsRight className="w-5 h-5 text-[#6B7280]" />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return (
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((day, index) => (
          <div
            key={day}
            className={`text-center text-sm font-semibold py-2 ${
              index === 6 ? 'text-red-500' : 'text-[#6B7280]'
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
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dateStr = format(day, 'yyyy-MM-dd');
        const isSunday = i === 6;
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const hasRecord = recordedDates.has(dateStr);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const dayContent = renderDayContent ? renderDayContent(cloneDay) : null;

        days.push(
          <div
            key={dateStr}
            onClick={() => onSelectDate(cloneDay)}
            className={`
              relative flex flex-col items-center justify-start
              min-h-[72px] md:min-h-[80px] p-2
              bg-[#F9FAFB] rounded-lg cursor-pointer
              transition-all duration-200
              hover:bg-[#EDE9FE] hover:shadow-sm
              ${!isCurrentMonth ? 'opacity-40' : ''}
              ${isSelected ? 'bg-[#EDE9FE] ring-2 ring-[#7C3AED]' : ''}
              ${isToday && !isSelected ? 'ring-2 ring-[#7C3AED] ring-opacity-50' : ''}
            `}
          >
            <span className={`text-lg font-semibold ${
              isSunday ? 'text-red-500' : 'text-[#374151]'
            }`}>
              {format(day, 'd')}
            </span>

            {hasRecord && dayContent ? (
              <div className="flex flex-col items-center mt-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mb-0.5"></span>
                <div className="text-xs text-[#7C3AED] font-medium">
                  {dayContent}
                </div>
              </div>
            ) : (
              <Plus className={`w-4 h-4 mt-1 ${
                isSunday ? 'text-red-300' : 'text-[#D1D5DB]'
              }`} />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-2">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-2">{rows}</div>;
  };

  return (
    <div className="card bg-white">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
