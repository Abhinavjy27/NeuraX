import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ShieldAlert, User, Activity, CheckCircle, Network, Clock, MessageSquare, ExternalLink, Globe, GitBranch, Briefcase, AtSign, Camera, Play } from 'lucide-react';
import { Network as VisNetwork } from 'vis-network';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

// Works in dev (vite proxies /api → backend) and Docker (nginx proxies /api → backend)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// ── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  instagram:   { color: '#e1306c', bg: '#3d0e1e', icon: Camera,    label: 'Instagram'   },
  'twitter/x': { color: '#1d9bf0', bg: '#0d2137', icon: AtSign,    label: 'Twitter / X' },
  twitter:     { color: '#1d9bf0', bg: '#0d2137', icon: AtSign,    label: 'Twitter / X' },
  github:      { color: '#e2e8f0', bg: '#161b22', icon: GitBranch, label: 'GitHub'       },
  linkedin:    { color: '#0a66c2', bg: '#071d33', icon: Briefcase, label: 'LinkedIn'     },
  youtube:     { color: '#ff0000', bg: '#2a0000', icon: Play,      label: 'YouTube'      },
  tiktok:      { color: '#69c9d0', bg: '#0a2325', icon: Globe,     label: 'TikTok'       },
  reddit:      { color: '#ff4500', bg: '#2d1a0e', icon: Globe,     label: 'Reddit'       },
  medium:      { color: '#12100e', bg: '#1a1a1a', icon: Globe,     label: 'Medium'       },
  wikipedia:   { color: '#ffffff', bg: '#333333', icon: Globe,     label: 'Wikipedia'    },
};

function getPlatformConfig(platform = '') {
  return PLATFORM_CONFIG[platform.toLowerCase()] || { color: '#64748b', bg: '#1e293b', icon: Globe, label: platform };
}

// ── Profile Tile ─────────────────────────────────────────────────────────────
function ProfileTile({ profile }) {
  const cfg = getPlatformConfig(profile.platform);
  const Icon = cfg.icon;
  const faceVerified = profile.face_verified === true;
  const faceUnknown = profile.face_verified === null || profile.face_verified === undefined;
  const textAttr = profile.text_attribution; // "CONFIRMED" | "POSSIBLE" | undefined
  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-2 rounded-2xl border p-4 transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer no-underline"
      style={{ borderColor: cfg.color + '44', background: cfg.bg }}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-6 h-6" style={{ color: cfg.color }} />
        <div className="flex items-center gap-1">
          {faceVerified && (
            <span title="Face-verified match" className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
              ✓ FACE
            </span>
          )}
          {!faceVerified && !faceUnknown && (
            <span title="Face mismatch — shown for reference only" className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-1.5 py-0.5">
              ✗
            </span>
          )}
          {faceUnknown && textAttr === 'CONFIRMED' && (
            <span title="Context-verified via bio matching" className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
              ✓ TEXT
            </span>
          )}
          {faceUnknown && textAttr === 'POSSIBLE' && (
            <span title="Possibly this person — bio is thin" className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
              ~ POSSIBLE
            </span>
          )}
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">@{profile.username || profile.url?.split('/').filter(Boolean).pop()}</div>
      </div>
      <div className="text-[10px] font-mono text-slate-600">
        {faceVerified && profile.face_confidence
          ? `Face match: ${(profile.face_confidence * 100).toFixed(0)}%`
          : profile.confidence
            ? `${(profile.confidence * 100).toFixed(0)}% confidence`
            : ''}
      </div>
    </a>
  );
}

