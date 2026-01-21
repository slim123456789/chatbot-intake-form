"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  ArrowRight, Check, ChevronRight, Activity, Zap, 
  Shield, Play, Pause, Calendar, Stethoscope, Beaker, Lock,
  ClipboardCheck, AlertCircle, Volume2, VolumeX, Send, ShieldCheck, Eye, Search, ChevronDown, 
  LayoutDashboard, ListChecks
} from 'lucide-react';

// --- Type-Safe Apple Motion Config ---
const messageVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", 
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", 
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", 
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", 
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

const CHAT_FLOW = [
  { id: 'gender', key: 'gender', text: "To begin your diagnostic, please select your biological sex:", type: 'choice', options: ['Male', 'Female'] },
  { id: 'state', key: 'state', text: "In which state do you currently reside? (Required for clinical licensing):", type: 'state_select' },
  { 
    id: 'objective', 
    key: 'goal', 
    text: "Identify your primary physiological optimization objective:", 
    type: 'choice', 
    options: ['Live Longer (Longevity)', 'Boost Daily Energy', 'Improve Sleep Quality', 'Optimize Body Composition', 'Balance Hormones', 'Hypertrophy & Strength'] 
  },
  { id: 'brain_fog', key: 'brain_fog', text: "How often do you experience a midday brain fog?", type: 'choice', options: ['Daily / Chronic', 'Occasionally', 'Rarely / Never'] },
  { id: 'vitality', key: 'vitality', text: "Do you wake up feeling fully restored?", type: 'choice', options: ['Rarely Restored', 'Somewhat', 'Fully Restored'] },
  { id: 'stress', key: 'stress', text: "Stress resilience change (last 24 months):", type: 'choice', options: ['Noticeably Decreased', 'Remained Stable'] },
  { id: 'roi', key: 'roi', text: "How are your workout results vs. 5 years ago?", type: 'choice', options: ['Hitting a plateau', 'Results are slower', 'Still optimizing'] },
  { id: 'fertility', key: 'fertility', text: "Clinical Preference: Do you desire to preserve fertility?", type: 'choice', options: ['Yes, Preservation Required', 'Not a Priority'] },
  { id: 'fname', key: 'firstName', text: "To initialize your clinical file and medical clearance, what is your first name?", type: 'text' },
  { id: 'lname', key: 'lastName', text: "And your legal last name?", type: 'text' },
  { id: 'email', key: 'email', text: "What is the best email address for your secure medical portal?", type: 'email' },
  { id: 'phone', key: 'phone', text: "Lastly, your phone number for physician coordination?", type: 'tel' },
  { id: 'history', key: 'medicalHistory', text: "Do you have a history of heart conditions, current hormone therapy, or active cancer treatment?", type: 'choice', options: ['Yes, medical history exists', 'None of the above apply'] },
];

