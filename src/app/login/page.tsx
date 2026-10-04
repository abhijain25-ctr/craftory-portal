'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, X, AlertCircle, HelpCircle, Check, Info } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/portal');
        }
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredential = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setShowDemoCredentials(false);
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between font-sans selection:bg-pink-500 selection:text-white overflow-hidden bg-[#0a0d24]"
      style={{
        backgroundImage: "url('/synthwave-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 1. TOP SYNTHWAVE HEADER */}
      <header className="w-full px-6 sm:px-12 py-6 flex items-center justify-end z-20">
        {/* RIGHT LOGIN OUTLINE PILL */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const el = document.getElementById('login-email-input');
              if (el) el.focus();
            }}
            className="px-5 py-1 rounded-full border border-white/80 text-white text-xs font-semibold tracking-wide hover:bg-white/15 hover:border-white transition-all shadow-[0_0_12px_rgba(255,255,255,0.2)] flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>Login</span>
          </button>
        </div>
      </header>

      {/* 2. CENTER GLASSMORPHISM LOGIN MODAL (Matching 1st Screenshot) */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="relative w-full max-w-[390px] rounded-[28px] p-7 sm:p-8 bg-white/25 backdrop-blur-2xl border border-white/40 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200">
          {/* TOP RIGHT CLOSE BUTTON */}
          <button
            onClick={() => router.push('/')}
            title="Close"
            className="absolute top-3.5 right-3.5 w-6 h-6 rounded-md bg-[#0a1236]/90 hover:bg-[#0a1236] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* CARD TITLE */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-6 tracking-tight">
            Login
          </h1>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-500/80 backdrop-blur-sm border border-rose-300 text-white text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* EMAIL UNDERLINE INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1 focus-within:border-slate-950 transition-colors">
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-800/80 focus:outline-none pr-8"
                />
                <Mail className="w-4 h-4 text-slate-800 shrink-0 absolute right-1 pointer-events-none" />
              </div>
            </div>

            {/* PASSWORD UNDERLINE INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-1 focus-within:border-slate-950 transition-colors">
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-800/80 focus:outline-none pr-8"
                />
                <Lock className="w-4 h-4 text-slate-800 shrink-0 absolute right-1 pointer-events-none" />
              </div>
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD ROW */}
            <div className="flex items-center justify-between text-[11px] text-slate-800 font-medium pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-[#0d163d] focus:ring-0 focus:outline-none accent-[#0d163d]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="hover:underline transition text-slate-800"
              >
                Forgot Password?
              </button>
            </div>

            {/* DEEP NAVY PILL LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#0d163d] via-[#101c4e] to-[#0a1236] hover:from-[#111e52] hover:to-[#0f1a48] text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-950/40 hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.99] mt-3"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* REGISTER FOOTER ROW */}
            <div className="text-center text-[11px] text-slate-800/90 font-medium pt-1">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="font-bold underline hover:text-black transition"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 3. SUBTLE FOOTER HELPER (Demo credentials toggle) */}
      <footer className="w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-white/70 z-20 gap-2">
        <div className="text-[11px] font-medium drop-shadow-sm">
          Craftory Studio Confidential Communication Portal
        </div>

        <button
          onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          className="text-[11px] font-semibold text-white/80 hover:text-white px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 transition flex items-center gap-1.5 shadow-sm"
        >
          <Info className="w-3 h-3 text-pink-400" />
          <span>Demo Credentials Helper</span>
        </button>
      </footer>

      {/* DEMO CREDENTIALS QUICK-SELECTION POPUP */}
      {showDemoCredentials && (
        <div className="fixed bottom-14 right-4 sm:right-12 z-50 bg-[#0d163d]/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-xs text-white shadow-2xl max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between font-bold mb-2 pb-2 border-b border-white/10 text-pink-300">
            <span>Select Demo Account</span>
            <button onClick={() => setShowDemoCredentials(false)} className="text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => fillCredential('admin@craftory.studio', 'Admin@1234')}
              className="w-full text-left p-2 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold">Admin</div>
                <div className="text-[10px] text-white/60 font-mono">admin@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
            <button
              onClick={() => fillCredential('client1@craftory.studio', 'Client@1234')}
              className="w-full text-left p-2 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold">Client 1 (Apollo)</div>
                <div className="text-[10px] text-white/60 font-mono">client1@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
            <button
              onClick={() => fillCredential('employee1@craftory.studio', 'Employee@1234')}
              className="w-full text-left p-2 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold">Employee 1 (Specialist)</div>
                <div className="text-[10px] text-white/60 font-mono">employee1@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1742] text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-1">Forgot Password Assistance</h3>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              In accordance with confidential security policies, credentials can only be reset by your Craftory Studio system administrator.
            </p>
            <div className="bg-white/10 p-3 rounded-xl text-xs text-white font-mono border border-white/15 mb-4">
              Admin: admin@craftory.studio
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* REGISTER INFO MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1742] text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-white/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-white mb-1">Confidential Portal Access</h3>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              Public self-registration is disabled for privacy protection. Client and Employee accounts are provisioned directly by Craftory Studio Administrators.
            </p>
            <div className="bg-white/10 p-3 rounded-xl text-xs text-white/80 border border-white/15 mb-4">
              Please contact your Project Manager or Administrator to request access credentials.
            </div>

            <button
              onClick={() => setShowRegisterModal(false)}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
