import { motion } from 'motion/react';
import { Store } from 'lucide-react';
import GlassCard from './GlassCard';

interface RedirectModalProps {
  provider: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RedirectModal({ provider, onClose, onConfirm }: RedirectModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 16px 32px',
        backgroundColor: 'rgba(15,23,42,0.45)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        style={{ width: '100%', maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="items-center !p-8 border-2 border-white/80 shadow-2xl bg-[#faf5ff] flex flex-col">
          <div className="mx-auto w-20 h-20 bg-white/80 rounded-full flex items-center justify-center mb-6 border border-white">
            <Store size={40} color="#9333ea" />
          </div>

          <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">準備前往訂購！</h2>
          <p className="text-slate-600 font-medium mb-8 text-center leading-relaxed">
            即將為您導向至{' '}
            <strong className="font-extrabold text-[#9333ea] text-lg">{provider}</strong> 官方網站。
          </p>
          <p className="text-xs text-slate-400 -mt-5 mb-6 text-center">
            我們會先記錄一次導流事件，再安全開啟外部連結。
          </p>

          <div className="flex flex-col space-y-3 w-full">
            <button
              onClick={onConfirm}
              className="w-full py-4 rounded-2xl bg-[#d946ef] shadow-lg flex flex-row justify-center mb-3 appearance-none border-none cursor-pointer hover:opacity-90"
            >
              <span className="font-black text-white text-lg">確認前往</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-white/50 border border-white/60 flex flex-row justify-center appearance-none cursor-pointer hover:bg-white/70"
            >
              <span className="font-bold text-slate-500 text-lg">再想一下</span>
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
