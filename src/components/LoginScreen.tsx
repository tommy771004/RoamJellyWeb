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
      setClientAccessToken(result.token);
      onLogin(result.user_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 justify-center items-center p-6 flex flex-col h-screen w-screen"
      style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #ede9fe 50%, #cffafe 100%)' }}
    >
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div className="items-center mb-8 flex flex-col">
          <span style={{ fontSize: 48, marginBottom: 8 }}>✈️</span>
          <span className="text-2xl font-bold text-purple-700">果凍漫遊</span>
          <span className="text-sm text-purple-400 mt-1">RoamJelly</span>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6 shadow-lg flex flex-col"
          style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.6)' }}
        >
          {/* Mode tabs */}
          <div
            className="flex flex-row mb-6 rounded-2xl p-1"
            style={{ backgroundColor: '#f5f3ff' }}
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  paddingTop: 8, paddingBottom: 8,
                  borderRadius: 12,
                  backgroundColor: mode === m ? '#ffffff' : 'transparent',
                  boxShadow: mode === m ? '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)' : 'none',
                  alignItems: 'center',
                  outline: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                className="flex justify-center appearance-none"
              >
                <span
                  style={{
                    fontWeight: '600',
                    color: mode === m ? '#7c3aed' : '#9ca3af',
                    fontSize: 14,
                  }}
                >
                  {m === 'login' ? '登入' : '註冊'}
                </span>
              </button>
            ))}
          </div>

          {/* Username */}
          <div className="mb-4 flex flex-col">
            <span className="text-sm font-medium text-gray-600 mb-1">使用者名稱</span>
            <input
              style={{
                backgroundColor: '#f9fafb',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingInline: 16,
                paddingBlock: 12,
                color: '#1f2937',
                fontSize: 15,
              }}
              className="outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
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
              <span className="text-sm font-medium text-gray-600 mb-1">暱稱（選填）</span>
              <input
                style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  paddingInline: 16,
                  paddingBlock: 12,
                  color: '#1f2937',
                  fontSize: 15,
                }}
                className="outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="顯示給其他成員的名稱"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          {/* Password */}
          <div className="mb-4 flex flex-col">
            <span className="text-sm font-medium text-gray-600 mb-1">密碼</span>
            <input
              type="password"
              style={{
                backgroundColor: '#f9fafb',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderRadius: 12,
                paddingInline: 16,
                paddingBlock: 12,
                color: '#1f2937',
                fontSize: 15,
              }}
              className="outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              placeholder="至少 8 個字元"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Confirm password – register only */}
          {mode === 'register' && (
            <div className="mb-4 flex flex-col">
              <span className="text-sm font-medium text-gray-600 mb-1">確認密碼</span>
              <input
                type="password"
                style={{
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 12,
                  paddingInline: 16,
                  paddingBlock: 12,
                  color: '#1f2937',
                  fontSize: 15,
                }}
                className="outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="再次輸入密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {/* Error message */}
          {error ? (
            <div
              className="mb-4 px-4 py-3 rounded-xl flex"
              style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}
            >
              <span style={{ color: '#dc2626', fontSize: 14 }}>{error}</span>
            </div>
          ) : null}

          {/* Submit */}
          <button
            onClick={() => void handleSubmit()}
            disabled={loading}
            style={{
              paddingTop: 14, paddingBottom: 14,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: loading ? '#c4b5fd' : '#7c3aed',
            }}
            className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-purple-600 transition-colors"
          >
            {loading ? (
              <span style={{ color: 'white' }}>處理中...</span>
            ) : (
              <span style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
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
                borderRadius: 16,
                alignItems: 'center',
                backgroundColor: 'transparent',
              }}
              className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-black/5 transition-colors"
            >
              <span style={{ color: '#4b5563', fontWeight: '600', fontSize: 15 }}>取消</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
