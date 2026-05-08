import React from 'react';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import GlassCard from './GlassCard';

export default function DynamicItineraryView({ 
  result, 
  onBack 
}: { 
  result: any; 
  onBack: () => void 
}) {
  const gradient = result?.ui_state?.theme_gradient || 'from-fuchsia-100 to-indigo-100';
  
  return (
    <div className={`flex-1 w-full h-full flex flex-col relative overflow-y-auto bg-gradient-to-br ${gradient} transition-colors duration-1000`}>
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-30" style={{ 
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <div className="relative z-10 px-6 pt-16 pb-32">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm text-slate-800 hover:bg-white/80 transition-colors mb-6"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-4xl font-black text-slate-900 mb-2 drop-shadow-sm font-serif">
          {result?.title || '為您專屬規劃'}
        </h1>
        <p className="text-slate-700 font-medium mb-8 flex items-center gap-2">
          <Clock size={16} /> 5 天 4 夜
        </p>

        <div className="flex flex-col gap-6">
          {result?.days?.map((day: any, i: number) => (
            <GlassCard key={i} className="!p-6 group hover:-translate-y-1 transition-transform cursor-pointer">
              <h3 className="text-xl font-bold text-slate-800 mb-4 bg-white/60 w-fit px-4 py-1.5 rounded-full shadow-sm text-center">
                第 {day.day} 天
              </h3>
              <div className="pl-2 border-l-2 border-slate-300 dark:border-slate-700 flex flex-col gap-4 ml-2">
                {day.activities?.map((act: any, j: number) => (
                  <div key={j} className="relative pl-6">
                    <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-slate-500" />
                    <h4 className="font-bold text-slate-800 text-lg">{act.name}</h4>
                    <p className="text-slate-600 text-sm mt-1">{act.description}</p>
                    {act.location && (
                      <p className="text-slate-500 text-xs mt-2 flex items-center gap-1 font-medium bg-white/50 w-fit px-2 py-1 rounded-md">
                        <MapPin size={12} /> {act.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
        
        {/* Placeholder save button below */}
        <button className="w-full mt-10 py-5 rounded-[24px] bg-slate-900 text-white font-bold text-[16px] shadow-xl hover:bg-slate-800 transition-colors active:scale-95 flex items-center justify-center gap-2">
          <span>儲存這份手帳</span>
        </button>
      </div>
    </div>
  );
}
