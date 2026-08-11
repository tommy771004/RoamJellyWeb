import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ExternalLink, MapPin } from 'lucide-react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from '../lib/useModalAccessibility';

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
  const { t } = useTranslation();
  const dialogRef = useModalAccessibility(onClose, open);
  const titleId = React.useId();
  const localizedInfoCards = React.useMemo(() => {
    return INFO_CARDS.map(card => ({
      ...card,
      name: t(`japan_modal.info_cards.${card.name}.name`, card.name),
      desc: t(`japan_modal.info_cards.${card.name}.desc`, card.desc),
    }));
  }, [t]);

  const localizedRegionCards = React.useMemo(() => {
    return REGION_CARDS.map(card => ({
      ...card,
      name: t(`japan_modal.region_cards.${card.name}.name`, card.name),
      desc: t(`japan_modal.region_cards.${card.name}.desc`, card.desc),
    }));
  }, [t]);

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
          className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal panel */}
          <motion.div
            ref={dialogRef}
            key="japan-modal-panel"
            initial={modalMotion.initial}
            animate={modalMotion.animate}
            exit={modalMotion.exit}
            transition={modalMotion.transition}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.98),rgba(17,20,36,0.96),rgba(12,14,24,0.96))] shadow-[0_28px_64px_rgba(0,0,0,0.32)] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-[32px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative flex-shrink-0 border-b border-white/8 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              {/* Sakura gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-rose-400 to-rose-500/0" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🇯🇵</span>
                  <div>
                    <h2 id={titleId} className="fluid-title font-black text-white">
                      {t('str_46bb94a7')}</h2>
                    <p className="fluid-kicker mt-0.5 flex items-center gap-1 font-medium uppercase text-white/60">
                      <MapPin size={10} />
                      {t('str_1346960e')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  data-autofocus
                  onClick={onClose}
                  className="flex size-11 items-center justify-center rounded-full bg-white/8 hover:bg-white/16 text-white/60 hover:text-white transition-all shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-5 scrollbar-hide sm:px-6">
              {/* Info section */}
              <section>
                <p className="fluid-kicker mb-3 font-black uppercase text-white/50">
                  {t('str_2992d015')}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {localizedInfoCards.map((card, i) => (
                    <motion.a
                      key={card.name}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group flex cursor-pointer flex-col items-center gap-1.5 rounded-[20px] border border-white/10 bg-white/[0.06] px-2 py-3 hover:border-rose-400/30 hover:bg-rose-500/10 transition-all"
                    >
                      <span className="text-xl">{card.emoji}</span>
                      <span className="fluid-caption w-full flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center font-black text-white">{card.name}</span>
                      <span className="fluid-kicker w-full flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center text-white/35">{card.desc}</span>
                    </motion.a>
                  ))}
                </div>
              </section>

              {/* Regions grid */}
              <section>
                <p className="fluid-kicker mb-3 font-black uppercase text-white/50">
                  {t('str_1bff217f')}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {localizedRegionCards.map((card, i) => (
                    <motion.a
                      key={card.name}
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.12 + i * 0.025, type: 'spring', stiffness: 400, damping: 25 }}
                      className="group flex cursor-pointer flex-col items-center gap-1 rounded-[18px] border border-white/8 bg-white/[0.05] px-1.5 py-3 transition-all hover:border-white/20 hover:bg-white/10 ios-press"
                    >
                      <span className="text-lg leading-none">{card.emoji}</span>
                      <span className="fluid-kicker mt-0.5 w-full flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap px-1 text-center font-black text-white/90">{card.name}</span>
                      <span className="text-[8.5px] leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full flex-shrink-0 text-white/50">{card.desc}</span>
                    </motion.a>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center justify-between border-t border-white/8 px-5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pt-4 sm:px-6 sm:py-4">
              <span className="fluid-kicker font-medium uppercase text-white/25">
                {t('str_4f9ecc34')}</span>
              <a
                href={BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="fluid-kicker flex items-center gap-1.5 font-black uppercase text-rose-400 transition-colors hover:text-rose-300"
              >
                <ExternalLink size={11} />
                {t('str_310388b7')}</a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
