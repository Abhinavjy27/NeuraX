import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Loader2,
  User,
  Activity,
  CheckCircle2,
  ExternalLink,
  Globe,
  GitBranch,
  Briefcase,
  AtSign,
  Camera,
  Play,
  ArrowLeft,
  AlertCircle,
  X,
  Clock,
  MessageSquare,
  Network,
  ShieldCheck,
} from 'lucide-react';

// API base URL supports VITE_API_BASE or defaults to Vite proxy (/api)
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// Platform configurations matching backend scraped sources
interface PlatformConfig {
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
}

const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  wikipedia: { color: '#e2e8f0', bg: '#1c1e22', icon: Globe, label: 'Wikipedia' },
  'twitter/x': { color: '#1d9bf0', bg: '#0d2137', icon: AtSign, label: 'Twitter / X' },
  twitter: { color: '#1d9bf0', bg: '#0d2137', icon: AtSign, label: 'Twitter / X' },
  github: { color: '#e2e8f0', bg: '#161b22', icon: GitBranch, label: 'GitHub' },
  linkedin: { color: '#0a66c2', bg: '#071d33', icon: Briefcase, label: 'LinkedIn' },
  instagram: { color: '#e1306c', bg: '#3d0e1e', icon: Camera, label: 'Instagram' },
  youtube: { color: '#ff0000', bg: '#2a0000', icon: Play, label: 'YouTube' },
  tiktok: { color: '#69c9d0', bg: '#0a2325', icon: Globe, label: 'TikTok' },
  reddit: { color: '#ff4500', bg: '#2d1a0e', icon: Globe, label: 'Reddit' },
  medium: { color: '#ffffff', bg: '#1a1a1a', icon: Globe, label: 'Medium' },
};

