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
  const prefersReducedMotion = useReducedMotion() ?? false;
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
      <div className="fixed inset-0 z-popup flex items-center justify-center p-3.5 sm:p-4">
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
          className="relative z-popup-above w-[92vw] max-w-[480px] min-w-[300px] shrink-0 overflow-hidden rounded-[28px] border border-white/86 bg-white/80 backdrop-blur-[32px] p-4 shadow-[0_24px_56px_rgba(15,23,42,0.18)] md:w-[480px] md:p-6"
        >
          <div className="mb-6 flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <span className="fluid-title font-black text-slate-800">{year}年 {monthNames[month]}</span>
              <span className="fluid-kicker mt-0.5 font-black uppercase text-slate-500">Select Date</span>
            </div>
            <div className="flex gap-x-3">
              <button onClick={() => changeMonth(-1)} aria-label="上個月" className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60">
                <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <button onClick={() => changeMonth(1)} aria-label="下個月" className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60">
                <ChevronRight size={24} className="text-slate-600" />
              </button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="fluid-kicker pb-2 text-center font-black uppercase text-slate-500">{d}</div>
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
                    relative rounded-[16px] py-2.5 text-[13px] font-bold transition-all
                    ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                    ${isSelected
                      ? 'z-10 bg-gradient-to-r from-sky-500 to-orange-400 text-white shadow-[0_10px_22px_rgba(14,165,233,0.20)]'
                      : disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-pink-50 hover:text-pink-600'}
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
              className="fluid-kicker font-black uppercase text-slate-500 transition-colors hover:text-pink-500"
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
