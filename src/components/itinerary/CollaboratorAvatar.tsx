import { motion } from "motion/react";
import type { Collaborator } from "../../types/workflow";

export default function CollaboratorAvatar({
  collaborator,
  index,
  isOnline,
}: {
  collaborator: Collaborator;
  index: number;
  isOnline: boolean;
  key?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, x: -15 }}
      animate={{ scale: 1, x: 0 }}
      whileHover={{ y: -4, scale: 1.08 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: index * 0.05 
      }}
      className="relative -ml-2.5 first:ml-0 group cursor-pointer"
      style={{ zIndex: 10 + index }}
    >
      <div
        className={`w-11 h-11 rounded-full border-[2.5px] border-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] overflow-hidden transition-all duration-300 relative ${isOnline ? "ring-[2.5px] ring-emerald-400/80 ring-offset-2 shadow-[0_0_12px_rgba(52,211,153,0.5)]" : ""}`}
      >
        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-xl font-black">
          {(collaborator.avatar?.length ?? 0) > 2 ? (
            <img
              src={collaborator.avatar}
              alt={collaborator.name ?? "協作者"}
              className="w-full h-full object-cover"
            />
          ) : (
            (collaborator.avatar ?? "👤")
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-xl">
        {collaborator.name}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-[2.5px] border-white"></span>
        </span>
      )}
    </motion.div>
  );
}
