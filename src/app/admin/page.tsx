'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Layers,
  Sliders,
  FileText,
  UserCheck,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Info,
  Database,
  Lock,
  X,
  MessageSquare,
  Send,
  Check,
  Ban,
  Eye,
} from 'lucide-react';

interface Flag {
  id: string;
  category: string;
  severity: string;
  matchedRule: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISMISSED';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  message: {
    id: string;
    content: string;
    status: string;
    createdAt: string;
    conversation: {
      project: {
        id: string;
        name: string;
        code: string;
      };
    };
    senderMembership: {
      alias: string;
      role: string;
      user?: {
        realName: string;
        email: string;
      };
    };
  };
}

export default function AdminConsolePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [adminTab, setAdminTab] = useState<'FLAGS' | 'CHATS' | 'PROJECTS' | 'RULES' | 'AUDIT'>('FLAGS');
  const [flags, setFlags] = useState<Flag[]>([]);
  const [flagFilter, setFlagFilter] = useState({ status: 'ALL', category: 'ALL' });
  const [projects, setProjects] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Live Project Chat State
  const [selectedChatProjectId, setSelectedChatProjectId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatConversation, setChatConversation] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  const [reviewNote, setReviewNote] = useState<{ [flagId: string]: string }>({});
  const [actionLoading, setActionLoading] = useState<{ [id: string]: boolean }>({});
  const [revokeModalTarget, setRevokeModalTarget] = useState<{
    id: string;
    userName: string;
    alias: string;
    projectName: string;
  } | null>(null);

  useEffect(() => {
    checkAdminSession();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'ADMIN') {
      fetchAdminData();
    }
  }, [currentUser]);

  // Set default chat project
  useEffect(() => {
    if (projects.length > 0 && !selectedChatProjectId) {
      setSelectedChatProjectId(projects[0].id);
    }
  }, [projects, selectedChatProjectId]);

  // Fetch chat messages when CHATS tab is open or project changes
  useEffect(() => {
    if (adminTab === 'CHATS' && selectedChatProjectId && projects.length > 0) {
      const proj = projects.find((p) => p.id === selectedChatProjectId);
      if (proj && proj.conversationId) {
        fetchChatMessages(proj.conversationId);
      }
    }
  }, [adminTab, selectedChatProjectId, projects]);

  // Periodic polling for chat messages when on CHATS tab
  useEffect(() => {
    if (adminTab === 'CHATS' && selectedChatProjectId && projects.length > 0) {
      const proj = projects.find((p) => p.id === selectedChatProjectId);
      if (proj && proj.conversationId) {
        const interval = setInterval(() => {
          fetchChatMessages(proj.conversationId, true);
        }, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [adminTab, selectedChatProjectId, projects]);

  // Periodic polling for flags
  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      const interval = setInterval(() => {
        fetchFlags();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser, flagFilter]);

  const checkAdminSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const fetchAdminData = () => {
    fetchFlags();
    fetchProjects();
    fetchRules();
    fetchAuditLogs();
    fetchUsers();
  };

  const fetchFlags = async () => {
    try {
      const query = new URLSearchParams(flagFilter as any).toString();
      const res = await fetch(`/api/admin/flags?${query}`);
      if (res.ok) {
        const data = await res.json();
        setFlags(data.flags);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChatMessages = async (convId: string, background = false) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setChatConversation(data.conversation);
        setChatMessages(data.messages);
        if (!background && chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }
    } catch (err) {
      console.error('Error fetching chat messages for admin:', err);
    }
  };

  const handleAdminSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending || !selectedChatProjectId) return;
    const proj = projects.find((p) => p.id === selectedChatProjectId);
    if (!proj || !proj.conversationId) return;

    setChatSending(true);
    const contentToSend = chatInput.trim();
    setChatInput('');

    try {
      const res = await fetch(`/api/conversations/${proj.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToSend,
          clientTempId: `adm_${Date.now()}`,
        }),
      });
      if (res.ok) {
        fetchChatMessages(proj.conversationId);
      }
    } catch (err) {
      console.error('Failed to send admin message:', err);
    } finally {
      setChatSending(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/admin/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminAction = async (flagId: string, action: 'APPROVE' | 'REJECT' | 'DISMISS') => {
    setActionLoading((prev) => ({ ...prev, [flagId]: true }));
    try {
      const res = await fetch(`/api/admin/flags/${flagId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNotes: reviewNote[flagId] || '',
        }),
      });
      if (res.ok) {
        fetchFlags();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [flagId]: false }));
    }
  };

  const handleToggleRuleAction = async (ruleId: string, currentAction: string) => {
    const newAction = currentAction === 'HOLD' ? 'FLAG' : 'HOLD';
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, action: newAction }),
      });
      if (res.ok) {
        fetchRules();
        fetchAuditLogs();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update rule');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmRevokeAccess = async () => {
    if (!revokeModalTarget) return;
    try {
      const res = await fetch(`/api/admin/memberships?id=${revokeModalTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRevokeModalTarget(null);
        fetchProjects();
        fetchAuditLogs();
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#088395] animate-ping"></span>
          <span className="font-semibold text-sm">Verifying administrator security clearance...</span>
        </div>
      </div>
    );
  }

  // Strict Role Guard: If not admin, block completely
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">Access Denied (403 Forbidden)</h1>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            You are authenticated as <strong className="text-slate-800">{currentUser?.email}</strong> with role <strong className="text-slate-800">[{currentUser?.role}]</strong>. Only Craftory Studio Administrators are permitted into this console.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/portal')}
              className="bg-[#088395] hover:bg-[#066d7c] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              Go to Client Portal
            </button>
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* 1. HEADER */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#088395] to-[#0d9488] flex items-center justify-center text-white font-black text-xl shadow-md shadow-teal-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                CRAFTORY <span className="text-[#088395]">STUDIO</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Administrator Oversight Console
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">{currentUser?.realName}</div>
              <div className="text-xs text-slate-500 flex items-center justify-end gap-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  {currentUser?.role}
                </span>
                <span className="text-slate-400">{currentUser?.email}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/portal')}
              className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-[#088395] border border-teal-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Open Client/Employee Chat Portal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Participant Chat Portal</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. ADMIN MAIN VIEW */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Governance & <span className="text-[#088395]">Moderation Console</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Manage project access, review policy flags, supervise live conversations, and maintain tamper-evident audit history.
              </p>
            </div>

            <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setAdminTab('FLAGS')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  adminTab === 'FLAGS' ? 'bg-white text-[#088395] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Review Queue ({flags.filter((f) => f.status === 'PENDING').length})
              </button>
              <button
                onClick={() => setAdminTab('CHATS')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  adminTab === 'CHATS' ? 'bg-white text-[#088395] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Live Project Chats
              </button>
              <button
                onClick={() => setAdminTab('PROJECTS')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  adminTab === 'PROJECTS' ? 'bg-white text-[#088395] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Projects & Identities
              </button>
              <button
                onClick={() => setAdminTab('RULES')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  adminTab === 'RULES' ? 'bg-white text-[#088395] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Policy Rules
              </button>
              <button
                onClick={() => setAdminTab('AUDIT')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  adminTab === 'AUDIT' ? 'bg-white text-[#088395] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit Log
              </button>
            </div>
          </div>

          {/* TAB: LIVE PROJECT CHATS (CONVERSATION INSPECTOR) */}
          {adminTab === 'CHATS' && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live Stream Supervisor
                  </span>
                  <span className="text-xs text-slate-500">
                    — Confidential chat inspection with real identities unmasked for administrators
                  </span>
                </div>
                <button
                  onClick={() => {
                    const proj = projects.find((p) => p.id === selectedChatProjectId);
                    if (proj?.conversationId) fetchChatMessages(proj.conversationId);
                  }}
                  className="text-xs font-semibold text-[#088395] hover:text-[#066d7c] flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Chat
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* PROJECT SELECTOR COLUMN */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Select Project Stream
                  </div>
                  {projects.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                      No active projects found.
                    </div>
                  ) : (
                    projects.map((proj) => {
                      const isSelected = proj.id === selectedChatProjectId;
                      const activeMembers = proj.memberships || [];
                      return (
                        <div
                          key={proj.id}
                          onClick={() => setSelectedChatProjectId(proj.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-teal-50/60 border-[#088395] shadow-sm ring-1 ring-[#088395]/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 font-mono">
                              {proj.code}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {activeMembers.length} Participants
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{proj.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* CONVERSATION STREAM COLUMN */}
                <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[560px]">
                  {selectedChatProjectId ? (
                    (() => {
                      const activeProj = projects.find((p) => p.id === selectedChatProjectId);
                      return (
                        <>
                          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-teal-100 text-[#088395] font-mono">
                                  {activeProj?.code}
                                </span>
                                <h2 className="text-base font-extrabold text-slate-900">
                                  {activeProj?.name}
                                </h2>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {chatConversation?.title || 'Confidential Project Stream'}
                              </div>
                            </div>

                            {/* PARTICIPANTS PILLS (With real identities revealed for admin) */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {activeProj?.memberships?.map((m: any) => (
                                <span
                                  key={m.id}
                                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1"
                                  title={`Real identity: ${m.user?.realName} (${m.user?.email})`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${m.role === 'CLIENT' ? 'bg-indigo-500' : 'bg-teal-500'}`}></span>
                                  <span className="font-bold">{m.alias}</span>
                                  <span className="text-[10px] text-slate-400">({m.user?.realName})</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* MANDATORY PRIVACY BANNER */}
                          <div className="bg-slate-100/70 border-b border-slate-200/60 px-4 py-2 text-[11px] text-slate-600 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Shield className="w-3.5 h-3.5 text-[#088395]" />
                              {chatConversation?.privacyNotice ||
                                'Craftory Studio administrators may review conversations for project management and compliance.'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              Admin Full Access
                            </span>
                          </div>

                          {/* MESSAGE LIST SCROLL CONTAINER */}
                          <div
                            ref={chatScrollRef}
                            className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[420px] bg-slate-50/30"
                          >
                            {chatMessages.length === 0 ? (
                              <div className="text-center py-16 text-slate-400">
                                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <div className="text-xs font-semibold text-slate-600">No messages in this stream yet.</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  You can post an administrative notice below.
                                </div>
                              </div>
                            ) : (
                              chatMessages.map((msg: any) => {
                                const isAdminSender = msg.senderRole === 'ADMIN' || msg.senderAlias === 'Craftory Administrator';
                                const isHeld = msg.status === 'HELD_FOR_REVIEW';
                                const isRejected = msg.status === 'REJECTED';

                                return (
                                  <div
                                    key={msg.id}
                                    className={`p-4 rounded-2xl border transition-all ${
                                      isHeld
                                        ? 'bg-amber-50/50 border-amber-200'
                                        : isRejected
                                        ? 'bg-rose-50/40 border-rose-200'
                                        : isAdminSender
                                        ? 'bg-teal-50/50 border-teal-200'
                                        : 'bg-white border-slate-200/80 shadow-2xs'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xs font-extrabold ${
                                          isAdminSender
                                            ? 'text-[#088395]'
                                            : msg.senderRole === 'CLIENT'
                                            ? 'text-indigo-600'
                                            : 'text-teal-700'
                                        }`}>
                                          {msg.senderAlias}
                                        </span>

                                        {/* ADMIN PRIVILEGE: Real identity badge */}
                                        {msg.senderRealName && (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                            <Eye className="w-2.5 h-2.5 text-slate-400" />
                                            <span>Real: {msg.senderRealName}</span>
                                            {msg.senderEmail && <span className="text-slate-400">({msg.senderEmail})</span>}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* STATUS BADGES */}
                                        {msg.status === 'DELIVERED' && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                            <Check className="w-2.5 h-2.5" /> Delivered
                                          </span>
                                        )}
                                        {isHeld && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                            <AlertTriangle className="w-2.5 h-2.5" /> Held for Review
                                          </span>
                                        )}
                                        {isRejected && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                            <Ban className="w-2.5 h-2.5" /> Rejected
                                          </span>
                                        )}
                                        <span className="text-[11px] text-slate-400">
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>

                                    {/* MESSAGE CONTENT */}
                                    <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                      {msg.content}
                                    </p>

                                    {/* REJECTION REASON (IF REJECTED) */}
                                    {isRejected && msg.rejectionReason && (
                                      <div className="mt-2 text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded-xl border border-rose-100">
                                        Rejection note: {msg.rejectionReason}
                                      </div>
                                    )}

                                    {/* INLINE ADMIN MODERATION SHORTCUT (IF HELD) */}
                                    {isHeld && (
                                      <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                                        <span className="text-amber-700 text-[11px] font-medium">
                                          Pre-delivery moderation held this message.
                                        </span>
                                        <button
                                          onClick={() => setAdminTab('FLAGS')}
                                          className="text-[11px] font-bold text-[#088395] hover:underline flex items-center gap-1"
                                        >
                                          Open in Review Queue <ExternalLink className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* ADMIN MESSAGE COMPOSER */}
                          <form
                            onSubmit={handleAdminSendMessage}
                            className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Post official administrative notice or message to this project stream..."
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#088395] focus:border-transparent transition bg-slate-50/50"
                              disabled={chatSending}
                            />
                            <button
                              type="submit"
                              disabled={chatSending || !chatInput.trim()}
                              className="px-4 py-2.5 rounded-xl bg-[#088395] hover:bg-[#066d7c] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Send Notice</span>
                            </button>
                          </form>
                        </>
                      );
                    })()
                  ) : (
                    <div className="p-16 text-center text-slate-400">
                      Select a project from the left to view conversation.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: FLAG REVIEW QUEUE */}
          {adminTab === 'FLAGS' && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 uppercase">Filters:</span>
                  <select
                    value={flagFilter.status}
                    onChange={(e) => setFlagFilter({ ...flagFilter, status: e.target.value })}
                    className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-1.5 font-medium text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                  <select
                    value={flagFilter.category}
                    onChange={(e) => setFlagFilter({ ...flagFilter, category: e.target.value })}
                    className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-1.5 font-medium text-slate-700"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="CONTACT_SHARING">Contact Sharing</option>
                    <option value="COMMERCIAL">Commercial / Pricing</option>
                    <option value="OFF_PLATFORM">Off-Platform</option>
                    <option value="ABUSE">Abuse</option>
                  </select>
                </div>
                <button
                  onClick={fetchFlags}
                  className="text-xs font-semibold text-[#088395] hover:text-[#066d7c] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
                </button>
              </div>

              <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-3.5 text-xs text-teal-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#088395] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Review Principle:</span> A flag requests human review; it does not establish wrongdoing. Approvals are strictly idempotent to avoid duplicate delivery.
                </div>
              </div>

              {flags.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-slate-800 text-sm">No Flagged Messages in Review Queue</div>
                  <div className="text-xs text-slate-400 mt-1">All communications are policy-compliant.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="border border-slate-200 rounded-2xl p-5 hover:border-teal-200 bg-white transition shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              flag.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : flag.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : flag.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {flag.status}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                            {flag.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              flag.severity === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}
                          >
                            {flag.severity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(flag.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Flagged Message Excerpt:
                          </div>
                          <div className="p-3.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-900 border border-slate-200/70">
                            "{flag.message?.content}"
                          </div>
                          <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Policy Trigger: {flag.matchedRule} — {flag.reason}
                          </div>
                        </div>

                        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                          <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Sender Identity (Admin View Only):
                          </div>
                          <div>
                            <span className="text-slate-400">Public Alias: </span>
                            <span className="font-bold text-[#088395]">
                              {flag.message?.senderMembership?.alias}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Real Name: </span>
                            <span className="font-bold text-slate-900">
                              {flag.message?.senderMembership?.user?.realName || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Email: </span>
                            <span className="font-medium text-slate-600">
                              {flag.message?.senderMembership?.user?.email}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Project: </span>
                            <span className="font-semibold text-slate-800">
                              {flag.message?.conversation?.project?.name} ({flag.message?.conversation?.project?.code})
                            </span>
                          </div>
                        </div>
                      </div>

                      {flag.status === 'PENDING' && (
                        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center gap-3">
                          <input
                            type="text"
                            placeholder="Add optional reviewer notes..."
                            value={reviewNote[flag.id] || ''}
                            onChange={(e) =>
                              setReviewNote({ ...reviewNote, [flag.id]: e.target.value })
                            }
                            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#088395]"
                          />
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleAdminAction(flag.id, 'APPROVE')}
                              disabled={actionLoading[flag.id]}
                              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                            >
                              Approve & Deliver
                            </button>
                            <button
                              onClick={() => handleAdminAction(flag.id, 'REJECT')}
                              disabled={actionLoading[flag.id]}
                              className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleAdminAction(flag.id, 'DISMISS')}
                              disabled={actionLoading[flag.id]}
                              className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {flag.adminNotes && (
                        <div className="mt-2 text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 italic">
                          Decision note by {flag.reviewedBy}: "{flag.adminNotes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROJECTS & REAL IDENTITIES */}
          {adminTab === 'PROJECTS' && (
            <div className="mt-6 space-y-6">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Real Identity Directory & Project Assignments
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Administrators see real identities, while clients and specialists strictly see their unique project aliases.
                </p>

                <div className="space-y-4">
                  {projects.map((proj) => (
                    <div key={proj.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base">{proj.name}</span>
                          <span className="bg-teal-50 text-[#088395] px-2.5 py-0.5 rounded text-[11px] font-bold border border-teal-200">
                            {proj.code}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{proj.description}</span>
                      </div>

                      <div className="text-xs font-bold uppercase text-slate-400 mb-3">
                        Assigned Project Members ({proj.memberships?.length || 0}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {proj.memberships?.map((m: any) => (
                          <div
                            key={m.id}
                            className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-[#088395] flex items-center gap-1.5 text-xs">
                                <UserCheck className="w-3.5 h-3.5" />
                                {m.alias}
                              </div>
                              <div className="text-slate-800 font-bold text-xs mt-1">
                                {m.user?.realName}
                              </div>
                              <div className="text-slate-500 text-[11px]">{m.user?.email}</div>
                            </div>
                            <button
                              onClick={() =>
                                setRevokeModalTarget({
                                  id: m.id,
                                  userName: m.user?.realName,
                                  alias: m.alias,
                                  projectName: proj.name,
                                })
                              }
                              className="text-rose-600 hover:text-white hover:bg-rose-600 p-2 rounded-xl transition border border-rose-200 hover:border-rose-600"
                              title="Revoke Project Access"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POLICY RULES */}
          {adminTab === 'RULES' && (
            <div className="mt-6 space-y-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Configurable Moderation Guardrails
                </h3>
                <p className="text-xs text-slate-500">
                  Configure pre-delivery actions for commercial discussion and off-platform activity. Contact sharing is permanently locked to Hold for Review per privacy mandate.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-slate-900 text-sm">{rule.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-600">
                          {rule.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{rule.description}</p>
                      <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] font-mono text-slate-700 break-all mb-4">
                        Pattern: {rule.pattern}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-slate-400">Current Action: </span>
                        <span
                          className={`font-bold ${
                            rule.action === 'HOLD' ? 'text-amber-600' : 'text-blue-600'
                          }`}
                        >
                          {rule.action === 'HOLD' ? 'HOLD FOR REVIEW' : 'ALLOW & FLAG'}
                        </span>
                      </div>
                      {rule.category === 'CONTACT_SHARING' ? (
                        <span className="text-[11px] text-slate-400 italic">Locked to Hold</span>
                      ) : (
                        <button
                          onClick={() => handleToggleRuleAction(rule.id, rule.action)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                        >
                          Switch to {rule.action === 'HOLD' ? 'Allow & Flag' : 'Hold'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {adminTab === 'AUDIT' && (
            <div className="mt-6 space-y-3">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    System Audit & Moderation Trail
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tamper-evident record of all assignments, access revocations, and moderation decisions.
                  </p>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="text-xs font-semibold text-[#088395] flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition text-xs flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          {log.targetType}
                        </span>
                      </div>
                      <div className="text-slate-600 font-mono text-[11px] mt-1.5 break-all">
                        {log.details}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-slate-700 font-semibold">{log.actorEmail || 'SYSTEM'}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. POLISHED IN-APP MODAL FOR REVOKING ACCESS (Replaces browser window.confirm!) */}
      {revokeModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <UserMinus className="w-5 h-5" />
              </div>
              <button
                onClick={() => setRevokeModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Revoke Project Access?</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to revoke project access for{' '}
              <strong className="text-slate-800">{revokeModalTarget.userName}</strong> (Alias:{' '}
              <strong className="text-[#088395]">{revokeModalTarget.alias}</strong>) in{' '}
              <strong className="text-slate-800">{revokeModalTarget.projectName}</strong>? They will immediately lose access to this conversation.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRevokeModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevokeAccess}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
              >
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 Craftory Studio. All rights reserved. Administrator Governance Console.
          </div>
          <div className="flex items-center gap-6">
            <span>MySQL Persistent Engine</span>
            <a href="/api/health" target="_blank" className="text-[#088395] hover:underline flex items-center gap-1">
              Health Readiness API <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
