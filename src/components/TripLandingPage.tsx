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
      className="flex-1 justify-center items-center p-6 flex flex-col h-screen w-screen"
      style={{ background: 'linear-gradient(135deg, #fce7f3 0%, #ede9fe 50%, #cffafe 100%)' }}
    >
      {fetching ? (
        <div className="text-[#7c3aed] text-lg font-medium">載入中...</div>
      ) : notFound || fetchError ? (
        <div className="items-center flex flex-col">
          <span style={{ fontSize: 56, marginBottom: 16 }}>{notFound ? '🤔' : '⚠️'}</span>
          <span className="text-xl font-bold text-gray-700 mb-2">
            {notFound ? '找不到這個旅程' : '載入失敗'}
          </span>
          <span className="text-gray-500 text-center mb-6">
            {notFound ? '邀請連結可能已失效或旅程不存在' : fetchError}
          </span>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 32,
              paddingRight: 32,
              borderRadius: 16,
              backgroundColor: '#7c3aed',
            }}
            className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:bg-[#6d28d9] transition-colors"
          >
            <span style={{ color: 'white', fontWeight: '700' }}>返回首頁</span>
          </button>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div
            className="rounded-3xl p-6 shadow-lg items-center flex flex-col"
            style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.6)' }}
          >
            <span style={{ fontSize: 48, marginBottom: 12 }}>✈️</span>
            <span className="text-gray-500 mb-3" style={{ fontSize: 15 }}>
              你被邀請加入旅程
            </span>

            {tripInfo && (
              <>
                <span
                  className="font-bold text-purple-700 mb-2 text-center flex"
                  style={{ fontSize: 22 }}
                >
                  {tripInfo.name}
                </span>
                <span className="text-gray-500 mb-1">📍 {tripInfo.destination}</span>
                <span className="text-gray-400 mb-6">{tripInfo.days} 天行程</span>
              </>
            )}

            {joinError ? (
              <div
                className="mb-4 px-4 py-3 rounded-xl w-full flex"
                style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}
              >
                <span style={{ color: '#dc2626', fontSize: 14, textAlign: 'center' }}>{joinError}</span>
              </div>
            ) : null}

            <button
              onClick={() => void handleJoin()}
              disabled={joining}
              style={{
                width: '100%',
                paddingTop: 14,
                paddingBottom: 14,
                borderRadius: 16,
                alignItems: 'center',
                backgroundColor: joining ? '#c4b5fd' : '#7c3aed',
              }}
              className="flex justify-center border-none appearance-none cursor-pointer outline-none hover:-translate-y-0.5 transition-transform"
            >
              {joining ? (
                <span style={{ color: 'white' }}>處理中...</span>
              ) : (
                <span style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>加入旅程</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
