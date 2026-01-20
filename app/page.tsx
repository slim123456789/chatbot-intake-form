"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Check, ShieldCheck, ChevronLeft, ArrowRight } from 'lucide-react';

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
  // CHAPTER 1: START
  { id: 'accuracy', key: 'accuracy_agreed', text: "It is important to note that clinicians can only make decisions based on the information provided to them. To that end, it is critical that the details provided and questions answered are complete and accurate. Do you agree to answer all questions completely and accurately?", type: 'choice', options: ['Yes', 'No'], category: 'legal' },
  { id: 'age', key: 'is_18', text: "I am at least 18 years old.", type: 'choice', options: ['I Agree', 'I do not agree'], category: 'legal' },
  { id: 'legal_docs', key: 'consents', text: "Please acknowledge that you have read, understood, and agreed to the Terms of Use, Privacy Policy, OpenLoop Telehealth consent, and the Release of Information form.", type: 'choice', options: ['I acknowledge and agree'], category: 'legal' },
  
  // CHAPTER 2: IDENTITY
  { id: 'fname', key: 'first_name', text: "What is your legal first name?", type: 'text' },
  { id: 'lname', key: 'last_name', text: "What is your legal last name?", type: 'text' },
  { id: 'pname', key: 'pref_name', text: "What is your preferred first name?", type: 'text' },
  { id: 'email', key: 'email', text: "What is your email address?", type: 'email' },
  { id: 'phone', key: 'phone', text: "What is your phone number?", type: 'tel' },
  
  // NOW CONTEXTUAL: SMS permission after phone
  { id: 'sms', key: 'sms_opt_in', text: "Do you agree to receive text messages regarding your services? (Msg/data rates apply).", type: 'choice', options: ['I Agree', 'Skip'], category: 'legal' },

  // CHAPTER 3: PHYSICALS
  { id: 'dob', key: 'dob', text: "What is your date of birth?", type: 'text', placeholder: 'MM/DD/YYYY' },
  { id: 'sex', key: 'sex_at_birth', text: "Sex Assigned at Birth", type: 'dropdown', options: ['Male', 'Female'] },
  { id: 'height', key: 'height', text: "What is your height?", type: 'height' },
  { id: 'weight', key: 'weight', text: "What is your current weight (lb)?", type: 'number' },

  // CHAPTER 4: MEDICAL
  { id: 'alcohol', key: 'alcohol_days', text: "How many days a week do you drink?", type: 'number' },
  { id: 'allergies', key: 'allergies', text: "Do you have any of the following allergies or sensitivities?", type: 'multiple', options: ['None of the above', 'NAD', 'Sermorelin', 'Vitamin B12', 'Methionine', 'Inositol', 'Choline', 'Methylene blue', 'Thiazine dye', 'Glutathione', 'L-carnitine'] },
  { id: 'situations', key: 'medical_conditions', text: "Do any of the following situations apply to you?", type: 'multiple', options: ['None of the above', 'G6PD deficiency', 'Seizure disorder', 'Asthma or COPD', 'Serotonergic meds (last 6 months)', 'Pregnant or breastfeeding', 'History of cancer', 'No health check-up in 3 years'] },
];

