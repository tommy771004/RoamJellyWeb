import React from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { getOverlayTransition, getModalMotion } from "../../lib/motionTokens";
import { useModalAccessibility } from "../../lib/useModalAccessibility";
import { useTranslation } from "react-i18next";

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({
  imageUrl,
  onClose,
}: ImagePreviewModalProps) {
  const { t } = useTranslation();
  const dialogRef = useModalAccessibility(onClose);
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getOverlayTransition()}
      className="fixed inset-0 z-max flex items-center justify-center p-4 sm:p-10"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div
        ref={dialogRef}
        initial={getModalMotion().initial}
        animate={getModalMotion().animate}
        exit={getModalMotion().exit}
        transition={getModalMotion().transition}
        role="dialog"
        aria-modal="true"
        aria-label={t("a11y.image_preview")}
        tabIndex={-1}
        className="relative max-w-5xl w-full max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl z-10 flex items-center justify-center"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-slate-800 ios-press transition-colors shadow-sm"
          aria-label={t("str_12bb2d")}
        >
          <X size={20} strokeWidth={2.5} />
        </button>
        <img
          src={imageUrl}
          alt="預覽圖片"
          className="w-full h-full max-h-[90vh] object-contain shrink-0"
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </motion.div>,
    document.body,
  );
}
