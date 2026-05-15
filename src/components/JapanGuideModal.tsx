import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ExternalLink, MapPin } from 'lucide-react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';

interface JapanGuideModalProps {
  open: boolean;
  onClose: () => void;
}

const BASE = 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/';

function jpUrl(path: string) {
  return `${BASE}${encodeURIComponent(path)}/`;
}

const INFO_CARDS = [
  { name: '日本介紹', emoji: '🗾', desc: '總體概覽', url: jpUrl('日本介紹') },
  { name: '交通', emoji: '🚅', desc: '移動指南', url: jpUrl('交通') },
  { name: '注意事項', emoji: '📋', desc: '旅行須知', url: jpUrl('注意事項') },
];

const REGION_CARDS = [
  { name: '北海道', emoji: '❄️', desc: '雪景溫泉', url: jpUrl('北海道') },
  { name: '青森', emoji: '🍎', desc: '弘前城', url: jpUrl('青森') },
  { name: '岩手', emoji: '🌊', desc: '淨土之濱', url: jpUrl('岩手') },
  { name: '宮城', emoji: '🦢', desc: '松島', url: jpUrl('宮城') },
  { name: '秋田', emoji: '🍶', desc: '角館', url: jpUrl('秋田') },
  { name: '山形', emoji: '🍒', desc: '藏王溫泉', url: jpUrl('山形') },
  { name: '福島', emoji: '🌸', desc: '磐梯山', url: jpUrl('福島') },
  { name: '東京', emoji: '🗼', desc: '都會繁華', url: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E6%9D%B1%E4%BA%AC/' },
  { name: '山梨', emoji: '🗻', desc: '富士山麓', url: jpUrl('山梨') },
  { name: '長野', emoji: '⛷️', desc: '白馬松本', url: jpUrl('長野') },
  { name: '靜岡', emoji: '🍵', desc: '富士周邊', url: jpUrl('靜岡') },
  { name: '愛知', emoji: '🏯', desc: '名古屋城', url: jpUrl('愛知') },
  { name: '岐阜', emoji: '🏘️', desc: '白川鄉', url: jpUrl('岐阜') },
  { name: '富山', emoji: '🏔️', desc: '立山黑部', url: jpUrl('富山') },
  { name: '石川', emoji: '🌺', desc: '兼六園', url: jpUrl('石川') },
  { name: '福井', emoji: '🦖', desc: '恐龍博物館', url: jpUrl('福井') },
  { name: '滋賀', emoji: '🏯', desc: '琵琶湖', url: jpUrl('滋賀') },
  { name: '京都', emoji: '⛩️', desc: '千年古都', url: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E4%BA%AC%E9%83%BD/' },
  { name: '大阪', emoji: '🍣', desc: '美食之都', url: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E5%A4%A7%E9%98%AA/' },
  { name: '兵庫', emoji: '🏰', desc: '神戶姬路', url: jpUrl('兵庫') },
  { name: '奈良', emoji: '🦌', desc: '鹿公園', url: jpUrl('奈良') },
  { name: '和歌山', emoji: '🍊', desc: '熊野古道', url: jpUrl('和歌山') },
  { name: '三重', emoji: '🦞', desc: '伊勢神宮', url: jpUrl('三重') },
  { name: '岡山', emoji: '🍑', desc: '後樂園', url: jpUrl('岡山') },
  { name: '廣島', emoji: '🕊️', desc: '和平紀念', url: jpUrl('廣島') },
  { name: '山口', emoji: '🌉', desc: '錦帶橋', url: jpUrl('山口') },
  { name: '德島', emoji: '💃', desc: '阿波舞', url: jpUrl('德島') },
  { name: '香川', emoji: '🍜', desc: '讚岐烏龍', url: jpUrl('香川') },
  { name: '愛媛', emoji: '🏯', desc: '道後溫泉', url: jpUrl('愛媛') },
  { name: '福岡', emoji: '🍜', desc: '博多拉麵', url: 'https://travel-guide-tw.github.io/%E6%97%A5%E6%9C%AC/%E7%A6%8F%E5%B2%A1/' },
  { name: '其他', emoji: '🗺️', desc: '更多地區', url: jpUrl('其他') },
];

export default function JapanGuideModal({ open, onClose }: JapanGuideModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const modalMotion = getModalMotion(prefersReducedMotion);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="japan-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
          className="fixed inset-0 z-modal flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal panel */}
          <motion.div
            key="japan-modal-panel"
            initial={modalMotion.initial}
            animate={modalMotion.animate}
            exit={modalMotion.exit}
            transition={modalMotion.transition}
            className="relative w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-[#0d0d14] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/8">
              {/* Sakura gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-rose-400 to-rose-500/0" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🇯🇵</span>
                  <div>
                    <h2 className="text-white font-black text-lg leading-tight tracking-tight">
                      日本完整攻略
                    </h2>
                    <p className="text-white/40 text-xs font-medium mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      travel-guide-tw · 34 個地區指南
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 flex items-center justify-center text-white/60 hover:text-white transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6 scrollbar-hide">
              {/* Info section */}
              <section>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                  基本資訊
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {INFO_CARDS.map((card, i) => (
                    <motion.a
                      key={card.name}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl bg-white/5 border border-white/8 hover:bg-rose-500/10 hover:border-rose-400/30 transition-all cursor-pointer"
                    >
                      <span className="text-xl">{card.emoji}</span>
                      <span className="text-white font-bold text-xs text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full flex-shrink-0">{card.name}</span>
                      <span className="text-white/35 text-[10px] text-center whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full flex-shrink-0">{card.desc}</span>
                    </motion.a>
                  ))}
                </div>
              </section>

              {/* Regions grid */}
              <section>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.15em] mb-3">
                  各都道府縣
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {REGION_CARDS.map((card, i) => (
                    <motion.a
                      key={card.name}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.12 + i * 0.025, type: 'spring', stiffness: 400, damping: 25 }}
                      className="group flex flex-col items-center gap-1 py-3 px-1.5 rounded-2xl bg-white/4 border border-white/6 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="text-lg leading-none">{card.emoji}</span>
                      <span className="text-white/90 font-bold text-[11px] text-center leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full flex-shrink-0">{card.name}</span>
                      <span className="text-white/30 text-[9px] text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full flex-shrink-0">{card.desc}</span>
                    </motion.a>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/8 flex items-center justify-between">
              <span className="text-white/25 text-[10px] font-medium">
                內容來源：travel-guide-tw.github.io
              </span>
              <a
                href={BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors"
              >
                <ExternalLink size={11} />
                查看全站
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
