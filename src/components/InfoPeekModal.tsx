import { useEffect, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

type PeekIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

export type InfoPeekTone = "sky" | "orange" | "cyan" | "pink" | "emerald";

export type InfoPeekContent = {
  eyebrow: string;
  title: string;
  description: string;
  details: readonly string[];
  tone?: InfoPeekTone;
  icon?: PeekIcon;
};

type InfoPeekModalProps = {
  open: boolean;
  onClose: () => void;
  content: InfoPeekContent | null;
};

const TONE_STYLES: Record<InfoPeekTone, { badge: string; icon: string; chip: string; glow: string }> = {
  sky: {
    badge: "border-sky-100 bg-sky-50 text-sky-700",
    icon: "bg-sky-100 text-sky-700",
    chip: "border-sky-100 bg-sky-50/90 text-sky-700",
    glow: "bg-sky-200/40",
  },
  orange: {
    badge: "border-orange-100 bg-orange-50 text-orange-700",
    icon: "bg-orange-100 text-orange-700",
    chip: "border-orange-100 bg-orange-50/90 text-orange-700",
    glow: "bg-orange-200/40",
  },
  cyan: {
    badge: "border-cyan-100 bg-cyan-50 text-cyan-700",
    icon: "bg-cyan-100 text-cyan-700",
    chip: "border-cyan-100 bg-cyan-50/90 text-cyan-700",
    glow: "bg-cyan-200/40",
  },
  pink: {
    badge: "border-pink-100 bg-pink-50 text-pink-700",
    icon: "bg-pink-100 text-pink-700",
    chip: "border-pink-100 bg-pink-50/90 text-pink-700",
    glow: "bg-pink-200/40",
  },
  emerald: {
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-100 text-emerald-700",
    chip: "border-emerald-100 bg-emerald-50/90 text-emerald-700",
    glow: "bg-emerald-200/40",
  },
};

export default function InfoPeekModal({ open, onClose, content }: InfoPeekModalProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const tone = TONE_STYLES[content?.tone ?? "sky"];
  const Icon = content?.icon;

  return createPortal(
    <AnimatePresence>
      {open && content ? (
        <div className="fixed inset-0 z-modal flex items-end justify-center p-3 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label="關閉說明"
            className="absolute inset-0 bg-slate-900/42 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0.12 } : { duration: 0.18, ease: "easeOut" }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-peek-title"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={prefersReducedMotion ? { duration: 0.14 } : { duration: 0.22, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[30px] border border-white/92 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,251,0.94),rgba(240,249,255,0.92))] p-4 shadow-[0_20px_46px_rgba(15,23,42,0.14)] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`absolute -right-10 -top-10 size-28 rounded-full blur-3xl ${tone.glow}`} />

            <div className="relative flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {Icon ? (
                  <div className={`mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-[18px] shadow-sm ${tone.icon}`}>
                    <Icon size={22} strokeWidth={2.5} />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className={`fluid-kicker inline-flex rounded-full border px-3 py-1 font-black uppercase ${tone.badge}`}>
                    {content.eyebrow}
                  </p>
                  <h2 id="info-peek-title" className="fluid-title mt-3 text-balance font-black text-slate-900 sm:text-[28px]">
                    {content.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="關閉說明"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:border-slate-300 hover:text-slate-700"
              >
                <X size={18} strokeWidth={2.6} />
              </button>
            </div>

            <p className="fluid-copy relative mt-4 text-pretty text-slate-600">
              {content.description}
            </p>

            <div className="relative mt-5 grid gap-2.5">
              {content.details.map((detail, index) => (
                <div
                  key={`${content.title}-${index}`}
                  className="flex items-start gap-3 rounded-[20px] border border-white/90 bg-white/80 px-3.5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                >
                  <span className={`fluid-kicker mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border font-black ${tone.chip}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="fluid-body text-pretty font-medium text-slate-600">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
              >
                關閉說明
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