function getPlatformConfig(platform = ''): PlatformConfig {
  const key = platform.toLowerCase().trim();
  return (
    PLATFORM_CONFIG[key] || {
      color: '#94a3b8',
      bg: '#131b2c',
      icon: Globe,
      label: platform.charAt(0).toUpperCase() + platform.slice(1) || 'Unknown Source',
    }
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface ProfileData {
  platform: string;
  username?: string;
  url?: string;
  confidence?: number;
  face_verified?: boolean | null;
  face_confidence?: number | null;
  text_attribution?: 'CONFIRMED' | 'POSSIBLE' | string;
}

interface CandidateScores {
  identity_score?: number;
  source_corroboration?: number;
  organization_overlap?: number;
  contradiction_penalty?: number;
  name_score?: number;
  image_score?: number;
  username_score?: number;
  project_overlap?: number;
  context_score?: number;
}

interface Candidate {
  person_id: string;
  canonical_name_guess: string;
  verdict: 'confirmed' | 'possible' | 'insufficient_evidence' | string;
  scores: CandidateScores;
  profiles_found?: ProfileData[];
}

interface PipelineEvent {
  type: string;
  step: string;
  message: string;
  confidence?: number;
}

interface TimelineEvent {
  date?: string;
  event: string;
  confidence?: number;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── Profile Tile Component ──────────────────────────────────────────────────
const ProfileTile: React.FC<{ profile: ProfileData }> = ({ profile }) => {
  const cfg = getPlatformConfig(profile.platform);
  const Icon = cfg.icon;
  const faceVerified = profile.face_verified === true;
  const faceMismatched = profile.face_verified === false;
  const textAttr = profile.text_attribution;

  const displayHandle =
    profile.username ||
    (profile.url ? profile.url.split('/').filter(Boolean).pop() : 'unspecified');

  return (
    <a
      href={profile.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col justify-between rounded-xl border p-3.5 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer no-underline min-h-[96px]"
      style={{
        borderColor: `${cfg.color}33`,
        background: cfg.bg,
      }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        <div className="flex items-center gap-1.5">
          {faceVerified && (
            <span
              title="Face-verified match against uploaded probe image"
              className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
            >
              ✓ FACE
            </span>
          )}
          {faceMismatched && (
            <span
              title="Face mismatch against probe image"
              className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5"
            >
              ✗ FACE
            </span>
          )}
          {textAttr === 'CONFIRMED' && !faceVerified && (
            <span
              title="Context-verified via biographical correlation"
              className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5"
            >
              ✓ TEXT
            </span>
          )}
          {textAttr === 'POSSIBLE' && !faceVerified && (
            <span
              title="Tentative attribution based on sparse context"
              className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5"
            >
              ~ POSSIBLE
            </span>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 transition-colors" />
        </div>
      </div>

      <div className="my-1.5">
        <div className="text-xs font-semibold" style={{ color: cfg.color }}>
          {cfg.label}
        </div>
        <div className="text-xs text-slate-300 font-mono truncate mt-0.5">
          {displayHandle?.startsWith('@') ? displayHandle : `@${displayHandle}`}
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-500">
        {faceVerified && profile.face_confidence !== undefined && profile.face_confidence !== null
          ? `Face match: ${(profile.face_confidence * 100).toFixed(0)}%`
          : profile.confidence !== undefined && profile.confidence !== null
          ? `${(profile.confidence * 100).toFixed(0)}% confidence`
          : ''}
      </div>
    </a>
  );
};

// ── Main Investigation Page ────────────────────────────────────────────────
export const InvestigationPage: React.FC = () => {
  // Scan Parameters State
  const [context, setContext] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Application Pipeline State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'complete' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logEvents, setLogEvents] = useState<PipelineEvent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Detailed Candidate Investigation State
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedPersonDetail, setSelectedPersonDetail] = useState<{
    canonical_name?: string;
    confidence?: number;
    aliases?: string[];
    profiles?: ProfileData[];
  } | null>(null);
  const [detailTab, setDetailTab] = useState<'agent' | 'profiles' | 'timeline' | 'graph'>('agent');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineStatus, setTimelineStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [graphStatus, setGraphStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // Interactive Chat State (GraphRAG Agent)
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Image Upload Handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Initiate Scan Action
  const startScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context.trim() || status === 'scanning' || status === 'processing') return;

    setStatus('scanning');
    setErrorMessage(null);
    setLogEvents([]);
    setCandidates([]);
    setSelectedPersonId(null);
    setSelectedPersonDetail(null);
    setChatHistory([]);

    const fd = new FormData();
    fd.append('context', context.trim());
    fd.append('consent_confirmed', 'true');
    if (imageFile) {
      fd.append('image', imageFile);
    }

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: fd,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorData.detail || `Server returned error ${response.status}`);
      }

      const data = await response.json();
      if (!data.job_id) {
        throw new Error('Backend did not return a valid job identifier.');
      }
      setJobId(data.job_id);
      setStatus('processing');
    } catch (err: any) {
      console.error('Scan dispatch failed:', err);
      setStatus('error');
      setErrorMessage(
        err.message?.includes('Failed to fetch')
          ? 'Cannot reach Backend AI Engine. Ensure FastAPI is running on port 8000.'
          : err.message || 'Failed to dispatch investigation request.'
      );
    }
  };

  // SSE Stream Listener for Live Intelligence Feed
  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`${API_BASE}/stream/${jobId}`);

    eventSource.onmessage = (event) => {
      try {
        const parsed: PipelineEvent = JSON.parse(event.data);
        setLogEvents((prev) => [...prev, parsed]);

        if (parsed.type === 'COMPLETE') {
          eventSource.close();
          setStatus('complete');
          fetchCandidates(jobId);
        } else if (parsed.type === 'ERROR') {
          eventSource.close();
          setStatus('error');
          setErrorMessage(parsed.message || 'Pipeline encountered a critical error.');
          fetchCandidates(jobId); // Still attempt to retrieve partial findings
        }
      } catch (parseErr) {
        console.error('Failed to parse SSE event data:', parseErr);
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically, but if job finished, finalize
      eventSource.close();
      fetchCandidates(jobId);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  // Auto-scroll the live feed log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEvents]);

  // Fetch Candidates from authoritative backend endpoint
  const fetchCandidates = async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE}/candidates/${id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
      }
      if (data.status === 'complete') {
        setStatus('complete');
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  // Inspect specific candidate
  const handleSelectPerson = async (personId: string) => {
    setSelectedPersonId(personId);
    setDetailTab('agent');
    setChatHistory([]);

    try {
      const resp = await fetch(`${API_BASE}/identity/${personId}`);
      if (resp.ok) {
        const detail = await resp.json();
        setSelectedPersonDetail(detail);
      }
    } catch (err) {
      console.error('Failed to fetch identity details:', err);
    }
  };

  // Load Timeline when timeline tab is active
  useEffect(() => {
    if (selectedPersonId && detailTab === 'timeline') {
      setTimelineStatus('loading');
      fetch(`${API_BASE}/timeline/${selectedPersonId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Timeline not found');
          return r.json();
        })
        .then((data) => {
          setTimelineEvents(Array.isArray(data) ? data : []);
          setTimelineStatus('ready');
        })
        .catch(() => setTimelineStatus('error'));
    }
  }, [selectedPersonId, detailTab]);

  // Load Graph when graph tab is active
  useEffect(() => {
    if (selectedPersonId && detailTab === 'graph') {
      setGraphStatus('loading');
      fetch(`${API_BASE}/graph/${selectedPersonId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Graph not found');
          return r.json();
        })
        .then((data) => {
          setGraphData(data && data.nodes ? data : { nodes: [], edges: [] });
          setGraphStatus('ready');
        })
        .catch(() => setGraphStatus('error'));
    }
  }, [selectedPersonId, detailTab]);

  // Send message to GraphRAG Agent
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !selectedPersonId) return;

    const query = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', content: query }]);
    setChatLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/chat/${selectedPersonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      if (!resp.ok) throw new Error('Chat API returned error');
      const data = await resp.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.reply || 'No response.' }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Unable to communicate with the GraphRAG analyst engine.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans flex flex-col selection:bg-indigo-500/30">
      {/* ── HEADER ── */}
      <header className="border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo box */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">NeuraX</h1>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                  Console
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase mt-0.5">
                DIGITAL IDENTITY INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Exit link back to main website */}
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit Console
            </Link>

            {/* Dynamic System Status Indicator */}
            {status === 'complete' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Scan Complete
              </span>
            )}

            {(status === 'scanning' || status === 'processing') && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                {status === 'scanning' ? 'Dispatching…' : 'Processing…'}
              </span>
            )}

            {status === 'error' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Error Encountered
              </span>
            )}

            {status === 'idle' && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/60 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Ready
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: DISCOVERY PARAMETERS & LIVE FEED ── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card: Discovery Parameters */}
          <div className="bg-[#0b101c] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-slate-200">
              <Search className="w-4 h-4 text-indigo-400" />
              Discovery Parameters
            </h2>

            <form onSubmit={startScan} className="space-y-4">
              {/* Target Context Input */}
              <div>
                <label htmlFor="target-context" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Target Context
                </label>
                <textarea
                  id="target-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. Sundar Pichai or 'Linus Torvalds, Linux creator'"
                  required
                  rows={3}
                  className="w-full bg-[#060911] border border-slate-800 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Target Image (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Target Image (Optional)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-file-input"
                />

                <div className="flex items-center gap-2.5 bg-[#060911] border border-slate-800 rounded-xl p-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shrink-0"
                  >
                    Choose File
                  </button>

                  {imageFile ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Probe Preview"
                          className="w-7 h-7 rounded object-cover border border-slate-700 shrink-0"
                        />
                      )}
                      <span className="text-xs text-slate-300 font-mono truncate" title={imageFile.name}>
                        {imageFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="ml-auto text-slate-500 hover:text-slate-300 p-0.5"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic truncate">
                      No probe image chosen
                    </span>
                  )}
                </div>
              </div>

              {/* Initiate Scan Button */}
              <button
                type="submit"
                disabled={status === 'scanning' || status === 'processing' || !context.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {status === 'scanning' || status === 'processing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Scanning…
                  </>
                ) : (
                  'Initiate Scan'
                )}
              </button>
            </form>
          </div>

          {/* Card: Live Intelligence Feed */}
          <div className="bg-[#0b101c] border border-slate-800/80 rounded-2xl p-5 flex flex-col flex-1 min-h-[320px] max-h-[420px] shadow-xl">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Live Intelligence Feed
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {logEvents.length === 0 && (
                <div className="text-slate-600 text-xs italic py-10 text-center font-sans">
                  Awaiting scan initiation…
                </div>
              )}

              {logEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-slate-500 shrink-0 font-mono text-[11px]">
                    [{ev.step || 'pipeline'}]
                  </span>
                  <span
                    className={
                      ev.type === 'ERROR'
                        ? 'text-rose-400'
                        : ev.type === 'FINDING'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                    }
                  >
                    {ev.message}
                  </span>
                </div>
              ))}

              {(status === 'scanning' || status === 'processing') && (
                <div className="flex items-center gap-2 text-slate-500 italic pt-1">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>Processing intelligence pipeline…</span>
                </div>
              )}

              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: IDENTIFIED CANDIDATES & METRICS ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Header Title for candidates */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2 text-slate-200">
              <User className="w-4 h-4 text-indigo-400" />
              Identified Candidates
            </h2>
            {candidates.length > 0 && !selectedPersonId && (
              <span className="text-xs text-slate-400 font-mono">
                {candidates.length} candidate{candidates.length > 1 ? 's' : ''} correlated
              </span>
            )}
          </div>

          {/* Error Banner if error occurred */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Pipeline Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Case 1: Candidates Found (Overview View) */}
          {candidates.length > 0 && !selectedPersonId && (
            <div className="space-y-4">
              {candidates.map((cand, idx) => {
                const verdictUpper = (cand.verdict || 'possible').toUpperCase();
                const verdictColor =
                  cand.verdict === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : cand.verdict === 'possible'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                const identityScore =
                  cand.scores?.identity_score !== undefined
                    ? `${(cand.scores.identity_score * 100).toFixed(1)}%`
                    : '—';
                const corroboration =
                  cand.scores?.source_corroboration !== undefined
                    ? `${(cand.scores.source_corroboration * 100).toFixed(0)}%`
                    : '—';
                const orgOverlap =
                  cand.scores?.organization_overlap !== undefined
                    ? `${(cand.scores.organization_overlap * 100).toFixed(0)}%`
                    : '—';
                const penalty =
                  cand.scores?.contradiction_penalty !== undefined
                    ? `${(cand.scores.contradiction_penalty * 100).toFixed(0)}%`
                    : '0%';

                return (
                  <div
                    key={idx}
                    className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                  >
                    {/* Header: Candidate Name, ID, and Verdict */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight capitalize">
                          {cand.canonical_name_guess}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-1 select-all">
                          {cand.person_id}
                        </p>
                      </div>

                      <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${verdictColor}`}>
                        {verdictUpper}
                      </span>
                    </div>

                    {/* 4 Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="bg-[#060911] rounded-xl p-3.5 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                          Identity Score
                        </div>
                        <div className="text-2xl font-bold text-indigo-400 font-sans">
                          {identityScore}
                        </div>
                      </div>

                      <div className="bg-[#060911] rounded-xl p-3.5 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                          Corroboration
                        </div>
                        <div className="text-2xl font-bold text-slate-100 font-sans">
                          {corroboration}
                        </div>
                      </div>

                      <div className="bg-[#060911] rounded-xl p-3.5 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                          Org Overlap
                        </div>
                        <div className="text-2xl font-bold text-slate-100 font-sans">
                          {orgOverlap}
                        </div>
                      </div>

                      <div className="bg-[#060911] rounded-xl p-3.5 border border-slate-800/80">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                          Penalty
                        </div>
                        <div className={`text-2xl font-bold font-sans ${cand.scores?.contradiction_penalty ? 'text-rose-400' : 'text-slate-100'}`}>
                          {penalty}
                        </div>
                      </div>
                    </div>

                    {/* Discovered Profiles / Evidence Source Cards */}
                    {cand.profiles_found && cand.profiles_found.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                          <span>Corroborated Open-Source Footprints</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({cand.profiles_found.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {cand.profiles_found.map((profile, pIdx) => (
                            <ProfileTile key={pIdx} profile={profile} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic py-2">
                        No public profiles discovered for this candidate.
                      </div>
                    )}

                    {/* Bottom Action: Deep Dive into Knowledge Graph & Timeline */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Identity pipeline synthesized graph and chronological evidence.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectPerson(cand.person_id)}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        Inspect Deep Intelligence & Timeline →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Case 2: Selected Candidate Detail (Deep Intelligence View) */}
          {selectedPersonId && (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Candidates Overview
              </button>

              {/* Candidate Banner */}
              <div className="bg-gradient-to-br from-[#0c1222] to-[#070b14] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-2xl font-bold text-white capitalize mb-1">
                  {selectedPersonDetail?.canonical_name || 'Target Identity'}
                </h3>
                <p className="text-xs font-mono text-indigo-400 mb-4">
                  {selectedPersonId}
                  {selectedPersonDetail?.confidence && (
                    <span className="ml-3 text-slate-400">
                      Confidence: {(selectedPersonDetail.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </p>

                {selectedPersonDetail?.aliases && selectedPersonDetail.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPersonDetail.aliases.map((alias, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/60 rounded-md text-xs text-slate-300 font-mono"
                      >
                        @{alias}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  The multi-signal OSINT engine has resolved this identity into entity claims, chronological timeline events, and relational topology.
                </p>
              </div>

              {/* Detail Navigation Tabs */}
              <div className="flex gap-2 border-b border-slate-800 pb-2">
                {[
                  { id: 'agent', label: 'Analyst Agent', icon: MessageSquare },
                  { id: 'profiles', label: 'Social Profiles', icon: User },
                  { id: 'graph', label: 'Topology Graph', icon: Network },
                  { id: 'timeline', label: 'Chronological Timeline', icon: Clock },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDetailTab(id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      detailTab === id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Analyst Agent (GraphRAG) */}
              {detailTab === 'agent' && (
                <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-5 flex flex-col h-[460px]">
                  <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Autonomous Analyst Agent (GraphRAG)
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                    {chatHistory.length === 0 && (
                      <div className="text-slate-500 text-xs italic m-auto text-center py-20">
                        Query the OSINT intelligence graph about {selectedPersonDetail?.canonical_name || 'this identity'}…
                        <br />
                        <span className="text-[11px] text-slate-600 mt-1 block">
                          Examples: "Where does this person work?", "What organizations are linked?", "Summarize timeline"
                        </span>
                      </div>
                    )}

                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white rounded-tr-sm'
                              : 'bg-[#060911] text-slate-200 border border-slate-800 rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#060911] border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the analyst agent about this identity…"
                      className="flex-1 bg-[#060911] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* Tab: Social Profiles */}
              {detailTab === 'profiles' && (
                <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6">
                  {selectedPersonDetail?.profiles && selectedPersonDetail.profiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedPersonDetail.profiles.map((p, i) => (
                        <ProfileTile key={i} profile={p} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No explicit social profiles recorded in this identity record.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Topology Graph */}
              {detailTab === 'graph' && (
                <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6">
                  {graphStatus === 'loading' && (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      Synthesizing topology graph…
                    </div>
                  )}
                  {graphStatus === 'ready' && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>Extracted Knowledge Entities & Relational Edges</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {graphData.nodes?.length || 0} nodes · {graphData.edges?.length || 0} relations
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {graphData.nodes?.map((node, i) => (
                          <div
                            key={i}
                            className="bg-[#060911] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-200">{node.label}</span>
                            <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              {node.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {graphStatus === 'error' && (
                    <div className="text-center py-12 text-rose-400 text-xs">
                      Failed to load graph entities for this identity.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Chronological Timeline */}
              {detailTab === 'timeline' && (
                <div className="bg-[#0b101c] border border-slate-800 rounded-2xl p-6">
                  {timelineStatus === 'loading' && (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                      Loading chronological OSINT footprint…
                    </div>
                  )}
                  {timelineStatus === 'ready' && timelineEvents.length > 0 && (
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {timelineEvents.map((ev, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-3 bg-[#060911] border border-slate-800/80 rounded-xl text-xs"
                        >
                          <div className="w-20 shrink-0 font-mono text-[11px] text-indigo-400 pt-0.5">
                            {ev.date || 'Undated'}
                          </div>
                          <div className="flex-1 text-slate-200">
                            <p className="font-medium mb-1">{ev.event}</p>
                            {ev.confidence && (
                              <span className="text-[10px] font-mono text-slate-500">
                                Confidence: {(ev.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {timelineStatus === 'ready' && timelineEvents.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No chronological milestones recorded for this identity.
                    </div>
                  )}
                  {timelineStatus === 'error' && (
                    <div className="text-center py-12 text-rose-400 text-xs">
                      Failed to load timeline events.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Case 3: Idle Empty State */}
          {candidates.length === 0 && (status === 'idle' || status === 'scanning' || status === 'processing') && (
            <div className="bg-[#0b101c] border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[380px] shadow-xl">
              {status === 'scanning' || status === 'processing' ? (
                <div className="space-y-4 max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Correlating Public Identity Signals
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Executing multi-signal pipeline: extracting facial embeddings, crawling OSINT endpoints (Wikipedia, GitHub, LinkedIn), attributing social footprint, and evaluating contradiction penalties.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-md">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <ShieldCheck className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-200">
                    Awaiting Target Parameters
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter a target name or context on the left (e.g. <span className="text-slate-300 font-mono">Sundar Pichai</span>) and optionally select a probe image, then initiate a scan to correlate identity evidence.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Case 4: Scan Finished but 0 candidates */}
          {candidates.length === 0 && status === 'complete' && (
            <div className="bg-[#0b101c] border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[380px] shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">
                No Matching Candidates Correlated
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                The pipeline finished without finding any high-confidence profile matches for the provided context seed. Try refining the target context.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
