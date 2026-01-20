"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Check, ShieldCheck, ChevronLeft, ArrowRight, ChevronDown } from 'lucide-react';

const PRIMARY_COLOR = '#0033FF';

// --- Formatters ---
const formatPhoneNumber = (v: string) => {
  const n = v.replace(/\D/g, '');
  if (n.length < 4) return n;
  if (n.length < 7) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
};

const formatDOB = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 8);
  if (n.length >= 5) return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4, 8)}`;
  if (n.length >= 3) return `${n.slice(0, 2)}/${n.slice(2, 4)}`;
  return n;
};

const QUESTIONS = [
  { id: 'accuracy', key: 'accuracy_agreed', text: "It is important to note that clinicians can only make decisions based on the information provided to them. To that end, it is critical that the details provided and questions answered are complete and accurate. Do you agree to answer all questions completely and accurately?", type: 'choice', options: ['Yes', 'No'], category: 'legal' },
  { id: 'age', key: 'is_18', text: "I am at least 18 years old.", type: 'choice', options: ['I Agree', 'I do not agree'], category: 'legal' },
  { id: 'legal_docs', key: 'consents', text: "Please acknowledge that you have read, understood, and agreed to the Terms of Use, Privacy Policy, OpenLoop Telehealth consent, and the Release of Information form.", type: 'choice', options: ['I acknowledge and agree'], category: 'legal' },
  { id: 'fname', key: 'first_name', text: "What is your legal first name?", type: 'text' },
  { id: 'lname', key: 'last_name', text: "What is your legal last name?", type: 'text' },
  { id: 'pname', key: 'pref_name', text: "What is your preferred first name?", type: 'text' },
  { id: 'email', key: 'email', text: "What is your email address?", type: 'email' },
  { id: 'phone', key: 'phone', text: "What is your phone number?", type: 'tel' },
  { id: 'sms', key: 'sms_opt_in', text: "Do you agree to receive text messages regarding your services? (Msg/data rates apply).", type: 'choice', options: ['I Agree', 'Skip'], category: 'legal' },
  { id: 'dob', key: 'dob', text: "What is your date of birth?", type: 'text', placeholder: 'MM/DD/YYYY' },
  { id: 'sex', key: 'sex_at_birth', text: "Sex Assigned at Birth", type: 'dropdown', options: ['Male', 'Female'] },
  { id: 'height', key: 'height', text: "What is your height?", type: 'height' },
  { id: 'weight', key: 'weight', text: "What is your current weight (lb)?", type: 'number' },
  { id: 'alcohol', key: 'alcohol_days', text: "How many days a week do you drink?", type: 'number' },
  { id: 'allergies', key: 'allergies', text: "Do you have any of the following allergies or sensitivities?", type: 'multiple', options: ['None of the above', 'NAD', 'Sermorelin', 'Vitamin B12', 'Methionine', 'Inositol', 'Choline', 'Methylene blue', 'Thiazine dye', 'Glutathione', 'L-carnitine'] },
  { id: 'situations', key: 'medical_conditions', text: "Do any of the following situations apply to you?", type: 'multiple', options: ['None of the above', 'G6PD deficiency', 'Seizure disorder', 'Asthma or COPD', 'Serotonergic meds (last 6 months)', 'Pregnant or breastfeeding', 'History of cancer', 'No health check-up in 3 years'] },
];

export default function PinnedContextChat() {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<any[]>([{ role: 'bot', content: QUESTIONS[0].text, category: QUESTIONS[0].category }]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const activeQuestionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentQ = QUESTIONS[step];

  // logic for anchoring and handling keyboard resize
  useEffect(() => {
    const scrollToActive = () => {
      if (activeQuestionRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const target = activeQuestionRef.current;
        const targetTop = target.offsetTop;
        
        container.scrollTo({
          top: targetTop - 60, // Smaller offset to keep context visible above keyboard
          behavior: 'smooth'
        });
      }
    };

    const timer = setTimeout(scrollToActive, 300);
    // Listen for resize events (common when keyboard toggles)
    window.addEventListener('resize', scrollToActive);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', scrollToActive);
    };
  }, [step, isTyping, history.length, selectedMulti]);

  const submitAnswer = (value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    
    // Validation for key legal gates
    if ((currentQ.id === 'accuracy' || currentQ.id === 'age') && (value === 'No' || value === 'I do not agree')) {
        alert("Agreement is required to proceed.");
        return;
    }

    const nextStep = step + 1;
    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    
    setFormData(prev => ({ ...prev, [currentQ.key]: value }));
    setHistory(prev => [...prev, { role: 'user', content: displayValue }]);
    setInputValue('');
    setHeightFt('');
    setHeightIn('');
    setSelectedMulti([]);

    if (nextStep < QUESTIONS.length) {
      setIsTyping(true);
      setTimeout(() => {
        setStep(nextStep);
        setHistory(prev => [...prev, { role: 'bot', content: QUESTIONS[nextStep].text, category: QUESTIONS[nextStep].category }]);
        setIsTyping(false);
      }, 700);
    } else {
      setStep(nextStep);
      setTimeout(() => {
        setHistory(prev => [...prev, { role: 'bot', content: "Intake Complete. Our team will review your file." }]);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FDFDFF] font-sans antialiased overflow-hidden">
      {/* Navbar */}
      <nav className="px-6 py-4 bg-white border-b flex items-center justify-between z-50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative h-6 w-32">
            <Image src="/EnhancedLogo-Combination-black.png" alt="Logo" fill className="object-contain object-left" priority />
          </div>
        </div>
        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#0033FF]" 
            animate={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} 
          />
        </div>
      </nav>

      {/* Main Chat Area */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 scroll-smooth">
        <div className="max-w-xl mx-auto pt-8 pb-[70vh]">
          <AnimatePresence mode="popLayout">
            {history.map((msg, i) => {
              const isLatestBot = i === history.length - 1 && msg.role === 'bot';
              return (
                <motion.div 
                  key={i} 
                  ref={isLatestBot ? activeQuestionRef : null}
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-8`}
                >
                  <div className={`p-4 md:p-5 rounded-2xl max-w-[85%] text-base font-medium shadow-sm border ${
                    msg.role === 'user' ? 'bg-[#0033FF] text-white border-transparent' : 'bg-white text-slate-700 border-slate-100'
                  }`}>
                    {msg.role === 'bot' && msg.category === 'legal' && (
                        <div className="text-[10px] font-black uppercase text-[#0033FF] mb-1 tracking-widest">
                            Security Notice
                        </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isTyping && (
            <div className="flex space-x-1 ml-2 mb-8">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </main>

      {/* Input / Footer Area */}
      <footer className="bg-white border-t px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10 z-40 flex-shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="max-w-xl mx-auto">
          {step < QUESTIONS.length ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Specialized Height Input */}
              {currentQ.type === 'height' ? (
                <div className="flex gap-3 items-center">
                  <div className="flex-1 bg-slate-50 rounded-2xl p-3 border-2 border-slate-200 focus-within:ring-2 focus-within:ring-[#0033FF]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Feet</label>
                    <input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none text-lg font-medium text-slate-900" placeholder="5" />
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl p-3 border-2 border-slate-200 focus-within:ring-2 focus-within:ring-[#0033FF]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inches</label>
                    <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none text-lg font-medium text-slate-900" placeholder="10" />
                  </div>
                  <button onClick={() => submitAnswer(`${heightFt}'${heightIn}"`)} className="h-14 w-14 bg-[#0033FF] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><ArrowRight size={24}/></button>
                </div>
              ) : currentQ.type === 'multiple' ? (
                <div className="space-y-3">
                    <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1 mask-gradient">
                      {currentQ.options?.map(opt => (
                        <button 
                          key={opt} 
                          onClick={() => {
                            if (opt === 'None of the above') setSelectedMulti(['None of the above']);
                            else setSelectedMulti(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev.filter(x => x !== 'None of the above'), opt]);
                          }} 
                          className={`w-full p-4 rounded-xl border-2 text-left text-sm font-black transition-all flex justify-between items-center active:scale-[0.98] ${
                            selectedMulti.includes(opt) ? 'border-[#0033FF] bg-blue-50 text-[#0033FF]' : 'border-slate-200 bg-slate-50 text-slate-800'
                          }`}
                        >
                          {opt}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedMulti.includes(opt) ? 'bg-[#0033FF] border-[#0033FF] text-white' : 'border-slate-300'}`}>
                            {selectedMulti.includes(opt) && <Check size={12} strokeWidth={4}/>}
                          </div>
                        </button>
                      ))}
                    </div>
                  <button onClick={() => submitAnswer(selectedMulti)} className="w-full p-4 bg-[#0033FF] text-white rounded-xl font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-transform">Confirm Selection</button>
                </div>
              ) : currentQ.type === 'choice' || currentQ.type === 'dropdown' ? (
                <div className="grid grid-cols-1 gap-2">
                  {currentQ.options?.map(opt => (
                    <button 
                      key={opt} onClick={() => submitAnswer(opt)} 
                      className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-black flex justify-between items-center group transition-all uppercase text-xs tracking-widest active:bg-[#0033FF] active:text-white"
                    >
                      {opt} <ArrowRight size={16} className="text-[#0033FF] group-active:text-white opacity-60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    autoFocus 
                    value={inputValue}
                    type={currentQ.id === 'phone' ? 'tel' : currentQ.id === 'email' ? 'email' : 'text'}
                    onChange={(e) => setInputValue(currentQ.id === 'phone' ? formatPhoneNumber(e.target.value) : currentQ.id === 'dob' ? formatDOB(e.target.value) : e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer(inputValue)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#0033FF] text-slate-900 font-medium text-base placeholder:text-slate-400 appearance-none"
                    placeholder={currentQ.placeholder || "Type here..."}
                  />
                  <button onClick={() => submitAnswer(inputValue)} className="absolute right-2 top-2 p-2.5 bg-[#0033FF] text-white rounded-xl shadow-md active:scale-90 transition-all"><Send size={20}/></button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 font-black text-[#0033FF] uppercase tracking-widest">Intake Complete</div>
          )}
        </div>
      </footer>

      {/* Global CSS for Mobile Experience */}
      <style jsx global>{`
        /* 1. Prevent iOS Auto-Zoom */
        input, select, textarea {
          font-size: 16px !important;
        }
        
        /* 2. Custom Scrollbar for desktop, hide for mobile if preferred */
        ::-webkit-scrollbar {
          width: 0px;
        }

        /* 3. Gradient mask for scroll areas */
        .mask-gradient {
          mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, black 85%, transparent 100%);
        }

        /* 4. Improve focus state on iOS */
        input:focus {
            background-color: #ffffff;
        }
      `}</style>
    </div>
  );
}