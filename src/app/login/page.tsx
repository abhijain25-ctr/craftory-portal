'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, X, AlertCircle, HelpCircle, Info } from 'lucide-react';

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
      className="min-h-screen w-full relative flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white overflow-hidden bg-[#e0f2f1]"
      style={{
        backgroundImage: "url('/login-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* 1. TOP HEADER (Right Login indicator) */}
      <header className="w-full px-6 sm:px-12 py-6 flex items-center justify-end z-20">
        <button
          onClick={() => {
            const el = document.getElementById('login-email-input');
            if (el) el.focus();
          }}
          className="px-5 py-1 rounded-full border border-teal-700/30 text-teal-950 text-xs font-semibold tracking-wide bg-white/40 hover:bg-white/70 backdrop-blur-md transition-all shadow-sm flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#088395]"></span>
          <span>Login</span>
        </button>
      </header>

      {/* 2. CENTER FROSTED GLASS LOGIN CARD */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="relative w-full max-w-[390px] rounded-[28px] p-7 sm:p-8 bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(8,131,149,0.22)] animate-in fade-in zoom-in-95 duration-200">
          {/* TOP RIGHT CLOSE BUTTON */}
          <button
            onClick={() => router.push('/')}
            title="Close"
            className="absolute top-3.5 right-3.5 w-6 h-6 rounded-md bg-[#0A4D68] hover:bg-[#088395] text-white flex items-center justify-center transition-transform hover:scale-105 shadow-sm"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          {/* CARD TITLE */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-6 tracking-tight">
            Login
          </h1>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* EMAIL UNDERLINE INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 focus-within:border-[#088395] transition-colors">
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none pr-8"
                />
                <Mail className="w-4 h-4 text-[#088395] shrink-0 absolute right-1 pointer-events-none" />
              </div>
            </div>

            {/* PASSWORD UNDERLINE INPUT */}
            <div className="relative">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 focus-within:border-[#088395] transition-colors">
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none pr-8"
                />
                <Lock className="w-4 h-4 text-[#088395] shrink-0 absolute right-1 pointer-events-none" />
              </div>
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD ROW */}
            <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#088395] focus:ring-0 focus:outline-none accent-[#088395]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="hover:underline transition text-[#088395] font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            {/* TEAL / NAVY GRADIENT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#088395] via-[#0A4D68] to-[#088395] hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-lg shadow-teal-900/20 hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.99] mt-3"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            {/* REGISTER FOOTER ROW */}
            <div className="text-center text-[11px] text-slate-600 font-medium pt-1">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="font-bold text-[#088395] underline hover:text-[#066d7c] transition"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="w-full px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-700 z-20 gap-2">
        <div className="text-[11px] font-semibold drop-shadow-sm text-slate-800">
          Craftory Studio Confidential Communication Portal
        </div>

        <button
          onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          className="text-[11px] font-semibold text-teal-900 hover:text-teal-950 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-teal-200/80 transition flex items-center gap-1.5 shadow-sm"
        >
          <Info className="w-3 h-3 text-[#088395]" />
          <span>Demo Credentials Helper</span>
        </button>
      </footer>

      {/* DEMO CREDENTIALS QUICK-SELECTION POPUP */}
      {showDemoCredentials && (
        <div className="fixed bottom-14 right-4 sm:right-12 z-50 bg-white/95 backdrop-blur-xl border border-teal-200 rounded-2xl p-4 text-xs text-slate-800 shadow-2xl max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between font-bold mb-2 pb-2 border-b border-slate-100 text-[#088395]">
            <span>Select Demo Account</span>
            <button onClick={() => setShowDemoCredentials(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => fillCredential('admin@craftory.studio', 'Admin@1234')}
              className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/60 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-900">Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
            <button
              onClick={() => fillCredential('client1@craftory.studio', 'Client@1234')}
              className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/60 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-900">Client 1 (Apollo)</div>
                <div className="text-[10px] text-slate-500 font-mono">client1@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
            <button
              onClick={() => fillCredential('employee1@craftory.studio', 'Employee@1234')}
              className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/60 transition flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-slate-900">Employee 1 (Specialist)</div>
                <div className="text-[10px] text-slate-500 font-mono">employee1@craftory.studio</div>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-bold">Fill</span>
            </button>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#088395] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">Password Assistance</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              In accordance with confidential security policies, credentials can only be reset by your authorized Craftory Studio administrator.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 font-mono border border-slate-200 mb-4">
              Admin: admin@craftory.studio
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full bg-[#088395] hover:bg-[#066d7c] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* REGISTER INFO MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#088395] flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">Confidential Portal Access</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Public self-registration is disabled for privacy protection. Client and Employee accounts are provisioned directly by Craftory Studio Administrators.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 border border-slate-200 mb-4">
              Please contact your Project Manager or Administrator to request access credentials.
            </div>

            <button
              onClick={() => setShowRegisterModal(false)}
              className="w-full bg-[#088395] hover:bg-[#066d7c] text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
