/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import * as XLSX from 'xlsx';
import { 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  User, 
  ChevronDown, 
  Upload, 
  Image as ImageIcon, 
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const NICHES = [
  "Tech & Gadgets",
  "Lifestyle & Vlogs",
  "Education & Tutorials",
  "Gaming",
  "Business & Finance",
  "Health & Fitness",
  "Food & Cooking",
  "Travel",
  "Entertainment"
];

const STYLES = [
  "Engaging & Conversational",
  "Professional & Formal",
  "Funny & Humorous",
  "Dramatic & Storytelling",
  "Minimalist & Direct",
  "Hype & High Energy"
];

const PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube Shorts"
];

const AUDIENCES = [
  "Gen Z",
  "Millennials",
  "Parents",
  "Professionals",
  "Students",
  "General Public",
  "Small Business Owners"
];

interface SavedScript {
  id: string;
  niche: string;
  style: string;
  platform: string;
  audience: string;
  prompt: string;
  content: string;
  timestamp: number;
}

export default function App() {
  const [niche, setNiche] = useState(NICHES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [scriptsHistory, setScriptsHistory] = useState<SavedScript[]>(() => {
    const saved = localStorage.getItem('scriptgen_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = (content: string) => {
    const newScript: SavedScript = {
      id: Math.random().toString(36).substr(2, 9),
      niche,
      style,
      platform,
      audience,
      prompt: prompt || "Image-based prompt",
      content,
      timestamp: Date.now()
    };
    const updatedHistory = [newScript, ...scriptsHistory];
    setScriptsHistory(updatedHistory);
    localStorage.setItem('scriptgen_history', JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (id: string) => {
    const updatedHistory = scriptsHistory.filter(s => s.id !== id);
    setScriptsHistory(updatedHistory);
    localStorage.setItem('scriptgen_history', JSON.stringify(updatedHistory));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateScript = async () => {
    if (!prompt && !image) return;
    
    setIsGenerating(true);
    setGeneratedScript("");
    
    try {
      const model = "gemini-3-flash-preview";
      const systemInstruction = `You are an expert social media content creator and scriptwriter. 
      Your task is to generate a viral content script based on the user's niche, style, platform, target audience, and provided materials (text or image).
      The script should be optimized for the specific platform's format and audience preferences.
      
      The script should include:
      1. A strong hook (first 3 seconds).
      2. Engaging body content.
      3. A clear call to action (CTA).
      4. Visual cues or camera direction in brackets [like this].
      
      Format the output clearly with sections.`;

      const contents: any[] = [];
      
      let promptText = `Platform: ${platform}\nNiche: ${niche}\nStyle: ${style}\nTarget Audience: ${audience}\n\nUser Idea/Prompt: ${prompt}`;
      
      if (image) {
        const base64Data = image.split(',')[1];
        contents.push({
          parts: [
            { text: promptText },
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
          ]
        });
      } else {
        contents.push({
          parts: [{ text: promptText }]
        });
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.8,
        }
      });

      const script = response.text || "Failed to generate script.";
      setGeneratedScript(script);
      if (response.text) {
        saveToHistory(script);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setGeneratedScript("Sorry, something went wrong while generating your script. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsExcel = (script: SavedScript | { platform: string, niche: string, style: string, audience: string, prompt: string, content: string, timestamp: number }) => {
    const data = [
      {
        "Date Created": new Date(script.timestamp).toLocaleString(),
        "Platform": script.platform,
        "Niche": script.niche,
        "Style": script.style,
        "Target Audience": script.audience,
        "Initial Prompt": script.prompt,
        "Script Content": script.content,
        "Status": "Draft",
        "Publish Date": "",
        "Notes": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Content Planner");
    
    // Set column widths for better readability
    const wscols = [
      { wch: 20 }, // Date
      { wch: 15 }, // Platform
      { wch: 15 }, // Niche
      { wch: 15 }, // Style
      { wch: 20 }, // Audience
      { wch: 30 }, // Prompt
      { wch: 100 }, // Content
      { wch: 10 }, // Status
      { wch: 15 }, // Publish Date
      { wch: 30 }  // Notes
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Content_Planner_${script.platform}_${new Date().getTime()}.xlsx`);
  };

  const downloadHistoryAsExcel = () => {
    if (scriptsHistory.length === 0) return;
    
    const data = scriptsHistory.map(script => ({
      "Date Created": new Date(script.timestamp).toLocaleString(),
      "Platform": script.platform,
      "Niche": script.niche,
      "Style": script.style,
      "Target Audience": script.audience,
      "Initial Prompt": script.prompt,
      "Script Content": script.content,
      "Status": "Draft",
      "Publish Date": "",
      "Notes": ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Full Content Planner");
    
    const wscols = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, 
      { wch: 30 }, { wch: 100 }, { wch: 10 }, { wch: 15 }, { wch: 30 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Full_Content_Planner_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/10">
        <nav className="grid grid-cols-3 items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight">ScriptGen AI</span>
          </div>
          
          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-white/70">
            <button 
              onClick={() => setShowHistory(false)}
              className={`hover:text-white transition-colors flex items-center gap-2 ${!showHistory ? 'text-white' : ''}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className={`hover:text-white transition-colors flex items-center gap-2 ${showHistory ? 'text-white' : ''}`}
            >
              <FileText size={18} /> My Scripts
            </button>
          </div>

          <div className="flex justify-end" />
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-12 pb-24">
        {!showHistory ? (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
            >
              {/* Background Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-3xl -mr-32 -mt-32 rounded-full" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-3xl -ml-32 -mb-32 rounded-full" />

              <div className="relative z-10 text-center mb-12">
                <h1 className="text-3xl md:text-5xl font-display font-extrabold mb-4 tracking-tight uppercase">
                  Generate Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">Viral</span> Content Script
                </h1>
                <p className="text-white/60 text-lg font-medium">Simple. Futuristic. AI-Powered.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Platform Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    📱 Select Platform
                  </label>
                  <div className="relative">
                    <select 
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full appearance-none glass bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                    >
                      {PLATFORMS.map(p => <option key={p} value={p} className="bg-[#1e293b]">{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Niche Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    🚀 Select Your Niche
                  </label>
                  <div className="relative">
                    <select 
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      className="w-full appearance-none glass bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all cursor-pointer"
                    >
                      {NICHES.map(n => <option key={n} value={n} className="bg-[#1e293b]">{n}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Style Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    💡 Select Content Style
                  </label>
                  <div className="relative">
                    <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="w-full appearance-none glass bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
                    >
                      {STYLES.map(s => <option key={s} value={s} className="bg-[#1e293b]">{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                  </div>
                </div>

                {/* Audience Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                    👥 Target Audience
                  </label>
                  <div className="relative">
                    <select 
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full appearance-none glass bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
                    >
                      {AUDIENCES.map(a => <option key={a} value={a} className="bg-[#1e293b]">{a}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-10">
                {/* Prompt Area */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50">
                    Sumber Materi (Teks atau Foto)
                  </label>
                  <textarea 
                    placeholder='Tulis prompt atau ide konten Anda di sini.... (Contoh: "Bahaya radiasi blue light dari gadget")'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-40 glass bg-white/5 border-white/10 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none placeholder:text-white/20"
                  />
                </div>

                {/* Upload Area */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/50">
                    Unggah Foto
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-40 glass bg-white/5 border-2 border-dashed ${image ? 'border-pink-500/50' : 'border-white/10'} rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all group overflow-hidden relative`}
                  >
                    {image ? (
                      <>
                        <img src={image} alt="Preview" className="w-full h-full object-cover opacity-40" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <RefreshCw className="text-white mb-2 group-hover:rotate-180 transition-transform duration-500" size={24} />
                          <span className="text-xs font-bold uppercase tracking-wider">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-3">
                          <Upload className="text-white/40 group-hover:text-pink-400 transition-colors" size={24} />
                          <ImageIcon className="text-white/40 group-hover:text-purple-400 transition-colors" size={24} />
                        </div>
                        <span className="text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors">Seret foto atau klik untuk unggah</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6">
                <button 
                  onClick={generateScript}
                  disabled={isGenerating || (!prompt && !image)}
                  className="gradient-button w-full md:w-auto px-12 py-4 rounded-full font-display font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
                      GENERATE SCRIPT
                    </>
                  )}
                </button>
                
                <p className="text-white/40 text-sm font-medium italic">
                  {isGenerating ? "AI is thinking... Please wait." : "AI is thinking... Script will appear here."}
                </p>
              </div>
            </motion.div>

            {/* Result Area */}
            <AnimatePresence>
              {generatedScript && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-12 glass rounded-[2rem] p-8 md:p-10 relative"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold flex items-center gap-2">
                      <FileText className="text-pink-400" /> Generated Script
                    </h2>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => downloadAsExcel({
                          platform,
                          niche,
                          style,
                          audience,
                          prompt: prompt || "Image-based prompt",
                          content: generatedScript,
                          timestamp: Date.now()
                        })}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors text-blue-400"
                      >
                        <Download size={16} />
                        Download Excel Planner
                      </button>
                      <button 
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        {copied ? "Copied!" : "Copy Script"}
                      </button>
                    </div>
                  </div>
                  
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-white/80 leading-relaxed font-medium">
                      {generatedScript}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-display font-bold tracking-tight">My Generated Scripts</h1>
              <div className="flex items-center gap-4">
                {scriptsHistory.length > 0 && (
                  <button 
                    onClick={downloadHistoryAsExcel}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 px-4 py-2 rounded-full transition-colors"
                  >
                    <Download size={16} />
                    Download All (Excel)
                  </button>
                )}
                <button 
                  onClick={() => setShowHistory(false)}
                  className="text-sm font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {scriptsHistory.length === 0 ? (
              <div className="glass rounded-[2rem] p-20 text-center">
                <FileText size={64} className="mx-auto text-white/10 mb-6" />
                <p className="text-white/40 text-lg font-medium">You haven't generated any scripts yet.</p>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="mt-6 text-pink-400 font-bold uppercase tracking-widest text-sm hover:underline"
                >
                  Start Creating Now
                </button>
              </div>
            ) : (
              <div className="grid gap-6">
                {scriptsHistory.map((script) => (
                  <motion.div 
                    key={script.id}
                    layout
                    className="glass rounded-3xl p-6 md:p-8 group relative"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-[10px] font-bold uppercase tracking-wider">
                            {script.niche}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                            {script.style}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white/90 line-clamp-1">{script.prompt}</h3>
                        <p className="text-xs text-white/30 font-medium mt-1">
                          {new Date(script.timestamp).toLocaleDateString()} at {new Date(script.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => downloadAsExcel(script)}
                          className="p-3 rounded-xl bg-white/5 hover:bg-blue-500/20 text-white/60 hover:text-blue-400 transition-all"
                          title="Download Excel Planner"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(script.content);
                            alert("Script copied to clipboard!");
                          }}
                          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                          title="Copy Script"
                        >
                          <Copy size={18} />
                        </button>
                        <button 
                          onClick={() => deleteFromHistory(script.id)}
                          className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
                          title="Delete Script"
                        >
                          <RefreshCw className="rotate-45" size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 max-h-48 overflow-y-auto text-sm text-white/60 leading-relaxed whitespace-pre-wrap font-medium border border-white/5">
                      {script.content}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer / Background Illustration Placeholder */}
      <div className="fixed bottom-0 left-0 w-full h-1/2 -z-10 opacity-20 pointer-events-none">
        {/* We can't easily replicate the complex illustration, but we can add some floating shapes */}
        <div className="absolute bottom-10 left-10 w-32 h-32 border-2 border-pink-500/30 rounded-3xl rotate-12 animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 border-2 border-purple-500/30 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-blue-500/10 blur-xl rounded-full" />
      </div>
    </div>
  );
}
