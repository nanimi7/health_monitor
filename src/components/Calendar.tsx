'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addYears, subYears } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus } from 'lucide-react';

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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <button
          onClick={prevYear}
          className="text-[#B0B0B0] hover:text-[#888] transition-colors text-base"
          aria-label="이전 년도"
        >
          «
        </button>
        <button
          onClick={prevMonth}
          className="text-[#B0B0B0] hover:text-[#888] transition-colors text-base"
          aria-label="이전 월"
        >
          ‹
        </button>
      </div>
      <h3 className="text-base font-bold text-[#1F2937]">
        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
      </h3>
      <div className="flex items-center gap-3">
        <button
          onClick={nextMonth}
          className="text-[#B0B0B0] hover:text-[#888] transition-colors text-base"
          aria-label="다음 월"
        >
          ›
        </button>
        <button
          onClick={nextYear}
          className="text-[#B0B0B0] hover:text-[#888] transition-colors text-base"
          aria-label="다음 년도"
        >
          »
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return (
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {days.map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-1 ${
              index === 6 ? 'text-[#E57373]' : 'text-[#9CA3AF]'
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
              flex flex-col items-center justify-start
              min-h-[54px] py-1.5 px-0.5
              bg-[#F6F6F7] rounded-md cursor-pointer
              transition-all duration-150
              hover:bg-[#EEEEEF]
              ${!isCurrentMonth ? 'opacity-35' : ''}
              ${isSelected ? 'ring-1 ring-[#7C3AED]' : ''}
            `}
          >
            <div className="relative">
              <span className={`text-sm font-medium ${
                isSunday ? 'text-[#E57373]' : 'text-[#4B5563]'
              }`}>
                {format(day, 'd')}
              </span>
              {isToday && (
                <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              )}
            </div>

            {hasRecord && dayContent ? (
              <div className="text-[10px] text-[#3B82F6] font-medium mt-0.5">
                {dayContent}
              </div>
            ) : (
              <Plus className={`w-3 h-3 mt-0.5 ${
                isSunday ? 'text-[#EDAAAA]' : 'text-[#CDCDCD]'
              }`} strokeWidth={1.5} />
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-1.5">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="space-y-1.5">{rows}</div>;
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-[#E5E7EB]">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
