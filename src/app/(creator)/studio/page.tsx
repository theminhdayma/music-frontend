"use client";

import React, { useEffect, useRef, useState } from "react";

export default function StudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("lofi");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialPrompt = new URLSearchParams(window.location.search).get(
        "prompt",
      );
      if (initialPrompt) {
        setPrompt(initialPrompt);
      }
    }
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setAudioUrl("");
    setStatusMessage("Queueing AI Remix task...");

    try {
      setStatusMessage("Synthesizing derivative remix...");

      const response = await fetch("/api/remix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          style,
          title: prompt ? prompt.slice(0, 40) : "AI Remix",
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || "Failed to generate remix");
      }

      const data = JSON.parse(responseText) as {
        audioUrl: string;
        bpm?: number;
        duration?: number;
        key?: string;
      };

      setAudioUrl(data.audioUrl);
      setStatusMessage(
        `Remix ready${data.bpm ? ` • ${data.bpm} BPM` : ""}${data.key ? ` • ${data.key}` : ""}`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to generate remix",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-1">AI Remix Studio</h1>
          <p className="text-gray-400 text-sm">
            Generate derivative tracks legally with automated royalty splits
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Controls Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">
                1. Text Prompt Description
              </h2>
              <textarea
                rows={3}
                placeholder="Make the drums faster, add deep bass distortion, synth arp overlays..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 focus:border-[#8B5CF6] focus:outline-none p-4 rounded-xl text-sm placeholder-gray-600 text-white"
              />
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">
                2. Choose Genre Style Preset
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  "lofi",
                  "dark-phonk",
                  "synthwave",
                  "techno",
                  "anime-opening",
                  "ambient",
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setStyle(preset)}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider border transition ${
                      style === preset
                        ? "bg-[#8B5CF6] text-white border-transparent"
                        : "bg-gray-950 border-gray-800 text-gray-400"
                    }`}
                  >
                    {preset.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-bold shadow-xl transition flex items-center justify-center space-x-2 ${
                isGenerating
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-[#10B981] hover:bg-[#059669] text-black shadow-emerald-500/10"
              }`}
            >
              <span>
                {isGenerating ? "GENERATING REMIX..." : "GENERATE AI REMIX"}
              </span>
              <span>⚡</span>
            </button>

            {statusMessage && (
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center text-xs font-mono text-[#8B5CF6]">
                {statusMessage}
              </div>
            )}

            {audioUrl && (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4">
                <div>
                  <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-2">
                    Generated Audio
                  </h2>
                  <p className="text-xs text-gray-400">
                    Play the generated remix below.
                  </p>
                </div>
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  src={audioUrl}
                />
                <a
                  href={audioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-semibold text-[#10B981] hover:underline"
                >
                  Open audio URL
                </a>
              </div>
            )}
          </div>

          {/* Legal / Split Rules Column */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">
                Royalty Split Invariants
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Original Creator</span>
                  <span className="font-bold text-[#10B981]">70%</span>
                </div>
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Remixer (You)</span>
                  <span className="font-bold text-[#10B981]">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Fee</span>
                  <span className="font-bold text-gray-400">10%</span>
                </div>
              </div>

              <div className="mt-6 text-xs text-gray-500 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800/40">
                ⚠️ **Legal Notice**: This derivative remix will be tracked in
                the StemVerse Ownership Graph. You cannot sell this remix
                outside the platform without creator license buyout.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
