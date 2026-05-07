import { motion } from 'motion/react';

const pulse = {
  animate: { opacity: [0.4, 0.85, 0.4] },
  transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const },
};

function SkeletonLine({ width = 'w-full', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <motion.div
      className={`${width} ${height} bg-slate-200/80 rounded-full`}
      {...pulse}
    />
  );
}

export function FlightSkeletonCard() {
  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg rounded-3xl p-5 mb-4 flex flex-col">
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col flex-1 gap-y-2 pr-4" style={{ gap: 8 }}>
          <SkeletonLine height="h-6" width="w-2/3" />
          <SkeletonLine height="h-4" width="w-full" />
        </div>
        <SkeletonLine height="h-8" width="w-24" />
      </div>
      <div className="mt-5 flex flex-row" style={{ gap: 12 }}>
        <motion.div className="flex-1 h-10 bg-slate-200/80 rounded-2xl" {...pulse} />
        <motion.div className="w-12 h-10 bg-slate-200/80 rounded-2xl" {...pulse} />
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
