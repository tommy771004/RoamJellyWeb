import React, { useState, useEffect } from "react";
import { ListTodo, CheckCircle2, Copy, FileText, ArrowRight } from "lucide-react";
import GlassCard from "./GlassCard";
import { initAuth, googleSignIn, logout, getAccessToken } from "../lib/googleAuth";
import type { User } from "firebase/auth";
import { useAppStore } from "../store/useAppStore";

export default function GoogleFormsCard({ tripId }: { tripId?: string }) {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formLinks, setFormLinks] = useState<{ id: string; url: string; title: string }[]>([]);
  const { showToast } = useAppStore();

  useEffect(() => {
    // Load existing forms for this trip from local storage
    if (tripId) {
      const saved = localStorage.getItem(`roamjelly_forms_${tripId}`);
      if (saved) {
        try {
          setFormLinks(JSON.parse(saved));
        } catch { }
      }
    }

    const unsubscribe = initAuth(
      (u, token) => {
        setUser(u);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );

    return () => unsubscribe();
  }, [tripId]);

  const saveFormLink = (form: { id: string; url: string; title: string }) => {
    const updated = [form, ...formLinks];
    setFormLinks(updated);
    if (tripId) {
      localStorage.setItem(`roamjelly_forms_${tripId}`, JSON.stringify(updated));
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
      showToast("Google 登入失敗", "warning");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCreateForm = async () => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    // Remove confirm to avoid iframe blocking
    setIsCreating(true);
    try {
      // 1. Create a new form
      const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          info: {
            title: "旅伴意向調查",
            documentTitle: `RoamJelly 旅遊問卷 - ${new Date().toLocaleDateString()}`
          }
        })
      });

      if (!createRes.ok) {
        throw new Error("Failed to create form");
      }

      const form = await createRes.json();
      const formId = form.formId;
      const responderUri = form.responderUri;

      // 2. Add some standard questions via batchUpdate
      const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [
            {
              createItem: {
                item: {
                  title: "您的姓名",
                  questionItem: {
                    question: { required: true, textQuestion: { paragraph: false } }
                  }
                },
                location: { index: 0 }
              }
            },
            {
              createItem: {
                item: {
                  title: "偏好的住宿類型？",
                  questionItem: {
                    question: {
                      required: false,
                      choiceQuestion: {
                        type: "RADIO",
                        options: [
                          { value: "飯店/旅館" },
                          { value: "民宿/Airbnb" },
                          { value: "青年旅館" },
                          { value: "都可以" }
                        ]
                      }
                    }
                  }
                },
                location: { index: 1 }
              }
            },
            {
              createItem: {
                item: {
                  title: "有任何飲食禁忌嗎？",
                  questionItem: {
                    question: { required: false, textQuestion: { paragraph: true } }
                  }
                },
                location: { index: 2 }
              }
            }
          ]
        })
      });

      // Ignore batch update errors, at least the form is created
      saveFormLink({ id: formId, url: responderUri, title: "旅伴意向調查" });
      showToast("出遊問卷建立成功！請分享問卷給旅伴填寫。", "success");
    } catch (err) {
      console.error(err);
      showToast("建立問卷失敗，請檢查權限設定", "warning");
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("已複製問卷連結！", "success");
  };

  return (
    <GlassCard className="!p-4 sm:!p-6 flex flex-col relative overflow-hidden transition-all duration-200 glass-panel shadow-md border-white/80">
      <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-violet-200/35 blur-[36px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shadow-sm border border-white">
            <FileText size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">
              Google 表單問卷
            </h3>
            <p className="text-xs font-bold text-slate-500">
              快速蒐集旅伴的喜好與意見
            </p>
          </div>
        </div>

        {needsAuth ? (
          <div className="flex flex-col items-center justify-center py-6 bg-white/40 rounded-[20px] border border-slate-100">
            <p className="text-sm font-bold text-slate-600 mb-4 text-center">
              需要連結您的 Google 帳號才能自動建立表單
            </p>
            <button 
              className="gsi-material-button bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-md shadow-sm transition-all"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <div className="flex items-center gap-2">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span className="text-sm font-medium text-slate-600">使用 Google 帳號登入</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between bg-white/60 p-3 rounded-[16px] border border-white">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">已登入</span>
                <span className="text-xs font-black text-slate-800">{user?.displayName || '使用者'}</span>
              </div>
              <button onClick={logout} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline underline-offset-2">
                登出
              </button>
            </div>

            <button
              onClick={handleCreateForm}
              disabled={isCreating}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3 text-[14px] font-black shadow-sm transition-all duration-300 bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ListTodo size={16} />
                  一鍵產生「旅伴意向調查」表單
                </>
              )}
            </button>

            {formLinks.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  已建立的問卷
                </span>
                {formLinks.map((f, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-white/70 backdrop-blur border border-white p-3 rounded-[16px]">
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-black text-slate-800">{f.title}</span>
                      <a href={`https://docs.google.com/forms/d/${f.id}/edit`} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 font-bold flex items-center gap-1 hover:underline">
                        查看結果 <ArrowRight size={12} />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        readOnly 
                        value={f.url} 
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] text-slate-500 outline-none"
                      />
                      <button onClick={() => copyLink(f.url)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
