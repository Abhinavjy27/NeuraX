import React, { useState, useEffect } from 'react';
import { Search, Loader2, ShieldAlert, User, Activity, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [context, setContext] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, complete, failed
  const [events, setEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [identityData, setIdentityData] = useState(null);

  // Chatbot state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const startAnalysis = async (e) => {
    e.preventDefault();
    setStatus('processing');
    setEvents([]);
    setCandidates([]);
    setSelectedPerson(null);
    setIdentityData(null);

    const formData = new FormData();
    formData.append('context', context);
    formData.append('consent_confirmed', 'true');
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setJobId(data.job_id);
    } catch (error) {
      console.error(error);
      setStatus('failed');
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`${API_BASE}/stream/${jobId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEvents((prev) => [...prev, data]);
      
      if (data.type === 'COMPLETE' || data.type === 'ERROR') {
        eventSource.close();
        setStatus(data.type === 'COMPLETE' ? 'complete' : 'failed');
        fetchCandidates(jobId);
      }
    };

    return () => eventSource.close();
  }, [jobId]);

  const fetchCandidates = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/candidates/${id}`);
      const data = await res.json();
      setCandidates(data.candidates);
    } catch (err) {
      console.error(err);
    }
  };

  const selectPerson = async (personId) => {
    setSelectedPerson(personId);
    try {
      const [idRes, claimsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/identity/${personId}`),
        fetch(`${API_BASE}/claims/${personId}`),
        fetch(`${API_BASE}/timeline/${personId}`)
      ]);
      setIdentityData({
        identity: await idRes.json(),
        claims: await claimsRes.json(),
        timeline: await timelineRes.json()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">NeuraX</h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide">DIGITAL IDENTITY INTELLIGENCE</p>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Status */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" />
                Discovery Parameters
              </h2>
              <form onSubmit={startAnalysis} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target Context</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Enter names, roles, or known facts (e.g. 'Linus Torvalds, Creator of Linux')"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'processing' || !context}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initiate Scan'}
                </button>
              </form>
            </div>

            {/* Live Feed */}
            {events.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 h-[400px] flex flex-col">
                <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Live Intelligence Feed
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                  {events.map((ev, i) => (
                    <div key={i} className="flex gap-3 text-sm animate-in slide-in-from-left-2 opacity-100">
                      <span className="text-gray-500 shrink-0 font-mono text-xs mt-0.5">[{ev.step}]</span>
                      <span className={ev.type === 'ERROR' ? 'text-red-400' : 'text-gray-300'}>{ev.message}</span>
                    </div>
                  ))}
                  {status === 'processing' && (
                    <div className="flex gap-3 text-sm">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span className="text-gray-500 italic">Processing...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Candidates */}
            {candidates.length > 0 && !selectedPerson && (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  Identified Candidates
                </h2>
                <div className="grid gap-4">
                  {candidates.map((c, i) => (
                    <div 
                      key={i} 
                      onClick={() => selectPerson(c.person_id)}
                      className="bg-gray-900/40 border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer transition-all hover:bg-gray-900/80 group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-100">{c.canonical_name_guess}</h3>
                          <p className="text-sm text-gray-500 mt-1">ID: {c.person_id}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          c.verdict === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.verdict === 'possible' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {c.verdict.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Identity Score</div>
                          <div className="text-2xl font-bold text-indigo-400">{(c.scores.identity_score * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Corroboration</div>
                          <div className="text-xl font-semibold text-gray-200">{(c.scores.source_corroboration * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Org Overlap</div>
                          <div className="text-xl font-semibold text-gray-200">{(c.scores.organization_overlap * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Penalty</div>
                          <div className="text-xl font-semibold text-red-400">{(c.scores.contradiction_penalty * 100).toFixed(0)}%</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {c.profiles_found.map((p, j) => (
                          <span key={j} className="px-2.5 py-1 bg-gray-800 rounded text-xs text-gray-300 font-medium capitalize">
                            {p.platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Identity Profile */}
            {identityData && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setSelectedPerson(null)}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  ← Back to Candidates
                </button>
                
                {/* Identity Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <ShieldAlert className="w-64 h-64" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-2">{identityData.identity.canonical_name}</h2>
                    <p className="text-indigo-400 font-mono mb-6">Confidence: {(identityData.identity.confidence * 100).toFixed(1)}%</p>
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                      {identityData.identity.aliases.map((alias, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300">
                          @{alias}
                        </span>
                      ))}
                    </div>

                    <p className="text-gray-400 mt-2 max-w-2xl">
                      The intelligence pipeline has successfully fused this identity into a knowledge graph. Use the Intelligence Agent below to query verified claims, footprints, and timelines.
                    </p>
                  </div>
                </div>

                {/* GraphRAG Chatbot */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-6 flex flex-col h-80">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Intelligence Agent (GraphRAG)
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin flex flex-col">
                    {chatHistory.length === 0 && (
                      <div className="text-gray-500 text-sm italic m-auto">Ask me anything about {identityData.identity.canonical_name}'s footprint...</div>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-sm' 
                            : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2">
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!chatInput.trim() || chatLoading) return;
                      const userMsg = chatInput;
                      setChatInput('');
                      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
                      setChatLoading(true);
                      try {
                        const res = await fetch(`${API_BASE}/chat/${selectedPerson}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: userMsg })
                        });
                        const data = await res.json();
                        setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
                      } catch (err) {
                        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error connecting to the intelligence agent.' }]);
                      } finally {
                        setChatLoading(false);
                      }
                    }} 
                    className="flex gap-2"
                  >
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="e.g. Which companies has this person worked for?" 
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      type="submit" 
                      disabled={chatLoading || !chatInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl disabled:opacity-50"
                    >
                      Send
                    </button>
                  </form>
                </div>

              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
