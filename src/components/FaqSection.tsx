import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Sparkles, MessageCircleQuestion } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IOS_EASE } from '../lib/motionTokens';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: '什麼是 RoamJelly 果凍漫遊？',
    answer:
      'RoamJelly 是一款專為自由行與多人群組旅遊設計的 AI 智慧行程規劃平台。整合 AI 秒級行程生成、機票與飯店即時比價、團隊實時線上協作以及分帳結算工具，讓出國旅遊規劃變得輕鬆又簡單。',
    category: '平台介紹',
  },
  {
    id: 'faq-2',
    question: 'RoamJelly 是免費使用的嗎？',
    answer:
      '是的！RoamJelly 目前提供早鳥全功能免費體驗，無需綁定信用卡，即可使用 AI 自動生成行程、成員共同編輯、行事曆導出與多幣別記帳結算等完整功能。',
    category: '費用與方案',
  },
  {
    id: 'faq-3',
    question: '如何使用 AI 快速生成旅遊行程？',
    answer:
      '只需在首頁輸入您的目的地（例如東京、京都、首爾）、出遊天數與出發日期，AI 就會自動為您規劃順路的景點地圖、最佳交通路線與每日推薦行程，您還可以自由修改與換景點。',
    category: 'AI 規劃',
  },
  {
    id: 'faq-4',
    question: 'RoamJelly 如何處理多人分帳與多幣別結算？',
    answer:
      '在工具箱的「旅遊記帳」中，您可以隨時記錄機票、飯店與美食消費，系統支援日圓、韓元、美金等多國外幣自動換算，並提供一鍵簡化最佳還款方案，多人出遊結算輕鬆透明。',
    category: '記帳與分帳',
  },
  {
    id: 'faq-5',
    question: '我可以將行程導出到 Google 日曆或與朋友共享嗎？',
    answer:
      '可以！每趟行程都有專屬的公開或私密分享連結，支援多人實時線上共編，並提供一鍵導出 ICS 通用日曆檔（支援 Google Calendar、Apple Calendar 與 Outlook）。',
    category: '分享與同步',
  },
  {
    id: 'faq-6',
    question: '搜尋出來的機票與飯店價格準確嗎？',
    answer:
      'RoamJelly 串接全球主要航空公司與知名訂網（Trip.com, Skyscanner, Agoda, Booking.com），提供即時比價與優惠導流，確保您獲得實時準確的價格資訊與限定折扣。',
    category: '機票比價',
  },
];

export default function FaqSection() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const faqSchemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section
      id="faq"
      className="relative my-12 w-full max-w-4xl mx-auto px-4 sm:px-6"
      aria-label="常見問題"
    >
      {/* Schema.org FAQPage JSON-LD script for Search Engine Optimization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaData) }}
      />

      {/* Decorative Glow background */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-200/30 dark:bg-sky-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-8 relative z-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100/80 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-black uppercase tracking-wider">
          <Sparkles size={12} className="text-sky-500" />
          <span>常見問題 Q&A</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          常見旅遊規劃疑問與解答
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap overflow-x-auto max-w-full mx-auto text-center scrollbar-none py-0.5">
          了解 RoamJelly 如何幫助您輕鬆安排行程、多人分帳與預訂優惠機票
        </p>
      </div>

      {/* Accordion FAQ items */}
      <div className="space-y-3 relative z-10">
        {DEFAULT_FAQ_ITEMS.map((item, index) => {
          const isOpen = openId === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs backdrop-blur-md overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleFaq(item.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-2xl group"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 pr-2">
                  <div className="size-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
                    <MessageCircleQuestion size={18} />
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-0.5">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {item.question}
                    </h3>
                  </div>
                </div>
                <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: IOS_EASE }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 mt-1 pl-15">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
