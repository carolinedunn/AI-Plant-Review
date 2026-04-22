/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Settings, 
  Droplets, 
  Camera, 
  AlertCircle, 
  CheckCircle2, 
  Activity, 
  RefreshCcw,
  Thermometer,
  CloudRain,
  BrainCircuit,
  Zap,
  Leaf
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Constants for health mapping
const MOISTURE_THRESHOLDS = {
  CRITICAL_LOW: 20,
  OPTIMAL_MIN: 40,
  OPTIMAL_MAX: 70,
  CRITICAL_HIGH: 90
};

interface SensorReading {
  timestamp: number;
  moisture: number;
}

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteImage, setRemoteImage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const lastAnalyzedRef = useRef<number | null>(null);

  const fetchLatestImage = async () => {
    try {
      const res = await fetch('/api/latest-image');
      if (res.ok) {
        const data = await res.json();
        setRemoteImage(data.image);
        setLastUpdated(data.timestamp);
      }
    } catch (err) {
      // Background fetch failure is fine
    }
  };

  useEffect(() => {
    fetchLatestImage();
    const interval = setInterval(fetchLatestImage, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const analyzePlant = async (image: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              data: image,
              mimeType: "image/jpeg",
            },
          },
          {
            text: `You are an expert botanist. Analyze this plant from the snapshot provided by the IoT station. 
            Assess overall health (leaf color, texture, shape). 
            Provide a health score from 0 to 100 where 100 is perfectly healthy.
            Format your response as a JSON object with two keys: "score" (number) and "analysis" (markdown string).
            Identify the plant if possible. Focus strictly on visual health assessment and identifying pests/disease. Do NOT provide care advice.`,
          },
        ],
      });

      const text = response.text || "";
      try {
        // Find JSON block if Gemini adds markers
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        setHealthScore(data.score);
        setAiReport(data.analysis);
      } catch (e) {
        setAiReport(text); // Fallback to raw text
        setHealthScore(null);
      }
    } catch (err: any) {
      setError(err.message || "AI Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when image timestamp changes
  useEffect(() => {
    if (remoteImage && lastUpdated && lastUpdated !== lastAnalyzedRef.current) {
      lastAnalyzedRef.current = lastUpdated;
      analyzePlant(remoteImage);
    }
  }, [remoteImage, lastUpdated]);

  return (
    <div className="min-h-screen bg-[#050a08] text-white font-sans selection:bg-accent-green selection:text-black flex flex-col p-6 md:p-10 overflow-y-auto">
      {/* Top Navigation / Status Header */}
      <header className="relative z-10 flex justify-between items-start mb-8 w-full shrink-0 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3">
          <Leaf className="text-accent-green" size={24} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-md">
              AI Plant Review
            </h1>
            <p className="text-[11px] text-accent-green font-mono uppercase tracking-[2px] mt-0.5">
              {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Awaiting Uplink...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-accent-green/5 border border-accent-green/20 rounded-full text-[10px] uppercase tracking-wider text-accent-green">
            <div className={`w-1.5 h-1.5 bg-accent-green rounded-full ${isAnalyzing ? 'animate-ping' : 'animate-pulse'} shadow-[0_0_8px_currentColor]`} />
            {isAnalyzing ? 'Analyzing Morphology...' : 'System Monitor Active'}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 min-h-0">
        {/* Left Column: Visual Viewport */}
        <section className="flex flex-col gap-6 min-h-0 min-w-0">
          <div className="relative flex-1 bg-black/40 rounded-[32px] border border-glass-border overflow-hidden min-h-[500px] shadow-2xl">
            {remoteImage ? (
              <img 
                src={`data:image/jpeg;base64,${remoteImage}`} 
                className="w-full h-full object-contain"
                alt="Latest Plant Snapshot"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 bg-gradient-to-br from-[#132a1d] to-[#09170f]">
                <Camera size={64} strokeWidth={1} />
                <span className="mt-4 uppercase tracking-[0.2em] text-sm font-light">Waiting for Image Uplink...</span>
              </div>
            )}
            
            {/* Visual Overlays */}
            <div className="absolute inset-0 pointer-events-none border-[20px] border-black/40" />

            {/* Overlay Metadata */}
            <div className="absolute bottom-10 left-10 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl text-[10px] font-mono text-accent-green shadow-xl">
                CAM_01 // SOURCE: R-PI_UPLINK
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Diagnostics (Sidebar) */}
        <aside className="flex flex-col gap-6">
          {/* Health Score Card */}
          <div className="glass-card">
            <p className="text-[11px] uppercase tracking-[1.5px] text-text-dim mb-4">Vitality Score</p>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={251.2}
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * (healthScore || 0)) / 100 }}
                    className="text-accent-green"
                  />
                </svg>
                <span className="absolute text-2xl font-light">{healthScore || '--'}</span>
              </div>
              <div>
                <p className={`text-sm font-medium ${healthScore && healthScore > 70 ? 'text-accent-green' : 'text-orange-400'}`}>
                  {healthScore ? (healthScore > 80 ? 'Optimal' : healthScore > 60 ? 'Stable' : 'Attention Required') : 'Pending Scan'}
                </p>
                <p className="text-[10px] text-text-dim mt-1 leading-relaxed">
                  Based on AI visual assessment of leaf density and color variance.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col min-h-[400px] lg:flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[11px] uppercase tracking-[1.5px] text-text-dim">Botanical Analysis</p>
              <Zap size={14} className={isAnalyzing ? "text-accent-green animate-pulse" : "text-accent-green opacity-30"} />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-4 bg-white/5 animate-pulse rounded w-full" style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                  </motion.div>
                ) : aiReport ? (
                  <motion.div 
                    key="report"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg prose prose-invert prose-lg text-text-dim/90 prose-p:my-4 prose-strong:text-white prose-headings:text-white prose-headings:font-light prose-headings:tracking-tight border-l-2 border-accent-green/30 pl-6 py-2"
                  >
                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-xs font-light text-white/60 leading-relaxed text-center">
                      Ready for the next uplink.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </main>

      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(74, 222, 128, 0.4); }
      `}</style>

      {/* Global Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-10 p-4 border border-alert-red bg-alert-red/10 backdrop-blur-md rounded-2xl flex items-center gap-3 text-alert-red font-medium text-xs z-50 uppercase tracking-widest shadow-2xl"
          >
            <AlertCircle size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-4 opacity-50 hover:opacity-100 px-2 leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
