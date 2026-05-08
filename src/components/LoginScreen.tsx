import { useState } from 'react';
import { loginUser, registerUser, setClientAccessToken } from '../lib/workflowApi';

interface Props {
  onLogin: (userId: string) => void;
  onCancel?: () => void;
}

type Mode = 'login' | 'register';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export default function LoginScreen({ onLogin, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    const trimmedUser = username.trim();

    if (!trimmedUser || !password) {
      setError('請輸入使用者名稱和密碼');
      return;
    }
    if (!USERNAME_RE.test(trimmedUser)) {
      setError('使用者名稱需為 3–30 個英數字或底線');
      return;
    }
    if (password.length < 8) {
      setError('密碼至少需要 8 個字元');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await loginUser(trimmedUser, password)
          : await registerUser(trimmedUser, password, displayName.trim() || trimmedUser);
          
      const token = result?.access_token || result?.token || 'dummy_token';
      const userId = result?.user?.id || result?.user_id || trimmedUser;
      
      setClientAccessToken(token);
      onLogin(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 p-6 flex flex-col min-h-[100dvh] w-screen jelly-bg dark:bg-gradient-to-br dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900 relative overflow-y-auto overflow-x-hidden transition-colors duration-500"
    >
      <div className="fixed top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-fuchsia-300/20 blur-[120px] pointer-events-none" />
      <div className="fixed top-[20%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-cyan-300/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[10%] w-[80vw] h-[80vw] rounded-full bg-purple-300/20 blur-[120px] pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center py-12 w-full max-w-[360px] mx-auto relative z-10">
        {/* Logo */}
        <div className="items-center mb-8 flex flex-col">
          <span style={{ fontSize: 48, marginBottom: 8 }}>✈️</span>
          <span className="text-2xl font-bold text-purple-700">果凍漫遊</span>
          <span className="text-sm text-purple-400 mt-1">RoamJelly</span>
        </div>

        {/* Card */}
        <div
          className="rounded-[32px] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] ring-1 ring-white/50 flex flex-col relative overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.6)' }}
        >
          {/* Mode tabs */}
          <div
            className="flex flex-row mb-8 rounded-full p-1.5 shadow-inner"
            style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  paddingTop: 10, paddingBottom: 10,
                  borderRadius: 9999,
                  backgroundColor: mode === m ? '#ffffff' : 'transparent',
                  boxShadow: mode === m ? '0 4px 12px rgba(0, 0, 0, 0.05), border 1px solid rgba(255,255,255,0.8)' : 'none',
                  alignItems: 'center',
                  outline: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                className="flex justify-center appearance-none"
              >
                <span
                  style={{
                    fontWeight: mode === m ? '800' : '600',
                    color: mode === m ? '#d946ef' : '#94a3b8',
                    fontSize: 14,
                    letterSpacing: '0.05em'
                  }}
                >
                  {m === 'login' ? '登入' : '註冊'}
                </span>
              </button>
            ))}
          </div>

          {/* Username */}
          <div className="mb-4 flex flex-col">
            <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">使用者名稱</span>
            <input
              style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                paddingInline: 20,
                paddingBlock: 14,
                color: '#1e293b',
                fontSize: 15,
                fontWeight: '700'
              }}
              className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
              placeholder="3–30 個英數字或底線"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {/* Display name – register only */}
          {mode === 'register' && (
            <div className="mb-4 flex flex-col">
              <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">暱稱（選填）</span>
              <input
                style={{
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 20,
                  paddingInline: 20,
                  paddingBlock: 14,
                  color: '#1e293b',
                  fontSize: 15,
                  fontWeight: '700'
                }}
                className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                placeholder="顯示給其他成員的名稱"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          {/* Password */}
          <div className="mb-4 flex flex-col">
            <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">密碼</span>
            <input
              type="password"
              style={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.9)',
                borderRadius: 20,
                paddingInline: 20,
                paddingBlock: 14,
                color: '#1e293b',
                fontSize: 15,
                fontWeight: '700'
              }}
              className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
              placeholder="至少 8 個字元"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Confirm password – register only */}
          {mode === 'register' && (
            <div className="mb-4 flex flex-col">
              <span className="text-[13px] font-black tracking-widest text-slate-500 mb-1.5 ml-1 uppercase">確認密碼</span>
              <input
                type="password"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 20,
                  paddingInline: 20,
                  paddingBlock: 14,
                  color: '#1e293b',
                  fontSize: 15,
                  fontWeight: '700'
                }}
                className="outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/50 transition-all shadow-sm"
                placeholder="再次輸入密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {/* Error message */}
          {error ? (
            <div
              className="mb-4 px-4 py-3 rounded-xl flex items-center bg-rose-50/80 border border-rose-200"
            >
              <span className="text-rose-600 text-[13px] font-bold">{error}</span>
            </div>
          ) : null}

          {/* Submit */}
          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className={`flex justify-center border-none appearance-none cursor-pointer outline-none transition-all active:scale-95 shadow-[0_8px_16px_rgb(217,70,239,0.25)] ${loading ? 'bg-fuchsia-300 shadow-none' : 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:opacity-90'}`}
            style={{
              paddingTop: 16, paddingBottom: 16,
              borderRadius: 24,
              alignItems: 'center',
              marginTop: 8
            }}
          >
            {loading ? (
              <span style={{ color: 'white', fontWeight: '800' }}>處理中...</span>
            ) : (
              <span style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: '0.05em' }}>
                {mode === 'login' ? '登入' : '建立帳號'}
              </span>
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                marginTop: 12,
                paddingTop: 14, paddingBottom: 14,
                borderRadius: 24,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-black/5 transition-all active:scale-95"
            >
              <span style={{ color: '#64748b', fontWeight: '800', fontSize: 14, letterSpacing: '0.05em' }}>取消</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