export default function EnhancedChat() {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<any[]>([{ role: 'bot', content: QUESTIONS[0].text, category: QUESTIONS[0].category }]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [inputValue, setInputValue] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);
  
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const currentQ = QUESTIONS[step];

  useEffect(() => {
    if (dockRef.current) setDockHeight(dockRef.current.offsetHeight);
    const timer = setTimeout(() => {
      lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [step, isTyping, selectedMulti, history.length]);

  const submitAnswer = (value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    
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
        setHistory(prev => [...prev, { 
            role: 'bot', 
            content: QUESTIONS[nextStep].text, 
            category: QUESTIONS[nextStep].category 
        }]);
        setIsTyping(false);
      }, 700);
    } else {
      setStep(nextStep);
      setTimeout(() => {
        setHistory(prev => [...prev, { 
            role: 'bot', 
            content: "Thank you. Your clinical intake is complete. Our team will review your information shortly." 
        }]);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFDFF] font-sans antialiased">
      <nav className="px-6 py-4 bg-white border-b flex items-center justify-between z-50 flex-shrink-0">
        <div className="relative h-6 w-32">
          <Image src="/EnhancedLogo-Combination-black.png" alt="Logo" fill className="object-contain object-left" />
        </div>
        <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
          <motion.div className="h-full bg-[#0033FF]" animate={{ width: `${(Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100}%` }} />
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-4 scroll-smooth">
        <div className="max-w-xl mx-auto pt-8" style={{ paddingBottom: dockHeight + 40 }}>
          <AnimatePresence mode="popLayout">
            {history.map((msg, i) => (
              <motion.div 
                key={i} 
                ref={i === history.length - 1 && msg.role === 'bot' ? lastMessageRef : null}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 scroll-mt-32`}
              >
                <div className={`p-4 md:p-5 rounded-2xl max-w-[85%] text-sm md:text-base font-medium ${
                  msg.role === 'user' ? 'bg-[#0033FF] text-white shadow-lg shadow-blue-100' : 'bg-white border border-slate-100 text-slate-700 shadow-sm'
                }`}>
                  {msg.role === 'bot' && msg.category === 'legal' && <div className="text-[10px] font-black uppercase text-[#0033FF] mb-1 tracking-widest italic">Security Notice</div>}
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <div className="flex justify-start mb-6">
              <div className="bg-slate-100 px-6 py-4 rounded-2xl flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer ref={dockRef} className="bg-white border-t p-6 md:p-10 z-40 flex-shrink-0">
        <div className="max-w-xl mx-auto">
          {step < QUESTIONS.length ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {currentQ.type === 'multiple' ? (
                <div className="space-y-3">
                  <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                    {currentQ.options?.map(opt => (
                      <button key={opt} onClick={() => {
                        if (opt === 'None of the above') setSelectedMulti(['None of the above']);
                        else setSelectedMulti(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev.filter(x => x !== 'None of the above'), opt]);
                      }} className={`w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all ${selectedMulti.includes(opt) ? 'border-[#0033FF] bg-blue-50' : 'border-slate-50 bg-white hover:border-slate-200'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => submitAnswer(selectedMulti)} className="w-full p-4 bg-[#0033FF] text-white rounded-xl font-black uppercase text-sm tracking-tight shadow-xl shadow-blue-100">Confirm Selection</button>
                </div>
              ) : currentQ.type === 'height' ? (
                <div className="flex gap-4 items-center">
                  <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 focus-within:ring-2 focus-within:ring-[#0033FF] transition-all font-sans">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Feet</label>
                    <input type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none text-xl font-medium" placeholder="5" />
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 focus-within:ring-2 focus-within:ring-[#0033FF] transition-all font-sans">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Inches</label>
                    <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className="w-full bg-transparent px-1 py-1 outline-none text-xl font-medium" placeholder="10" />
                  </div>
                  <button onClick={() => submitAnswer(`${heightFt}'${heightIn}"`)} className="h-14 w-14 bg-[#0033FF] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                    <ArrowRight size={24}/>
                  </button>
                </div>
              ) : currentQ.type === 'choice' || currentQ.type === 'dropdown' ? (
                <div className="grid grid-cols-1 gap-2">
                  {currentQ.options?.map(opt => (
                    <button key={opt} onClick={() => submitAnswer(opt)} className="p-4 rounded-xl border border-slate-100 font-black hover:border-[#0033FF] uppercase text-xs text-left flex justify-between items-center group transition-all tracking-tight">
                        {opt} <ArrowRight size={14} className="text-slate-200 group-hover:text-[#0033FF]"/>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(currentQ.id === 'phone' ? formatPhoneNumber(e.target.value) : currentQ.id === 'dob' ? formatDOB(e.target.value) : e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnswer(inputValue)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#0033FF] font-medium text-lg"
                    placeholder={currentQ.placeholder || "Type here..."}
                  />
                  <button onClick={() => submitAnswer(inputValue)} className="absolute right-3 top-3 p-2 bg-[#0033FF] text-white rounded-xl shadow-md hover:brightness-110 transition-all"><Send size={20}/></button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 font-black text-[#0033FF] uppercase tracking-widest animate-pulse">
                Intake Complete
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}