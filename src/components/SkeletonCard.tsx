import { motion } from 'motion/react';

const pulse = {
  animate: { opacity: [0.4, 0.85, 0.4] },
  transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const },
};

function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <motion.div
      className={`${width} ${height} bg-slate-200/80 dark:bg-slate-700/50 ${className ? className : 'rounded-full'}`}
      {...pulse}
    />
  );
}

export function FlightSkeletonCard() {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm rounded-[20px] p-4 flex flex-col h-[180px]">
      <div className="flex flex-row justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <SkeletonLine height="h-7" width="w-7" className="rounded-md" />
          <div className="flex flex-col gap-1.5 pt-0.5">
            <SkeletonLine height="h-2.5" width="w-16" className="rounded-full" />
            <SkeletonLine height="h-2" width="w-10" className="rounded-full" />
          </div>
        </div>
        <SkeletonLine height="h-6" width="w-6" className="rounded-md" />
      </div>
      <div className="flex flex-row justify-between items-end mb-4 mt-2">
         <SkeletonLine height="h-[28px]" width="w-12" />
         <div className="flex-1 px-4 flex justify-center items-center">
            <SkeletonLine height="h-[2px]" width="w-3/4" />
         </div>
         <SkeletonLine height="h-[28px]" width="w-12" />
      </div>
      
      <div className="mt-auto flex flex-row justify-between items-end pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
        <div className="flex flex-col gap-1.5">
           <SkeletonLine height="h-2" width="w-8" />
           <SkeletonLine height="h-[20px]" width="w-20" />
        </div>
        <div className="flex gap-2">
           <SkeletonLine height="h-8" width="w-8" className="rounded-[8px]" />
           <SkeletonLine height="h-8" width="w-14" className="rounded-[8px]" />
        </div>
      </div>
    </div>
  );
}

export function ItinerarySkeletonCard() {
  return (
    <div className="relative flex items-stretch group w-full pl-[22px] sm:pl-10 lg:pl-12 my-2">
      <div className="absolute left-[10px] sm:left-4 lg:left-5 top-0 bottom-0 w-[4px] bg-slate-100 dark:bg-slate-800 rounded-full" />
      <div className="absolute left-[5px] sm:left-2 lg:left-3 top-6 sm:top-7 w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] lg:w-[20px] lg:h-[20px] rounded-full border-2 sm:border-[3px] lg:border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 shadow-sm z-20" />
      
      <div className="flex-1 p-4 sm:p-5 rounded-[24px] sm:rounded-[32px] relative z-10 w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-100/50 dark:border-slate-700/50 shadow-sm">
        <div className="flex flex-col gap-2 sm:gap-3 w-full">
          <div className="flex flex-row items-start gap-2 sm:gap-2.5">
            <motion.div className="relative w-6 h-6 sm:w-8 sm:h-8 mt-0.5 shrink-0 rounded-[10px] sm:rounded-[12px] bg-slate-200/50 dark:bg-slate-700/50" {...pulse} />
            <div className="flex flex-col flex-1 gap-2.5 pt-1">
              <SkeletonLine height="h-3" width="w-24" className="rounded-full" />
              <SkeletonLine height="h-5" width="w-3/4" className="rounded-full" />
              <div className="mt-1 flex gap-2">
                 <SkeletonLine height="h-6" width="w-16" className="rounded-full" />
                 <SkeletonLine height="h-6" width="w-20" className="rounded-full" />
                 <SkeletonLine height="h-6" width="w-14" className="rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