// ── KnowledgeGraph ─────────────────────────────────────────────────────────────
function KnowledgeGraph({ personId, visible }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!personId) return;
    setStatus('loading');
    fetch(`${API_BASE}/graph/${personId}`)
      .then(r => { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(data => {
        if (!data.nodes?.length) { setStatus('empty'); return; }
        const nodes = data.nodes.map(n => {
          const colors = { person: '#6366f1', organization: '#10b981', platform: '#f59e0b', project: '#8b5cf6', event: '#f43f5e', location: '#06b6d4' };
          const shapes = { person: 'star', organization: 'box', platform: 'ellipse', project: 'diamond', event: 'dot', location: 'triangle' };
          const c = colors[n.type] || '#94a3b8';
          return {
            id: n.id, label: n.label, title: n.type, shape: shapes[n.type] || 'dot',
            color: { background: c, border: '#0f172a', highlight: { background: c, border: '#fff' } },
            font: { color: '#f8fafc', size: 13 },
            size: n.type === 'person' ? 32 : 20,
          };
        });
        const edges = data.edges.map((e, i) => ({
          id: `e${i}`, from: e.source, to: e.target,
          label: (e.relation || '').replace(/_/g, ' '),
          font: { align: 'middle', color: '#94a3b8', size: 10 },
          color: { color: '#334155', highlight: '#94a3b8' }, arrows: 'to',
        }));
        setStatus('ready');
        // defer to next frame so containerRef has dimensions
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          if (networkRef.current) networkRef.current.destroy();
          networkRef.current = new VisNetwork(containerRef.current, { nodes, edges }, {
            layout: { hierarchical: false },
            physics: { barnesHut: { gravitationalConstant: -2500, centralGravity: 0.25, springLength: 160, springConstant: 0.04, damping: 0.09 } },
            interaction: { hover: true, zoomView: true },
          });
        });
      })
      .catch(() => setStatus('error'));
    return () => { networkRef.current?.destroy(); networkRef.current = null; };
  }, [personId]);

  // When tab becomes visible, redraw
  useEffect(() => {
    if (visible && networkRef.current) {
      setTimeout(() => networkRef.current?.fit(), 100);
    }
  }, [visible]);

  return (
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/50 text-xs font-semibold tracking-wider text-slate-400 uppercase flex justify-between">
        <span>Identity Topology</span>
        <span className="font-normal normal-case text-slate-500">Scroll to zoom · Drag to pan</span>
      </div>
      <div className="relative" style={{ height: 480, background: '#0b1120' }}>
        {/* Dedicated container for vis-network - React MUST NOT render children here */}
        <div ref={containerRef} className="absolute inset-0" />
        
        {/* Overlays managed by React */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-2 bg-[#0b1120] z-10">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> Loading graph…
          </div>
        )}
        {status === 'empty' && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-[#0b1120] z-10">No topology data yet.</div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 bg-[#0b1120] z-10">Failed to load graph.</div>
        )}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-800/40 flex flex-wrap gap-4 text-xs text-slate-400">
        {[['#6366f1','Person'],['#10b981','Organization'],['#f59e0b','Platform'],['#8b5cf6','Project'],['#f43f5e','Event'],['#06b6d4','Location']].map(([c,l])=>(
          <span key={l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:c}}/>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ── EventTimeline ─────────────────────────────────────────────────────────────
function EventTimeline({ personId }) {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!personId) return;
    setStatus('loading');
    fetch(`${API_BASE}/timeline/${personId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setEvents(d); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [personId]);

  if (status === 'loading') return <div className="p-10 text-center text-slate-400 animate-pulse">Loading timeline…</div>;
  if (status === 'error') return <div className="p-8 text-center text-red-400">Failed to load timeline.</div>;
  if (!events.length) return <div className="p-10 text-center text-slate-500">No chronological events found.</div>;

  const iconBg = (txt) => {
    const t = txt.toLowerCase();
    if (t.includes('work') || t.includes('sign') || t.includes('join')) return '#10b981';
    if (t.includes('study') || t.includes('univers') || t.includes('graduat')) return '#8b5cf6';
    if (t.includes('live') || t.includes('locat') || t.includes('based')) return '#f59e0b';
    return '#6366f1';
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 max-h-[580px] overflow-y-auto">
      <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase text-center mb-4">Chronological OSINT Footprint</div>
      <VerticalTimeline layout="1-column-left" lineColor="#1e293b">
        {events.map((ev, i) => (
          <VerticalTimelineElement
            key={i}
            contentStyle={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', boxShadow: 'none', borderRadius: '12px' }}
            contentArrowStyle={{ borderRight: '7px solid #334155' }}
            date={ev.date || 'Unknown'}
            dateClassName="text-slate-500 font-mono text-xs ml-4"
            iconStyle={{ background: iconBg(ev.event), color: '#fff', boxShadow: '0 0 0 3px #0f172a' }}
            icon={<Clock className="w-4 h-4" />}
          >
            <p className="text-sm !mt-0 text-slate-200 font-medium">{ev.event}</p>
            {ev.confidence && (
              <div className="mt-1.5 text-[10px] font-mono text-slate-500">Confidence: {(ev.confidence * 100).toFixed(1)}%</div>
            )}
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [context, setContext] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [logEvents, setLogEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [identityData, setIdentityData] = useState(null);
  const [activeTab, setActiveTab] = useState('agent');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const logEndRef = useRef(null);

  const startAnalysis = async (e) => {
    e.preventDefault();
    setStatus('processing');
    setLogEvents([]); setCandidates([]); setSelectedPerson(null); setIdentityData(null); setChatHistory([]);
    const fd = new FormData();
    fd.append('context', context);
    fd.append('consent_confirmed', 'true');
    if (imageFile) fd.append('image', imageFile);
    try {
      const r = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: fd });
      const d = await r.json();
      setJobId(d.job_id);
    } catch { setStatus('failed'); }
  };

  useEffect(() => {
    if (!jobId) return;
    const es = new EventSource(`${API_BASE}/stream/${jobId}`);
    es.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      setLogEvents(p => [...p, d]);
      if (d.type === 'COMPLETE' || d.type === 'ERROR') {
        es.close();
        setStatus(d.type === 'COMPLETE' ? 'complete' : 'failed');
        if (d.type === 'COMPLETE') fetchCandidates(jobId);
      }
    };
    return () => es.close();
  }, [jobId]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logEvents]);

  const fetchCandidates = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/candidates/${id}`);
      const d = await r.json();
      setCandidates(d.candidates || []);
    } catch {}
  };

  const selectPerson = async (pid) => {
    setSelectedPerson(pid);
    setActiveTab('agent');
    setChatHistory([]);
    try {
      const [idR, clR] = await Promise.all([
        fetch(`${API_BASE}/identity/${pid}`),
        fetch(`${API_BASE}/claims/${pid}`),
      ]);
      setIdentityData({ identity: await idR.json(), claims: await clR.json() });
    } catch {}
  };

  const sendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput; setChatInput('');
    setChatHistory(p => [...p, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const r = await fetch(`${API_BASE}/chat/${selectedPerson}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const d = await r.json();
      setChatHistory(p => [...p, { role: 'assistant', content: d.reply }]);
    } catch {
      setChatHistory(p => [...p, { role: 'assistant', content: 'Connection error.' }]);
    } finally { setChatLoading(false); }
  };

  const tabs = [
    { id: 'agent',    label: 'Agent',          Icon: MessageSquare },
    { id: 'profiles', label: 'Social Profiles', Icon: User         },
    { id: 'graph',    label: 'Graph Topology',  Icon: Network       },
    { id: 'timeline', label: 'OSINT Timeline',  Icon: Clock         },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">NeuraX</h1>
              <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">Digital Identity Intelligence</p>
            </div>
          </div>
          {status === 'complete' && <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Scan Complete</span>}
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left: Scan form + live log */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <Search className="w-4 h-4 text-indigo-400" /> Discovery Parameters
              </h2>
              <form onSubmit={startAnalysis} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Context</label>
                  <textarea
                    value={context} onChange={e => setContext(e.target.value)} required
                    placeholder="e.g. 'Tom Holland, actor, Spider-Man'"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Target Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500" />
                </div>
                <button type="submit" disabled={status === 'processing' || !context}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {status === 'processing' ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</> : 'Initiate Scan'}
                </button>
              </form>
            </div>

            {logEvents.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 flex flex-col" style={{ maxHeight: 360 }}>
                <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Live Intelligence Feed
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {logEvents.map((ev, i) => (
                    <div key={i} className="flex gap-2.5 text-xs">
                      <span className="text-gray-600 shrink-0 font-mono">[{ev.step}]</span>
                      <span className={ev.type === 'ERROR' ? 'text-red-400' : 'text-gray-300'}>{ev.message}</span>
                    </div>
                  ))}
                  {status === 'processing' && (
                    <div className="flex gap-2 text-xs"><Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" /><span className="text-gray-600 italic">Processing…</span></div>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-8 space-y-6">

            {/* Candidate list */}
            {candidates.length > 0 && !selectedPerson && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" /> Identified Candidates
                </h2>
                <div className="grid gap-4">
                  {candidates.map((c, i) => (
                    <div key={i} onClick={() => selectPerson(c.person_id)}
                      className="bg-gray-900/40 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:bg-gray-900/80 group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-100 capitalize">{c.canonical_name_guess}</h3>
                          <p className="text-xs text-gray-600 mt-0.5 font-mono">{c.person_id}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          c.verdict === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.verdict === 'possible'  ? 'bg-amber-500/10  text-amber-400  border-amber-500/20'  :
                                                      'bg-red-500/10    text-red-400    border-red-500/20'}`}>
                          {c.verdict.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mb-5">
                        {[['Identity Score', (c.scores.identity_score*100).toFixed(1)+'%','text-indigo-400'],
                          ['Corroboration',  (c.scores.source_corroboration*100).toFixed(0)+'%','text-gray-200'],
                          ['Org Overlap',    (c.scores.organization_overlap*100).toFixed(0)+'%','text-gray-200'],
                          ['Penalty',        (c.scores.contradiction_penalty*100).toFixed(0)+'%','text-red-400']
                        ].map(([label, val, cls]) => (
                          <div key={label} className="bg-gray-950 rounded-xl p-3 border border-gray-800">
                            <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
                            <div className={`text-xl font-bold ${cls}`}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {/* Profile tiles on candidate card */}
                      {c.profiles_found?.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {c.profiles_found.slice(0, 8).map((p, j) => (
                            <ProfileTile key={j} profile={p} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Identity */}
            {identityData && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => setSelectedPerson(null)}
                  className="text-sm text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                  ← Back to Candidates
                </button>

                {/* Identity Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldAlert className="w-64 h-64" /></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-1 capitalize">{identityData.identity.canonical_name}</h2>
                    <p className="text-indigo-400 font-mono text-sm mb-6">Confidence: {(identityData.identity.confidence * 100).toFixed(1)}%</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {identityData.identity.aliases?.map((a, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-800/60 border border-gray-700 rounded-lg text-xs text-gray-300">@{a}</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400 max-w-2xl">
                      The intelligence pipeline has successfully fused this identity into a knowledge graph. Use the tabs below to explore the verified claims, timeline, and topology.
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
                  {tabs.map(({ id, label, Icon }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        activeTab === id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                      <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                  ))}
                </div>

                {/* Agent Tab */}
                {activeTab === 'agent' && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 flex flex-col" style={{ height: 500 }}>
                    <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Intelligence Agent (GraphRAG)
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 flex flex-col">
                      {chatHistory.length === 0 && (
                        <div className="text-gray-600 text-sm italic m-auto text-center">
                          Ask me anything about {identityData.identity.canonical_name}'s digital footprint…
                        </div>
                      )}
                      {chatHistory.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${
                            m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'}`}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={sendChat} className="flex gap-2">
                      <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        placeholder="e.g. Where does this person work?" 
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
                      <button type="submit" disabled={chatLoading || !chatInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors text-sm font-medium">
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* Social Profiles Tab */}
                {activeTab === 'profiles' && (
                  <div className="animate-in fade-in duration-300">
                    {identityData.identity.profiles?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {identityData.identity.profiles.map((p, i) => (
                          <ProfileTile key={i} profile={p} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                        No social profiles discovered for this identity.
                      </div>
                    )}
                  </div>
                )}

                {/* Graph Tab — always mounted so vis-network gets real dimensions */}
                <div className={activeTab === 'graph' ? 'animate-in fade-in duration-300' : 'hidden'}>
                  <KnowledgeGraph personId={selectedPerson} visible={activeTab === 'graph'} />
                </div>

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div className="animate-in fade-in duration-300">
                    <EventTimeline personId={selectedPerson} />
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
