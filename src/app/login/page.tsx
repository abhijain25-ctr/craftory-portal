'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Database, HelpCircle, X } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="w-full max-w-md">
        {/* BRAND LOGO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#088395] to-[#0d9488] shadow-lg shadow-teal-600/20 text-white mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            CRAFTORY <span className="text-[#088395]">STUDIO</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
            Confidential Communication Portal
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.06)] border border-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your authorized credentials to access your project streams.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#088395] focus:border-transparent transition bg-slate-50/50 text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Security Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-[#088395] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#088395] focus:border-transparent transition bg-slate-50/50 text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#088395] hover:bg-[#066d7c] text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In Securely'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* FORGOT PASSWORD IN-APP MODAL */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
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
                For security and privacy compliance in the Confidential Communication Portal, passwords can only be reset by your authorized Craftory Studio administrator.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 font-mono border border-slate-200 mb-4">
                Contact: admin@craftory.studio
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

        {/* FOOTER NOTICE */}
        <div className="text-center mt-6 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Connected to persistent MySQL 8.0</span>
        </div>
      </div>
    </div>
  );
}