export default function UnifiedClinicalChat() {
  const [view, setView] = useState<'chat' | 'loading' | 'results' | 'qualified'>('chat');
  const [step, setStep] = useState(0);
  // Added Diagnostic Started divider to initial history
  const [history, setHistory] = useState<any[]>([
    { role: 'divider', content: 'Diagnostic Protocol Started', type: 'start' },
    { role: 'bot', content: CHAT_FLOW[0].text, id: CHAT_FLOW[0].id }
  ]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeMessageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // --- Auto-Play Logic ---
  useEffect(() => {
    if (view === 'results' && videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
    }
  }, [view]);

  // --- Dynamic Anchoring ---
  useEffect(() => {
    const scrollToActive = () => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        if ((view === 'qualified' || view === 'results') && heroRef.current) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (activeMessageRef.current && view === 'chat') {
          const target = activeMessageRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const scrollTarget = container.scrollTop + (targetRect.top - containerRect.top) - 60;
          container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
      }
    };
    const timer = setTimeout(scrollToActive, 250);
    return () => clearTimeout(timer);
  }, [history, isTyping, view, step]);

  const handleSubmission = (val: string) => {
    if (!val || isSubmitted) return;
    const currentQ = CHAT_FLOW[step];
    setFormData(prev => ({ ...prev, [currentQ.key]: val }));
    setHistory(prev => [...prev, { role: 'user', content: val }]);
    setInputValue('');
    setIsStateOpen(false);

    if (currentQ.id === 'fertility') {
      setView('loading');
      runLoadingSequence();
      return;
    }
    if (currentQ.id === 'history') {
      setIsSubmitted(true);
      setView('qualified');
      return;
    }
    progressChat(step + 1);
  };

  const progressChat = (nextIdx: number) => {
    if (nextIdx < CHAT_FLOW.length) {
      setIsTyping(true);
      setTimeout(() => {
        setStep(nextIdx);
        setHistory(prev => [...prev, { role: 'bot', content: CHAT_FLOW[nextIdx].text, id: CHAT_FLOW[nextIdx].id }]);
        setIsTyping(false);
      }, 800);
    }
  };

  const startIntakeFlow = () => {
    if (step >= 8) { setView('chat'); return; }
    setView('chat');
    const nextIdx = 8;
    setIsTyping(true);
    setTimeout(() => {
      setStep(nextIdx);
      setHistory(prev => [...prev, 
        { role: 'divider', content: 'Combined Medical Intake Started', type: 'intake' },
        { role: 'bot', content: CHAT_FLOW[nextIdx].text, id: CHAT_FLOW[nextIdx].id }
      ]);
      setIsTyping(false);
    }, 600);
  };

  const runLoadingSequence = () => {
    const sequence = [
      "Initializing Neural Synthesis...",
      "Synchronizing Biological Markers...",
      "Optimizing Protocol Synergy...",
      "Calibrating Delivery Vector...",
      "Finalizing Protocol Briefing..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLoadingText(sequence[i]);
      i++;
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => setView('results'), 500);
      }
    }, 1000);
  };

  const getProtocol = () => {
    const hormonal = formData.gender === 'Female' ? 'Estradiol Support' : (formData.fertility?.includes('Yes') ? 'Enclomiphene' : 'Injectable TRT');
    return { hormonal, longevity: formData.goal?.includes('Energy') ? 'NAD+ Injection' : 'Sermorelin Injection' };
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] text-[#0F172A] font-sans antialiased overflow-hidden">
      <nav className="px-4 md:px-6 py-4 bg-white/80 backdrop-blur-md border-b flex items-center justify-between z-50">
        <div className="relative h-6 w-24 md:w-32">
          <Image src="/EnhancedLogo-Combination-black.png" alt="Enhanced" fill className="object-contain object-left" priority />
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
            <AnimatePresence>
                {(step >= 8 || view === 'results' || view === 'qualified') && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-sm">
                        <button onClick={() => setView('chat')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-[9px] font-black uppercase tracking-tight ${view === 'chat' ? 'bg-white shadow-sm text-[#0033FF]' : 'text-slate-500'}`}><Activity size={10} /> Chat</button>
                        <button onClick={() => setView('results')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-[9px] font-black uppercase tracking-tight ${view === 'results' ? 'bg-white shadow-sm text-[#0033FF]' : 'text-slate-500'}`}><LayoutDashboard size={10} /> Protocol</button>
                        {(view === 'qualified' || isSubmitted) && (
                            <button onClick={() => setView('qualified')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-[9px] font-black uppercase tracking-tight ${view === 'qualified' ? 'bg-white shadow-sm text-[#0033FF]' : 'text-slate-500'}`}><ListChecks size={10} /> Steps</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </nav>

      <div className="w-full h-1 bg-slate-50 relative z-50">
        <motion.div className="h-full bg-[#0033FF]" animate={{ width: isSubmitted ? '100%' : `${((step + 1) / CHAT_FLOW.length) * 100}%` }} />
      </div>

      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-10 relative scroll-smooth">
        <div className="max-w-xl mx-auto space-y-12 pb-[40vh]">
          
          <div ref={heroRef} className="py-8 border-b border-slate-100 mb-8">
            <h1 className="text-6xl font-black mb-4 tracking-tighter leading-[0.85] uppercase text-[#0F172A]">Live <br/><span className="text-[#0033FF]">Enhanced</span></h1>
            <p className="text-xl text-[#64748B] font-medium max-w-sm leading-relaxed text-balance">Precision protocols for high-performance biology.</p>
          </div>

          <AnimatePresence mode="popLayout">
            {view === 'chat' && history.map((msg, i) => {
              if (msg.role === 'divider') {
                return (
                  <motion.div key={`divider-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4 w-full">
                      <div className="h-px bg-slate-200 flex-1" />
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#0033FF]/5 rounded-full border border-[#0033FF]/10">
                        <ShieldCheck className="text-[#0033FF]" size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0033FF]">{msg.content}</span>
                      </div>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>
                  </motion.div>
                );
              }
              return (
                <motion.div key={`msg-${i}`} ref={i === history.length - 1 ? activeMessageRef : null} variants={messageVariants} initial="initial" animate="animate" className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-5 rounded-3xl max-w-[85%] text-base font-semibold shadow-sm ${msg.role === 'user' ? 'bg-[#0033FF] text-white' : 'bg-white border border-slate-100 text-[#0F172A]'}`}>{msg.content}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isTyping && <div className="flex gap-1.5 p-4 bg-white border border-slate-100 rounded-2xl w-16"><span className="w-1.5 h-1.5 bg-[#0033FF] rounded-full animate-bounce" /></div>}

          {view === 'results' && (
            <motion.div variants={messageVariants} initial="initial" animate="animate" className="space-y-8">
              <div className="space-y-2"><h1 className="text-5xl font-black uppercase tracking-tighter text-[#0F172A]">Protocol Synthesis<span className="text-[#0033FF]"> Complete</span></h1></div>
              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/5">
                <div className="aspect-video bg-black relative"><video ref={videoRef} src="/clinical-video.mp4" loop playsInline className="w-full h-full object-cover" /><div className="absolute bottom-6 left-8 right-8 flex items-center justify-between"><button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white">{isMuted ? <VolumeX size={16}/> : <Volume2 size={16}/>}</button></div></div>
                <div className="p-8 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100"><Shield className="text-[#0033FF]" size={22} /><div><p className="text-[10px] font-black uppercase text-[#0033FF]">Part A</p><p className="text-base font-black text-[#0F172A]">{getProtocol().hormonal}</p></div></div>
                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100"><Zap className="text-[#0033FF]" size={22} /><div><p className="text-[10px] font-black uppercase text-[#0033FF]">Part B</p><p className="text-base font-black text-[#0F172A]">{getProtocol().longevity}</p></div></div>
                  </div>
                  <button onClick={startIntakeFlow} className="w-full py-6 bg-[#0033FF] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">{isSubmitted ? "Return to Clinical Chat" : "Start Combined Intake"}</button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'qualified' && (
            <motion.div variants={messageVariants} initial="initial" animate="animate" className="space-y-8 pb-10">
              <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[3rem] text-center space-y-10 shadow-sm">
                <div className="w-20 h-20 bg-[#0033FF] rounded-full flex items-center justify-center mx-auto shadow-xl"><ClipboardCheck className="text-white" size={36} /></div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-[#0F172A]">Pre-Qualified</h2>
                    <p className="text-slate-500 font-medium">Your physiological profile meets protocol standards.</p>
                </div>
                
                <div className="space-y-3 text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Clinical Sequence</p>
                  <div className="flex gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]">01</div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight">Clinical Blood Analysis</p>
                        <p className="text-xs text-slate-500 mt-1">Visit any LabCorp facility nationwide for biological verification.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 opacity-60">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]">02</div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight">Physician Consultation</p>
                        <p className="text-xs text-slate-500 mt-1">Review results with our medical team via secure telehealth.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 opacity-60">
                    <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-black text-[10px]">03</div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight">Protocol Deployment</p>
                        <p className="text-xs text-slate-500 mt-1">Receive customized pharmaceutical support at your door.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button className="w-full py-6 bg-[#0F172A] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                        Schedule Blood Analysis <ArrowRight size={20} />
                    </button>
                    <button onClick={() => setView('chat')} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#0033FF] py-2 transition-colors">
                        Review Intake Responses
                    </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Dramatic Synthesis Overlay */}
      <AnimatePresence>
      {view === 'loading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white z-[60] flex flex-col items-center justify-center px-8">
            <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-[#0033FF] rounded-full" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-t-2 border-[#0033FF] rounded-full" />
                <Beaker className="text-[#0033FF] relative z-10" size={48} />
            </div>
            <div className="text-center space-y-3">
                <AnimatePresence mode="wait">
                    <motion.h2 key={loadingText} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xl font-black uppercase tracking-tighter text-[#0F172A]">{loadingText}</motion.h2>
                </AnimatePresence>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Biometric Synthesis Active</p>
            </div>
        </motion.div>
      )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-40">
        <div className="max-w-xl mx-auto">
          {view === 'chat' && step < CHAT_FLOW.length && !isSubmitted ? (
            <div className="space-y-4">
              {CHAT_FLOW[step].type === 'state_select' ? (
                <div className="relative">
                  <button onClick={() => setIsStateOpen(!isStateOpen)} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs font-black uppercase tracking-widest">{formData.state || "Search All 50 States"} <ChevronDown size={16} /></button>
                  <AnimatePresence>{isStateOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full mb-4 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-[100]"><div className="p-4 border-b border-slate-100 flex items-center gap-3"><Search size={16} className="text-slate-400" /><input autoFocus type="text" placeholder="Search state..." className="flex-1 outline-none text-xs font-bold" value={stateSearch} onChange={(e) => setStateSearch(e.target.value)} /></div><div className="max-h-60 overflow-y-auto">{US_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())).map(s => (<button key={s} onClick={() => handleSubmission(s)} className="w-full p-4 text-left text-xs font-bold hover:bg-slate-50 border-b border-slate-50">{s}</button>))}</div></motion.div>)}</AnimatePresence>
                </div>
              ) : CHAT_FLOW[step].type === 'choice' ? (
                <div className="grid grid-cols-1 gap-2">{CHAT_FLOW[step].options?.map(opt => (<button key={opt} onClick={() => handleSubmission(opt)} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-widest hover:border-[#0033FF] transition-all flex justify-between items-center group">{opt} <ChevronRight size={14} /></button>))}</div>
              ) : (
                <div className="relative"><input autoFocus type={CHAT_FLOW[step].type} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmission(inputValue)} placeholder="Provide details..." className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#0033FF] font-semibold" /><button onClick={() => handleSubmission(inputValue)} className="absolute right-3 top-3 p-2.5 bg-[#0033FF] text-white rounded-xl shadow-lg"><Send size={20} /></button></div>
              )}
            </div>
          ) : (
             <div className="text-center py-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase text-slate-300 tracking-widest">
                <Lock size={12} /> {isSubmitted ? "Intake Registry Locked" : "HIPAA Secure Session"}
             </div>
          )}
        </div>
      </footer>
    </div>
  );
}