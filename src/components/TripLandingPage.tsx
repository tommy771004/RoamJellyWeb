import { useState, useEffect } from 'react';
import { fetchTripPreview, joinTrip } from '../lib/workflowApi';

interface TripPreview {
  trip_id: string;
  name: string;
  destination: string;
  days: number;
}

interface Props {
  tripId: string;
  onJoined: () => void;
}

export default function TripLandingPage({ tripId, onJoined }: Props) {
  const [tripInfo, setTripInfo] = useState<TripPreview | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchTripPreview(tripId);
        setTripInfo(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
          setNotFound(true);
        } else {
          setFetchError('無法載入旅程資訊，請稍後再試');
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [tripId]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    try {
      await joinTrip(tripId);
      onJoined();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '加入旅程失敗，請再試一次');
      setJoining(false);
    }
  };

  return (
    <div
      className="flex-1 justify-center items-center p-6 flex flex-col h-[100dvh] w-screen bg-[#f8fafc] relative overflow-hidden"
    >
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-fuchsia-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-cyan-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[10%] w-[80vw] h-[80vw] rounded-full bg-purple-300/20 blur-[120px] pointer-events-none" />

      {fetching ? (
        <div className="text-fuchsia-600 text-lg font-medium relative z-10">載入中...</div>
      ) : notFound || fetchError ? (
        <div className="items-center flex flex-col relative z-10">
          <span style={{ fontSize: 56, marginBottom: 16 }}>{notFound ? '🤔' : '⚠️'}</span>
          <span className="text-xl font-bold text-slate-700 mb-2">
            {notFound ? '找不到這個旅程' : '載入失敗'}
          </span>
          <span className="text-slate-500 text-center mb-6">
            {notFound ? '邀請連結可能已失效或旅程不存在' : fetchError}
          </span>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-8 py-3 rounded-2xl bg-[#d946ef] flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-[#c026d3] transition-colors"
          >
            <span className="text-white font-bold">返回首頁</span>
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 360 }} className="relative z-10">
          <div
            className="rounded-[32px] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.08)] ring-1 ring-white/50 items-center flex flex-col relative overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.6)' }}
          >
            <span style={{ fontSize: 48, marginBottom: 16 }}>✈️</span>
            <span className="text-slate-500 mb-2 font-bold tracking-widest text-[13px] uppercase">
              你被邀請加入旅程
            </span>

            {tripInfo && (
              <>
                <span
                  className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 mb-3 text-center flex tracking-tight"
                  style={{ fontSize: 26 }}
                >
                  {tripInfo.name}
                </span>
                <div className="flex flex-row items-center gap-x-2 mb-6 bg-white/50 border border-white/60 shadow-inner px-4 py-1.5 rounded-full">
                  <span className="text-slate-600 font-bold text-sm">📍 {tripInfo.destination}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600 font-bold text-sm">{tripInfo.days} 天行程</span>
                </div>
              </>
            )}

            {joinError ? (
              <div
                className="mb-4 px-4 py-3 rounded-xl w-full flex items-center bg-rose-50/80 border border-rose-200"
              >
                <span className="text-rose-600 text-[13px] font-bold w-full text-center">{joinError}</span>
              </div>
            ) : null}

            <button
              onClick={() => void handleJoin()}
              disabled={joining}
              style={{
                width: '100%',
                paddingTop: 16,
                paddingBottom: 16,
                borderRadius: 24,
                alignItems: 'center',
              }}
              className={`flex justify-center border-none appearance-none cursor-pointer outline-none transition-all active:scale-95 shadow-[0_8px_16px_rgb(217,70,239,0.25)] ${joining ? 'bg-fuchsia-300 shadow-none' : 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:opacity-90'}`}
            >
              {joining ? (
                <span style={{ color: 'white', fontWeight: '800' }}>處理中...</span>
              ) : (
                <span style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: '0.05em' }}>加入旅程</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
