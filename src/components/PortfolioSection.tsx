import { Sparkles, ExternalLink } from "lucide-react";

export default function PortfolioSection() {
  const portfolios = [
    {
      title: "蔬果價格查詢",
      url: "https://tw-veggieprice.vercel.app/",
      desc1: "即時掌握農產品交易行情。",
      desc2: "圖表化報價助您聰明採買。",
      icon: "🥬",
    },
    {
      title: "AI股票分析",
      url: "https://stock-analyze-ai-connect.vercel.app/",
      desc1: "AI 深度分析即時股市財報。",
      desc2: "洞察市場提供客觀投資參考。",
      icon: "📉",
    },
    {
      title: "台鐵/高鐵時刻",
      url: "https://taiwanrail.vercel.app/",
      desc1: "快速查詢雙鐵班次與誤點。",
      desc2: "極簡介面完美支援通勤規劃。",
      icon: "🚄",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-12 pb-8 flex flex-col items-center">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-700"></div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 pt-0.5">
          <Sparkles size={14} className="text-slate-400" />
          更多作品推薦
        </h3>
        <div className="h-px w-8 bg-slate-200 dark:bg-slate-700"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 w-full max-w-5xl">
        {portfolios.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col p-5 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-[28px] hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 hover:border-sky-300 transition-all duration-300 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/20 dark:bg-sky-900/20 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110"></div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-[18px] shadow-sm border border-slate-100 dark:border-slate-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-300">
                {item.icon}
              </div>
              <div className="w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-300 group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors">
                <ExternalLink size={14} strokeWidth={2.5} />
              </div>
            </div>
            
            <h4 className="text-[17px] font-black text-slate-800 dark:text-white mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 min-w-0 truncate">
              {item.title}
            </h4>
            
            <div className="flex flex-col gap-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <p className="line-clamp-1">{item.desc1}</p>
              <p className="line-clamp-1">{item.desc2}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
