import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';

interface DatePickerPopupProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  allowPast?: boolean;
  /** Earliest selectable date as YYYY-MM-DD string */
  minDate?: string;
}

export default function DatePickerPopup({ selectedDate, onSelect, onClose, allowPast = false, minDate }: DatePickerPopupProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);
  const effectiveViewDate = isNaN(viewDate.getTime()) ? new Date() : viewDate;

  const month = effectiveViewDate.getMonth();
  const year = effectiveViewDate.getFullYear();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());

  const days: Date[] = [];
  let currDay = new Date(startDate);
  while (currDay <= monthEnd || days.length % 7 !== 0) {
    days.push(new Date(currDay));
    currDay.setDate(currDay.getDate() + 1);
    if (days.length > 42) break;
  }

  const changeMonth = (offset: number) => setViewDate(new Date(year, month + offset, 1));

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDate(today);
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={modalMotion.initial}
          animate={modalMotion.animate}
          exit={modalMotion.exit}
          transition={modalMotion.transition}
          className="relative w-[90vw] md:w-[480px] max-w-[480px] min-w-[300px] shrink-0 bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] border border-white z-[210] overflow-hidden p-6 md:p-8"
        >
          <div className="flex flex-row justify-between items-center mb-8">
            <div className="flex flex-col">
              <span className="text-2xl font-black text-slate-800 tracking-tight">{year}年 {monthNames[month]}</span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Select Date</span>
            </div>
            <div className="flex gap-x-3">
              <button onClick={() => changeMonth(-1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all">
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <button onClick={() => changeMonth(1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-all">
                <ChevronRight size={24} className="text-slate-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-widest pb-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((date, i) => {
              const dateStr = formatDate(date);
              const isCurrentMonth = date.getMonth() === month;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const isPast = !allowPast && date < new Date(new Date().setHours(0, 0, 0, 0));
              const isBelowMin = !!minDate && dateStr < minDate;
              const disabled = (isPast && !isToday) || isBelowMin;
              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => { if (!disabled) { onSelect(dateStr); onClose(); } }}
                  className={`
                    relative py-2.5 rounded-xl text-sm font-bold transition-all
                    ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                    ${isSelected
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-500/20 z-10'
                      : disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-pink-50 hover:text-pink-600'}
                  `}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-pink-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-400 hover:text-pink-500 transition-colors"
            >
              關閉
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
