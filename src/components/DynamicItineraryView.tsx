import React from 'react';
import { ArrowLeft, Clock, MapPin, Leaf, Flame } from 'lucide-react';
import GlassCard from './GlassCard';

export default function DynamicItineraryView({ 
  result, 
  onBack,
  onSave
}: { 
  result: any; 
  onBack: () => void;
  onSave?: (result: any) => void;
}) {
  const aiResponse = result?.fullResponse;
  
  // Extracting UI configurations or fallback
  const uiConfig = aiResponse?.ui_config || {};
  const gradient = uiConfig.bg_gradient || 'from-fuchsia-100 to-indigo-100';
  const isLargeFont = uiConfig.font_scale === 'large';
  const textScaleClass = isLargeFont ? 'text-lg' : 'text-base';
  const titleClass = isLargeFont ? 'text-5xl' : 'text-4xl';
  
  const summary = aiResponse?.summary || {};
  const itinerary = aiResponse?.itinerary || [];
  
  return (
    <div className={`flex-1 w-full h-full flex flex-col relative overflow-y-auto bg-gradient-to-br ${gradient} transition-colors duration-1000`}>
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <div className="relative z-10 px-6 pt-16 pb-32">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm text-slate-800 hover:bg-white/80 active:scale-[0.98] transition-all duration-200 mb-6"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className={`${titleClass} font-black text-slate-900 mb-2 drop-shadow-sm font-serif leading-tight tracking-tight`}>
          {summary.title || result?.title || '為您專屬規劃'}
        </h1>
        
        {/* Smart Tags */}
        {summary.smart_tags && summary.smart_tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-2 mb-6 scrollbar-hide">
            {summary.smart_tags.map((tag: string, i: number) => (
              <span key={i} className="px-4 py-1.5 rounded-full bg-white/60 border border-white/80 shadow-sm text-slate-700 font-medium text-sm backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-6 mt-4">
          {itinerary.map((dayData: any, i: number) => (
            <div key={i} className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl p-6 group hover:-translate-y-1 transition-transform cursor-pointer">
              <h3 className="text-xl font-bold text-slate-800 mb-6 bg-white/60 w-fit px-5 py-2 rounded-full shadow-sm text-center">
                第 {dayData.day} 天
              </h3>
              
              <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 flex flex-col gap-6">
                {(dayData.spots || []).map((spot: any, j: number) => (
                  <div key={j} className="relative pl-6 pb-2">
                    {/* Timeline Node */}
                    <div className="absolute left-[-21px] top-1.5 w-10 h-10 -ml-5 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-lg z-10">
                      {spot.emoji || '📍'}
                    </div>
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-bold text-slate-800 text-xl tracking-tight leading-snug`}>{spot.name}</h4>
                        <p className={`text-slate-600 font-medium mt-1 ${textScaleClass}`}>{spot.time}</p>
                      </div>
                      
                      {/* Intensity Indicator */}
                      {spot.intensity && (
                        <div className="flex-shrink-0">
                          {spot.intensity === 'chill' && <span title="輕鬆" className="text-emerald-500 bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center"><Leaf size={16}/></span>}
                          {spot.intensity === 'hardcore' && <span title="耗費體力" className="text-rose-500 bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center"><Flame size={16}/></span>}
                        </div>
                      )}
                    </div>
                    
                    {/* AI Note */}
                    {spot.ai_note && (
                      <div className="bg-white/50 backdrop-blur-sm text-sm text-slate-700 p-3 rounded-2xl border border-white/40 mt-3 shadow-inner">
                        <span className="font-semibold opacity-60 mr-1">TIPS /</span> {spot.ai_note}
                      </div>
                    )}

                    {/* Transport to next */}
                    {spot.transport_to_next && j !== dayData.spots.length - 1 && (
                      <div className="mt-4 mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="text-[14px]">🚶🏻‍♂️</span> {spot.transport_to_next}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {onSave && (
          <button 
            onClick={() => onSave(result)}
            className="w-full mt-10 py-5 rounded-full bg-slate-900 border border-white/20 text-white font-bold text-lg shadow-xl hover:bg-slate-800 transition-transform duration-200 active:scale-[0.98] flex items-center justify-center gap-2">
            <span>💾 儲存並開始編輯手帳</span>
          </button>
        )}
      </div>
    </div>
  );
}
