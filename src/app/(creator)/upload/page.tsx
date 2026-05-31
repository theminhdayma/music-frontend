"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import Link from "next/link";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadPage() {
  const { t } = useLanguage();
  const { data: session, status: sessionStatus } = useSession();
  
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    title: "",
    genre: "pop",
    licenseType: "remix",
  });
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Real-time AI processing status
  const [uploadedSongId, setUploadedSongId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "queued" | "processing" | "done" | "failed">("idle");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadedSongId) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${API_URL}/music`, { transports: ['websocket'] });

    socket.on('connect', () => {
      console.log('Connected to WebSocket Music gateway');
      socket.emit('subscribeToSong', { songId: uploadedSongId });
      setAiStatus('queued');
    });

    socket.on('song:status-updated', (data) => {
      console.log('Received real-time update in upload page:', data);
      if (data.status === 'done') {
        setAiStatus('done');
      } else if (data.status === 'failed') {
        setAiStatus('failed');
        setErrorMsg(data.error || 'AI separation failed. Fallbacks exhausted.');
      } else if (data.status === 'processing') {
        setAiStatus('processing');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [uploadedSongId]);

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-background text-text-primary p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background text-text-primary p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 bg-surface border border-glass-border rounded-3xl shadow-xl">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-error/20">
            <span className="material-symbols-outlined text-error text-4xl">lock</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-text-secondary text-sm mb-6">Please log in to upload music and stems.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('audio/')) {
        setErrorMsg("Please upload an audio file (.mp3, .wav, .flac)");
        return;
      }
      setFile(selectedFile);
      setMetadata(prev => ({ ...prev, title: selectedFile.name.split('.')[0] }));
      setErrorMsg("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.type.startsWith('audio/')) {
        setErrorMsg("Please upload an audio file (.mp3, .wav, .flac)");
        return;
      }
      setFile(droppedFile);
      setMetadata(prev => ({ ...prev, title: droppedFile.name.split('.')[0] }));
      setErrorMsg("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");
    setAiStatus("idle");
    setUploadedSongId(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = (session as { accessToken?: string })?.accessToken;
      
      console.log("Upload: session data is", session);
      console.log("Upload: JWT token sent is", token);
      
      const initRes = await fetch(`${API_URL}/music/upload/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: metadata.title,
          genre: metadata.genre,
          filename: file.name,
          fileSize: file.size,
          licenseType: metadata.licenseType
        })
      });
      
      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => "");
        console.error("Upload init error response from backend:", initRes.status, errText);
        throw new Error(`Failed to initialize secure upload session: ${initRes.status} ${errText}`);
      }
      const { sessionId, songId } = await initRes.json();
      
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const parts = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;
        
        const urlRes = await fetch(`${API_URL}/music/upload/${sessionId}/url?partNumber=${partNumber}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          }
        });
        if (!urlRes.ok) throw new Error(`Failed to authorize chunk ${partNumber}`);
        const { url } = await urlRes.json();
        
        const uploadChunkRes = await fetch(url, { method: 'PUT', body: chunk });
        if (!uploadChunkRes.ok) throw new Error(`Failed to upload binary chunk ${partNumber}`);
        
        const eTag = uploadChunkRes.headers.get('ETag');
        if (!eTag) throw new Error(`Cloudflare R2 did not return ETag for chunk ${partNumber}`);
        
        parts.push({ PartNumber: partNumber, ETag: eTag });
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      
      const completeRes = await fetch(`${API_URL}/music/upload/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ parts, songId })
      });
      
      if (!completeRes.ok) throw new Error("Failed to finalize upload and enqueue AI task.");
      
      setUploadedSongId(songId);
      setStatus("success");
      
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during the upload process.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-8 font-sans transition-colors duration-300">
      <div className="max-w-3xl mx-auto mt-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-hover">
            {t('upload.title')}
          </h1>
          <p className="text-text-secondary text-sm">{t('upload.drag_drop_full')}</p>
        </header>

        <div className="bg-surface border border-glass-border rounded-3xl p-8 shadow-xl relative overflow-hidden transition-colors duration-300">
          {status === "success" ? (
            <div className="py-8 space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="text-center space-y-3">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/30 shadow-lg shadow-primary/20">
                  <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold">Upload Complete!</h2>
                <p className="text-text-secondary text-sm max-w-md mx-auto">
                  Your audio file is saved in Cloudflare R2 storage. Processing AI Audio pipeline now...
                </p>
              </div>

              {/* Dynamic WebSockets Stepper */}
              <div className="max-w-md mx-auto bg-glass-bg border border-glass-border p-6 rounded-2xl space-y-6 shadow-inner">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">✓</div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">File uploaded to Cloudflare R2</p>
                    <p className="text-xs text-text-muted">Audio file successfully partitioned and synced</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    aiStatus === 'queued' ? 'bg-primary text-white dark:text-background animate-pulse' :
                    aiStatus === 'processing' || aiStatus === 'done' ? 'bg-primary/20 text-primary' : 'bg-glass-bg text-text-muted'
                  }`}>
                    {aiStatus === 'processing' || aiStatus === 'done' ? '✓' : '2'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Queueing in AI Analysis Engine</p>
                    <p className="text-xs text-text-muted">
                      {aiStatus === 'queued' ? 'Waiting for FastAPI worker...' : 'Enqueued successfully'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    aiStatus === 'processing' ? 'bg-primary text-white dark:text-background animate-pulse' :
                    aiStatus === 'done' ? 'bg-primary/20 text-primary' : 'bg-glass-bg text-text-muted'
                  }`}>
                    {aiStatus === 'done' ? '✓' : '3'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Stem Separation & Audio Analysis</p>
                    <p className="text-xs text-text-muted">
                      {aiStatus === 'processing' ? 'AI separating vocals, drums, bass, melody...' :
                       aiStatus === 'done' ? 'BPM, Key & Stems generated' : 'Waiting for previous steps'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="text-center pt-4">
                {aiStatus === 'done' && (
                  <div className="space-y-4">
                    <p className="text-success font-semibold text-sm">🎉 AI audio stem separation complete!</p>
                    <div className="flex justify-center space-x-4">
                      <Link 
                        href={`/song/${uploadedSongId}`}
                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-background font-bold rounded-xl transition shadow-lg shadow-primary/20"
                      >
                        Inspect Song & Mixer
                      </Link>
                      <button 
                        onClick={() => { setFile(null); setStatus("idle"); setProgress(0); setAiStatus("idle"); setUploadedSongId(null); }}
                        className="px-6 py-2.5 bg-glass-bg hover:bg-glass-border border border-glass-border rounded-xl font-semibold transition"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>
                )}

                {aiStatus === 'failed' && (
                  <div className="space-y-4">
                    <p className="text-error font-semibold text-sm">❌ AI Processing failed: {errorMsg}</p>
                    <button 
                      onClick={() => { setFile(null); setStatus("idle"); setProgress(0); setAiStatus("idle"); setUploadedSongId(null); }}
                      className="px-6 py-2.5 bg-error hover:bg-error/80 text-white font-bold rounded-xl transition"
                    >
                      Try Uploading Again
                    </button>
                  </div>
                )}

                {(aiStatus === 'queued' || aiStatus === 'processing') && (
                  <div className="flex items-center justify-center space-x-3 text-sm text-text-secondary">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                    <span>Processing real-time AI separation... Do not close this page.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8 relative z-10">
              {/* Drag and Drop Zone */}
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                  file ? 'border-primary bg-primary/5' : 'border-glass-border hover:border-text-muted hover:bg-glass-bg'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/mp3, audio/wav, audio/flac"
                  className="hidden" 
                />
                
                {file ? (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
                      <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zm12-3c-1.105 0-2-.895-2-2s.895-2 2-2 2 .895 2 2-.895 2-2 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold">{file.name}</p>
                    <p className="text-xs text-text-muted font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB • Audio Track</p>
                    {status !== 'uploading' && (
                      <button onClick={() => setFile(null)} className="text-xs text-error hover:opacity-80 underline mt-2 block mx-auto transition">
                        Remove File
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-glass-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-glass-border">
                      <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-text-primary font-medium">{t('upload.drag_drop_full')}</p>
                    <p className="text-text-muted text-xs font-mono">WAV, MP3, FLAC (Max 500MB)</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-6 px-6 py-2.5 bg-glass-bg hover:bg-glass-border border border-glass-border rounded-xl text-sm font-semibold transition shadow-sm"
                    >
                      Browse Local Files
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 bg-error-bg/10 border border-error-bg/20 rounded-xl text-error text-sm animate-in slide-in-from-top-2">
                  {errorMsg}
                </div>
              )}

              {/* Metadata Form */}
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{t('upload.song_title')}</label>
                  <input 
                    type="text" 
                    value={metadata.title}
                    onChange={e => setMetadata({...metadata, title: e.target.value})}
                    disabled={status === 'uploading'}
                    className="w-full bg-glass-bg border border-glass-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl p-4 text-text-primary transition disabled:opacity-50"
                    placeholder="Enter track name..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">{t('upload.genre')}</label>
                    <select 
                      value={metadata.genre}
                      onChange={e => setMetadata({...metadata, genre: e.target.value})}
                      disabled={status === 'uploading'}
                      className="w-full bg-glass-bg border border-glass-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl p-4 text-text-primary appearance-none disabled:opacity-50"
                    >
                      <option value="pop">Pop</option>
                      <option value="electronic">Electronic / EDM</option>
                      <option value="hiphop">Hip Hop / Rap</option>
                      <option value="rock">Rock / Alternative</option>
                      <option value="rnb">R&B / Soul</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">License Rights</label>
                    <select 
                      value={metadata.licenseType}
                      onChange={e => setMetadata({...metadata, licenseType: e.target.value})}
                      disabled={status === 'uploading'}
                      className="w-full bg-glass-bg border border-glass-border focus:border-primary focus:ring-1 focus:ring-primary outline-none rounded-xl p-4 text-text-primary appearance-none disabled:opacity-50"
                    >
                      <option value="remix">{t('upload.allow_remix')}</option>
                      <option value="standard">Standard Distribution</option>
                      <option value="exclusive">Exclusive Sale</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload Button & Progress */}
              <div className="pt-6 border-t border-glass-border">
                {status === 'uploading' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-mono">
                      <span className="text-text-secondary">Syncing chunks with Cloudflare R2...</span>
                      <span className="text-primary font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-glass-bg rounded-full overflow-hidden border border-glass-border shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-300 ease-out shadow-lg shadow-primary/50"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full py-4 rounded-2xl font-bold tracking-wider transition-all duration-300 flex justify-center items-center gap-3 bg-primary hover:bg-primary-hover text-white dark:text-background shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('upload.publish_btn')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
