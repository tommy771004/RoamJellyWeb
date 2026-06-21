const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `<button
            type="button"
            aria-label={isLoggedIn ? '個人檔案' : '登入'}
            onClick={() => {
              if (!isLoggedIn) {
                setLoginPromptMode('default');
                setShowLogin(true);
              } else {
                setShowUserProfile(true);
              }
            }}
            className={\`flex items-center gap-3 group rounded-full border shadow-sm transition-colors pl-3 pr-1 py-1 \${isLoggedIn ? 'border-white/90 bg-[linear-gradient(135deg,rgba(254,242,248,0.95),rgba(240,249,255,0.88))] hover:bg-white/95' : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88),rgba(254,242,248,0.76))] hover:bg-white/95'}\`}
          >
            <span className={\`text-[13px] font-black tracking-wide hidden sm:block whitespace-nowrap pl-1 \${isLoggedIn ? 'text-pink-700' : 'text-slate-600'}\`}>
              {isLoggedIn ? \`\${userId} 您好\` : '未登入'}
            </span>
            <div className={\`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 shadow-inner \${isLoggedIn ? 'bg-[linear-gradient(135deg,#fce7f3,#e0f2fe)] text-pink-500' : 'bg-[linear-gradient(135deg,#f8fafc,#fce7f3)] text-sky-500'}\`}>
              {isLoggedIn ? <UserRound size={17} strokeWidth={2.4} /> : <SparklesIcon size={16} strokeWidth={2.4} />}
            </div>
          </button>`;

const replacement = `<div className="relative z-30">
            <button
              type="button"
              aria-label={isLoggedIn ? '帳號選單' : '登入選單'}
              onClick={() => setShowUserMenu(v => !v)}
              className={\`flex items-center gap-3 group rounded-full border shadow-sm transition-colors pl-3 pr-1 py-1 \${isLoggedIn ? 'border-white/90 bg-[linear-gradient(135deg,rgba(254,242,248,0.95),rgba(240,249,255,0.88))] hover:bg-white/95' : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88),rgba(254,242,248,0.76))] hover:bg-white/95'}\`}
            >
              <span className={\`text-[13px] font-black tracking-wide hidden sm:block whitespace-nowrap pl-1 \${isLoggedIn ? 'text-pink-700' : 'text-slate-600'}\`}>
                {isLoggedIn ? \`\${userId} 您好\` : '未登入'}
              </span>
              <div className={\`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 shadow-inner \${isLoggedIn ? 'bg-[linear-gradient(135deg,#fce7f3,#e0f2fe)] text-pink-500' : 'bg-[linear-gradient(135deg,#f8fafc,#fce7f3)] text-sky-500'}\`}>
                {isLoggedIn ? <UserRound size={17} strokeWidth={2.4} /> : <SparklesIcon size={16} strokeWidth={2.4} />}
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col py-1">
                {!isLoggedIn ? (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setLoginPromptMode('default');
                      setShowLogin(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left w-full"
                  >
                    <UserRound size={16} className="text-slate-400" />
                    <span className="text-[14px] font-bold text-slate-700">登入帳號</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowUserProfile(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left w-full"
                    >
                      <SparklesIcon size={16} className="text-orange-400" />
                      <span className="text-[14px] font-bold text-slate-700">AI 偏好設定</span>
                    </button>
                    <div className="mx-3 h-px bg-slate-100" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 transition-colors text-left w-full group"
                    >
                      <LogOut size={16} className="text-rose-400 group-hover:text-rose-500 transition-colors" />
                      <span className="text-[13px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors">登出帳號</span>
                    </button>
                  </>
                )}
              </div>
            )}
            {showUserMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
            )}
          </div>`;

if(code.indexOf(target) === -1) {
  console.log("Not found target. Looking for parts:");
  console.log(code.indexOf(`aria-label={isLoggedIn ? '個人檔案' : '登入'}`));
} else {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Success");
}
