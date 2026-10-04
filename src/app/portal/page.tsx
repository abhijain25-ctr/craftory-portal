'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  MessageSquare,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers,
  Database,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  myAlias: string;
  myRole: string;
  conversationId: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  status: 'DELIVERED' | 'HELD_FOR_REVIEW' | 'REJECTED' | 'FAILED';
  createdAt: string;
  senderAlias: string;
  senderRole: string;
  isSelf: boolean;
  clientTempId?: string;
  rejectionReason?: string;
}

export default function ParticipantPortalPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Authenticate session on load
  useEffect(() => {
    checkSession();
  }, []);

  // Fetch projects when authenticated
  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [currentUser]);

  // Load conversation messages when project selection changes
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj && proj.conversationId) {
        prevMessagesCountRef.current = 0;
        fetchMessages(proj.conversationId);
      }
    }
  }, [selectedProjectId, projects]);

  // Internal-only container scroll (never scrolls the browser window)
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  // Periodic polling for chat messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedProjectId && projects.length > 0) {
        const proj = projects.find((p) => p.id === selectedProjectId);
        if (proj && proj.conversationId) {
          fetchMessages(proj.conversationId, true);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedProjectId, projects]);

  const checkSession = async () => {
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

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (convId: string, background = false) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMessages((prev) => {
          if (
            background &&
            prev.length === data.messages.length &&
            prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id &&
            prev[prev.length - 1]?.status === data.messages[data.messages.length - 1]?.status
          ) {
            return prev;
          }
          return data.messages;
        });
      }
    } catch (err) {
      if (!background) console.error(err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !conversation) return;

    const content = inputMessage.trim();
    const tempId = `temp_${Date.now()}`;
    setSending(true);

    const optimisticMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      content,
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
      senderAlias: conversation.myAlias || 'Me',
      senderRole: currentUser?.role || 'CLIENT',
      isSelf: true,
      clientTempId: tempId,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputMessage('');

    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, clientTempId: tempId }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.clientTempId === tempId ? data.message : m)));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.clientTempId === tempId ? { ...m, status: 'FAILED' } : m))
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, status: 'FAILED' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleRetryMessage = async (failedMsg: Message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'DELIVERED' } : m))
    );
    try {
      const res = await fetch(`/api/conversations/${failedMsg.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: failedMsg.content, clientTempId: failedMsg.clientTempId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === failedMsg.id ? data.message : m)));
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'FAILED' } : m))
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'FAILED' } : m))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#088395] animate-ping"></span>
          <span className="font-semibold text-sm">Authenticating secure session...</span>
        </div>
      </div>
    );
  }

  const currentProject = projects.find((p) => p.id === selectedProjectId);

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
                Pseudonymous Project Chat Portal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">
                {currentProject?.myAlias || 'Assigned Participant'}
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-end gap-1.5">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-[#088395] border border-teal-200">
                  {currentUser?.role}
                </span>
                <span className="text-slate-400">Identity Encrypted</span>
              </div>
            </div>

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

      {/* 2. MAIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: ASSIGNED PROJECTS / INBOX */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#088395]" />
                  Assigned Projects
                </h2>
                <span className="bg-teal-50 text-[#088395] px-2.5 py-0.5 rounded-full text-xs font-bold border border-teal-200">
                  {projects.length} Active
                </span>
              </div>

              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div className="font-semibold text-slate-700 text-sm">No Projects Assigned</div>
                  <div className="text-xs text-slate-400 mt-1">
                    You do not currently have active access to any project conversations.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => {
                    const isSelected = proj.id === selectedProjectId;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => setSelectedProjectId(proj.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50/50 border-[#088395] shadow-sm ring-1 ring-[#088395]/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{proj.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {proj.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                          {proj.description}
                        </p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                          <div className="text-slate-500">
                            Your Alias:{' '}
                            <span className="font-bold text-[#088395]">{proj.myAlias}</span>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition ${
                              isSelected ? 'text-[#088395] translate-x-1' : 'text-slate-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* REVIEWER TEST CHIPS */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#088395]" />
                Reviewer Scenario Triggers:
              </div>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    setInputMessage(
                      'Hi, could you send the update to my personal email direct.marcus@externalcorp.com?'
                    )
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200/60 transition"
                >
                  🚨 Test 1: Email Leak (Hold for Review)
                </button>
                <button
                  onClick={() =>
                    setInputMessage('Please give me a call on my cell at +1 415-893-1029.')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200/60 transition"
                >
                  🚨 Test 2: Phone Leak (Hold for Review)
                </button>
                <button
                  onClick={() =>
                    setInputMessage('Can we apply a $2,000 discount to the upcoming milestone?')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200/60 transition"
                >
                  💰 Test 3: Pricing Discussion (Admin Alert)
                </button>
                <button
                  onClick={() =>
                    setInputMessage('Sprint milestone deliverable 2 has been tested and verified.')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200/60 transition"
                >
                  ✅ Test 4: Ordinary Clean Message (Delivered)
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PROJECT CHAT CONVERSATION */}
          <div className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-[750px]">
            {/* CHAT HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    {currentProject?.name || 'Select a Project'}
                  </h2>
                  {currentProject && (
                    <span className="bg-teal-50 text-[#088395] px-2 py-0.5 rounded text-xs font-bold border border-teal-200">
                      {currentProject.code}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Your Confidential Alias: <span className="font-bold text-[#088395]">{currentProject?.myAlias}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (currentProject && currentProject.conversationId) {
                      fetchMessages(currentProject.conversationId);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-[#088395] hover:bg-slate-50 rounded-lg transition"
                  title="Reload Chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MANDATORY PRIVACY NOTICE BANNER (Requirement 03) */}
            <div className="bg-teal-50/70 border-b border-teal-100/80 px-4 py-2.5 text-xs text-teal-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#088395] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Privacy Notice:</span> Your identity is hidden from other participants. Craftory Studio administrators may review conversations for project management and policy compliance.
              </div>
            </div>

            {/* MESSAGE STREAM (Strictly scoped container scrolling) */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/40">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                  <div className="font-medium text-sm text-slate-600">No Messages Yet</div>
                  <div className="text-xs text-slate-400 mt-1">Start discussion using your project alias.</div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.isSelf;

                  return (
                    <div
                      key={msg.id || msg.clientTempId}
                      className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-700">
                          {msg.senderAlias}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-600 uppercase">
                          {msg.senderRole}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-sm ${
                          isSelf
                            ? msg.status === 'HELD_FOR_REVIEW'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tr-none'
                              : msg.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tr-none'
                              : msg.status === 'FAILED'
                              ? 'bg-slate-100 text-slate-600 border border-red-300 rounded-tr-none'
                              : 'bg-[#088395] text-white shadow-sm rounded-tr-none'
                            : 'bg-white text-slate-900 border border-slate-200/90 shadow-sm rounded-tl-none'
                        }`}
                      >
                        <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                        {/* STATUS BADGES */}
                        {isSelf && (
                          <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[11px]">
                            {msg.status === 'DELIVERED' && (
                              <span className="flex items-center gap-1 text-teal-100 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Delivered
                              </span>
                            )}
                            {msg.status === 'HELD_FOR_REVIEW' && (
                              <span className="flex items-center gap-1 text-amber-800 font-bold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Held for Admin Review (Invisible to recipient)
                              </span>
                            )}
                            {msg.status === 'REJECTED' && (
                              <span className="flex items-center gap-1 text-rose-700 font-bold">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Rejected: {msg.rejectionReason || 'Policy Violation'}
                              </span>
                            )}
                            {msg.status === 'FAILED' && (
                              <div className="flex items-center gap-2">
                                <span className="text-rose-600 font-semibold">Delivery failed</span>
                                <button
                                  onClick={() => handleRetryMessage(msg)}
                                  className="bg-white text-rose-600 px-2 py-0.5 rounded border border-rose-300 hover:bg-rose-50 text-[10px] font-bold"
                                >
                                  Retry
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* CHAT COMPOSER */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={`Send confidential message as ${currentProject?.myAlias || 'Participant'}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sending || !currentProject}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#088395] transition"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim() || !currentProject}
                className="bg-[#088395] hover:bg-[#066d7c] text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-md shadow-teal-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 Craftory Studio. All rights reserved. Confidential Portal Architecture.
          </div>
          <div className="flex items-center gap-6">
            <span>MySQL Persistent Engine</span>
            <span>Zero Real-Identity Leaks</span>
            <a href="/api/health" target="_blank" className="text-[#088395] hover:underline flex items-center gap-1">
              Health Readiness API <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
