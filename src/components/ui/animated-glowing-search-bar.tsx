import React from 'react';
import { Send } from 'lucide-react';

interface AnimatedGlowingSearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSendClick: () => void;
  sendDisabled?: boolean;
  placeholder?: string;
  className?: string;
}

const SearchComponent = ({
  value,
  onChange,
  onKeyDown,
  onSendClick,
  sendDisabled = false,
  placeholder = "Search...",
  className = ""
}: AnimatedGlowingSearchBarProps) => {
  return (
    <div className={`relative flex items-center justify-center w-full ${className}`}>
      <div className="absolute z-[-1] w-full h-min-screen"></div>
      <div id="poda" className="relative flex items-center justify-center group w-full">
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[70px] max-w-full rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-60
                        before:bg-[conic-gradient(#f4f4f5,#d8b4fe_5%,#f4f4f5_38%,#f4f4f5_50%,#fbcfe8_60%,#f4f4f5_87%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]">
        </div>
        
        {/* Adjusted conic-gradient colors to be pastel/light instead of dark/midnight blue */}
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-full rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#e9d5ff,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#fbcfe8,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>
        
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-full rounded-xl blur-[3px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
                        before:bg-[conic-gradient(rgba(0,0,0,0),#fdf4ff,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#fbcfe8,rgba(0,0,0,0)_60%)] before:transition-all before:duration-2000
                        group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]">
        </div>
        
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[63px] max-w-full rounded-lg blur-[2px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
                        before:bg-[conic-gradient(rgba(255,255,255,0)_0%,#bae6fd,rgba(255,255,255,0)_8%,rgba(255,255,255,0)_50%,#fbcfe8,rgba(255,255,255,0)_58%)] before:brightness-140
                        before:transition-all before:duration-2000 group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]">
        </div>

        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[59px] max-w-full rounded-xl blur-[0.5px] 
                        before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-70
                        before:bg-[conic-gradient(#ffffff,#d8b4fe_5%,#ffffff_14%,#ffffff_50%,#fbcfe8_60%,#ffffff_64%)] before:brightness-130
                        before:transition-all before:duration-2000 group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]">
        </div>

        <div id="main" className="relative group w-full flex items-center bg-white/90 backdrop-blur-md rounded-[16px] shadow-sm border border-slate-200 focus-within:border-fuchsia-300 transition-all focus-within:ring-2 focus-within:ring-fuchsia-400/20">
          <div id="search-icon" className="pl-4 pr-1 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="20" fill="none" className="feather feather-search">
              <circle stroke="currentColor" r="8" cy="11" cx="11"></circle>
              <line stroke="currentColor" y2="16.65" y1="22" x2="16.65" x1="22"></line>
            </svg>
          </div>
          
          <input 
            placeholder={placeholder} 
            type="text" 
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            inputMode="text"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent border-none h-[48px] rounded-lg text-slate-700 px-2 text-[13.5px] font-semibold focus:outline-none placeholder:text-slate-400 placeholder:font-normal focus:ring-0" 
          />
          
          <div className="pr-2 flex items-center justify-center">
            <button
               onClick={onSendClick}
               disabled={sendDisabled}
               aria-label="送出"
               className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-500 to-sky-500 text-white transition-all active:scale-[0.94] disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 z-10 shadow-sm"
             >
               <Send size={15} className="ml-0.5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SearchComponent };
