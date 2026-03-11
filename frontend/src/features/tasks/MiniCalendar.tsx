
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onDateSelect }) => {
    const [displayDate, setDisplayDate] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handlePrevMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
    };

    const calendarGrid = useMemo(() => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid = [];
        let day = 1;
        for (let i = 0; i < 6; i++) {
            const week = [];
            for (let j = 0; j < 7; j++) {
                if ((i === 0 && j < firstDayOfMonth) || day > daysInMonth) {
                    week.push(null);
                } else {
                    week.push(new Date(year, month, day));
                    day++;
                }
            }
            grid.push(week);
            if (day > daysInMonth) break;
        }
        return grid;
    }, [displayDate]);

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-semibold text-white">
                    {displayDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-slate-500">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-y-1">
                {calendarGrid.map((week, i) => (
                    <React.Fragment key={i}>
                        {week.map((date, j) => {
                            if (!date) return <div key={`empty-${j}`}></div>;

                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, today);

                            let buttonClass = 'w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ';
                            if (isSelected) {
                                buttonClass += 'bg-violet-600 text-white font-semibold';
                            } else if (isToday) {
                                buttonClass += 'bg-slate-700 text-white';
                            } else {
                                buttonClass += 'text-slate-300 hover:bg-slate-800';
                            }

                            return (
                                <div key={date.toISOString()} className="flex justify-center">
                                    <button onClick={() => onDateSelect(date)} className={buttonClass}>
                                        {date.getDate()}
                                    </button>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default MiniCalendar;
