'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Database } from 'lucide-react';

export default function RootIndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRedirect();
  }, []);

  const checkRedirect = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user.role === 'ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/portal');
        }
      } else {
        router.replace('/login');
      }
    } catch (err) {
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-4 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#088395] to-[#0d9488] shadow-lg shadow-teal-600/20 text-white mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          CRAFTORY <span className="text-[#088395]">STUDIO</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Confidential Communication Portal
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#088395] animate-ping"></span>
          <span>Redirecting to your authorized workspace...</span>
        </div>
      </div>
    </div>
  );
}
