import { motion } from 'motion/react';

const pulse = {
  animate: { opacity: [0.4, 0.85, 0.4] },
  transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const },
};

function SkeletonLine({ width = 'w-full', height = 'h-4', className = '' }: { width?: string; height?: string; className?: string }) {
  return (
    <motion.div
      className={`${width} ${height} bg-slate-200/80 ${className ? className : 'rounded-full'}`}
      {...pulse}
    />
  );
}

export function FlightSkeletonCard() {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm rounded-[20px] p-4 flex flex-col h-[180px]">
      <div className="flex flex-row justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <SkeletonLine height="h-7" width="w-7" className="rounded-lg" />
          <div className="flex flex-col gap-1" style={{ gap: 4 }}>
            <SkeletonLine height="h-2.5" width="w-16" />
            <SkeletonLine height="h-2.5" width="w-10" />
          </div>
        </div>
        <SkeletonLine height="h-6" width="w-6" className="rounded-full" />
      </div>
      <div className="flex flex-row justify-between items-end mb-4 mt-1">
         <SkeletonLine height="h-6" width="w-12" />
         <div className="flex-1 px-3"><SkeletonLine height="h-[2px]" width="w-full" /></div>
         <SkeletonLine height="h-6" width="w-12" />
      </div>
      
      <div className="mt-auto flex flex-row justify-between items-end pt-2 border-t border-dashed border-slate-200">
        <div className="flex flex-col gap-1.5">
           <SkeletonLine height="h-2" width="w-12" />
           <SkeletonLine height="h-5" width="w-16" />
        </div>
        <div className="flex gap-1.5">
           <SkeletonLine height="h-8" width="w-8" className="rounded-[10px]" />
           <SkeletonLine height="h-8" width="w-16" className="rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

export function ItinerarySkeletonCard() {
  return (
    <div className="relative mb-6 flex flex-col">
      <div className="absolute -left-9 top-6 w-5 h-5 rounded-full bg-slate-200/80" />
      <div className="ml-2 bg-white/40 border border-white/60 rounded-3xl p-5 flex flex-col" style={{ gap: 8 }}>
        <div className="flex flex-row items-center" style={{ gap: 16 }}>
          <motion.div className="w-14 h-14 rounded-full bg-slate-200/80 shrink-0" {...pulse} />
          <div className="flex flex-col flex-1" style={{ gap: 8 }}>
            <SkeletonLine height="h-3" width="w-1/4" />
            <SkeletonLine height="h-5" width="w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
