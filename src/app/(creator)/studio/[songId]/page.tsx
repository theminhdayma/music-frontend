'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import WaveformPlayer from '@/components/player/WaveformPlayer';
import StemControlItem from '@/components/player/StemControlItem';

interface Song {
  id: string;
  title: string;
  genre?: string;
  bpm?: number;
  key?: string;
  owner?: {
    displayName?: string;
  };
  stems?: Array<{
    id: string;
    type: string;
  }>;
}

interface LicenseConfig {
  personalPrice: number;
  personalEnabled: boolean;
  commercialPrice: number;
  commercialEnabled: boolean;
  remixPrice: number;
  remixEnabled: boolean;
  exclusivePrice: number;
  exclusiveEnabled: boolean;
}

export default function SongStudioPage({ params }: { params: Promise<{ songId: string }> }) {
  const unwrappedParams = React.use(params);
  const songId = unwrappedParams.songId;
  const { data: session } = useSession();
  const router = useRouter();

  const [song, setSong] = useState<Song | null>(null);
  const [licenseConfig, setLicenseConfig] = useState<LicenseConfig | null>(null);
  const [selectedType, setSelectedType] = useState<string>('personal');
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const [stems, setStems] = useState([
    { id: 'vocals', name: 'Vocals', icon: 'mic', progress: 100, isMuted: false },
    { id: 'drums', name: 'Drums', icon: 'album', progress: 100, isMuted: false },
    { id: 'bass', name: 'Bass', icon: 'speaker', progress: 45, isMuted: false },
    { id: 'melody', name: 'Melody', icon: 'music_note', progress: 45, isMuted: false },
  ]);

  useEffect(() => {
    if (!songId) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchSongAndOptions = async () => {
      try {
        // Fetch song details
        const songRes = await fetch(`${API_URL}/music/songs/${songId}`);
        if (songRes.ok) {
          const songData = await songRes.json();
          setSong(songData);
          if (songData.stems && songData.stems.length > 0) {
            setStems(songData.stems.map((s: { id: string; type: string }) => ({
              id: s.id,
              name: s.type.charAt(0).toUpperCase() + s.type.slice(1),
              icon: s.type === 'vocal' ? 'mic' : s.type === 'drums' ? 'album' : s.type === 'bass' ? 'speaker' : 'music_note',
              progress: 100,
              isMuted: false
            })));
          }
        }

        // Fetch license configuration options
        const optionsRes = await fetch(`${API_URL}/licenses/songs/${songId}/options`);
        if (optionsRes.ok) {
          const optionsData = await optionsRes.json();
          setLicenseConfig(optionsData);
          
          // Set default selected license type based on what's enabled
          if (optionsData.personalEnabled) setSelectedType('personal');
          else if (optionsData.commercialEnabled) setSelectedType('commercial');
          else if (optionsData.remixEnabled) setSelectedType('remix');
          else if (optionsData.exclusiveEnabled) setSelectedType('exclusive');
        }
      } catch (err) {
        console.error('Error fetching studio page data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSongAndOptions();
  }, [songId]);

  const toggleMute = (id: string) => {
    setStems((prev) =>
      prev.map((stem) =>
        stem.id === id ? { ...stem, isMuted: !stem.isMuted } : stem
      )
    );
  };

  const toggleSolo = (id: string) => {
    setStems((prev) => {
      const isOnlySolo = prev.every((s) => (s.id === id ? !s.isMuted : s.isMuted));
      if (isOnlySolo) {
        return prev.map((stem) => ({ ...stem, isMuted: false }));
      }
      return prev.map((stem) => ({
        ...stem,
        isMuted: stem.id !== id,
      }));
    });
  };

  const handlePurchase = async () => {
    if (!session) {
      alert('Please log in to purchase a license.');
      return;
    }

    const token = (session as { accessToken?: string })?.accessToken;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    if (selectedType === 'personal' && licenseConfig?.personalPrice === 0) {
      setPurchaseLoading(true);
      try {
        const res = await fetch(`${API_URL}/licenses/purchase-free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ songId }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to acquire free license');
        }

        alert('Personal license acquired successfully!');
        router.push('/dashboard/licenses');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setPurchaseLoading(false);
      }
    } else {
      // Paid license -> Redirect to Stripe Checkout Form
      router.push(`/checkout/${songId}?type=${selectedType}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Hero & Stems) */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Hero Section */}
          <section className="flex flex-col md:flex-row gap-6 items-start bg-surface-container-low p-6 rounded-xl border border-outline-variant/30">
            <div className="shrink-0 w-full md:w-[200px] aspect-square rounded-xl overflow-hidden border border-outline-variant/50 relative shadow-lg">
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl opacity-50">music_note</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              <div className="absolute bottom-3 right-3 bg-surface-container-highest/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-on-surface border border-outline-variant/50">
                {song?.bpm ? `${song.bpm} BPM` : '120 BPM'}
              </div>
            </div>
            
            <div className="flex flex-col flex-grow justify-center py-2 h-full">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant text-xs font-semibold border border-outline-variant/30">
                  {song?.genre || 'Electronic'}
                </span>
                <span className="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant text-xs font-semibold border border-outline-variant/30">
                  {song?.key || 'C Major'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">
                {song?.title || 'Summer Breeze'}
              </h2>
              <a href="#" className="text-primary text-sm hover:underline mb-6 flex items-center gap-2 font-medium">
                <div className="w-6 h-6 rounded-full bg-surface-bright overflow-hidden flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">person</span>
                </div>
                {song?.owner?.displayName || 'Neon Pulse'}
              </a>
              
              <div className="mt-auto">
                <button className="bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 transition-colors text-sm font-semibold py-3 px-6 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(0,165,114,0.2)]">
                  <span className="material-symbols-outlined">launch</span>
                  Open in AI Remix Studio
                </button>
              </div>
            </div>
          </section>

          {/* Master Waveform Player */}
          <WaveformPlayer />

          {/* Stems Panel */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <h3 className="text-xl font-bold text-on-surface">Stems Control</h3>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-surface-variant text-on-surface-variant border border-outline-variant/30">
                AI Demucs Separated
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stems.map((stem) => (
                <StemControlItem
                  key={stem.id}
                  name={stem.name}
                  icon={stem.icon}
                  colorClass="text-primary"
                  progress={stem.progress}
                  isMuted={stem.isMuted}
                  onMuteToggle={() => toggleMute(stem.id)}
                  onSoloToggle={() => toggleSolo(stem.id)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column (Licenses) */}
        <div className="lg:col-span-4">
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/30 sticky top-24">
            <h3 className="text-xl font-bold text-on-surface mb-6">License Options</h3>
            <div className="flex flex-col gap-4">
              {/* Personal License */}
              {licenseConfig?.personalEnabled && (
                <label className={`group relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === 'personal' ? 'border-primary bg-primary/10' : 'border-outline-variant/50 bg-surface-container-low hover:border-primary/50'
                }`}>
                  <input 
                    className="mt-1 bg-surface-variant border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface" 
                    name="license" 
                    type="radio" 
                    checked={selectedType === 'personal'}
                    onChange={() => setSelectedType('personal')}
                  />
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-on-surface">Personal</span>
                      <span className="text-sm font-semibold text-on-surface">
                        {licenseConfig?.personalPrice === 0 ? 'FREE' : `$${((licenseConfig?.personalPrice ?? 0) / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Non-monetized use. MP3 download only.</p>
                  </div>
                </label>
              )}
              
              {/* Commercial License */}
              {licenseConfig?.commercialEnabled && (
                <label className={`group relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === 'commercial' ? 'border-primary bg-primary/10' : 'border-outline-variant/50 bg-surface-container-low hover:border-primary/50'
                }`}>
                  <input 
                    className="mt-1 bg-surface-variant border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface" 
                    name="license" 
                    type="radio"
                    checked={selectedType === 'commercial'}
                    onChange={() => setSelectedType('commercial')}
                  />
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-on-surface">
                        Commercial 
                        <span className="ml-2 text-[10px] uppercase bg-primary text-on-primary px-1.5 py-0.5 rounded">Popular</span>
                      </span>
                      <span className="text-sm font-semibold text-on-surface">${((licenseConfig?.commercialPrice ?? 0) / 100).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Up to 100k streams. WAV + Stems included.</p>
                  </div>
                </label>
              )}
              
              {/* Remix License */}
              {licenseConfig?.remixEnabled && (
                <label className={`group relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === 'remix' ? 'border-primary bg-primary/10' : 'border-outline-variant/50 bg-surface-container-low hover:border-primary/50'
                }`}>
                  <input 
                    className="mt-1 bg-surface-variant border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface" 
                    name="license" 
                    type="radio"
                    checked={selectedType === 'remix'}
                    onChange={() => setSelectedType('remix')}
                  />
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-on-surface">Remix (Native)</span>
                      <span className="text-sm font-semibold text-on-surface">${((licenseConfig?.remixPrice ?? 0) / 100).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Unlock directly in Studio. Revenue split via contract.</p>
                  </div>
                </label>
              )}

              {/* Exclusive License */}
              {licenseConfig?.exclusiveEnabled && (
                <label className={`group relative flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedType === 'exclusive' ? 'border-primary bg-primary/10' : 'border-outline-variant/50 bg-surface-container-low hover:border-primary/50'
                }`}>
                  <input 
                    className="mt-1 bg-surface-variant border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface" 
                    name="license" 
                    type="radio"
                    checked={selectedType === 'exclusive'}
                    onChange={() => setSelectedType('exclusive')}
                  />
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-on-surface">Exclusive Buyout</span>
                      <span className="text-sm font-semibold text-on-surface">${(((licenseConfig?.exclusivePrice ?? 0) / 100)).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Full commercial ownership. Future sales disabled.</p>
                  </div>
                </label>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-outline-variant/30">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-on-surface-variant">Total</span>
                <span className="text-2xl font-bold text-on-surface">
                  {selectedType === 'personal' && licenseConfig?.personalPrice === 0 ? 'FREE' : (
                    `$${((
                      selectedType === 'personal' ? licenseConfig?.personalPrice :
                      selectedType === 'commercial' ? licenseConfig?.commercialPrice :
                      selectedType === 'remix' ? licenseConfig?.remixPrice :
                      licenseConfig?.exclusivePrice
                    ) ?? 0) / 100}`
                  )}
                </span>
              </div>
              <button 
                onClick={handlePurchase}
                disabled={purchaseLoading}
                className="w-full bg-primary text-on-primary text-sm font-semibold py-3 px-4 rounded-lg hover:shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">shopping_cart</span>
                {purchaseLoading ? 'Processing...' : (selectedType === 'personal' && licenseConfig?.personalPrice === 0 ? 'Acquire License' : 'Purchase License')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom NavBar Player */}
      <nav className="bg-surface-container-lowest/80 backdrop-blur-[20px] fixed bottom-0 left-0 right-0 h-24 z-50 border-t border-outline-variant/30 shadow-2xl flex items-center justify-between px-8 w-full">
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-12 h-12 rounded bg-surface-variant overflow-hidden shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant">music_note</span>
          </div>
          <div className="hidden sm:block">
            <h4 className="text-sm font-bold text-on-surface">{song?.title || 'Summer Breeze'}</h4>
            <p className="text-xs text-on-surface-variant">{song?.owner?.displayName || 'Neon Pulse'}</p>
          </div>
          <button className="ml-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">favorite</span>
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center flex-grow w-1/3 max-w-md">
          <div className="flex items-center gap-6 mb-2">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">shuffle</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">skip_previous</span>
            </button>
            <button className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_10px_rgba(208,188,255,0.3)]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">skip_next</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">repeat</span>
            </button>
          </div>
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-semibold text-on-surface-variant">01:45</span>
            <div className="flex-grow h-1.5 bg-surface-variant rounded-full overflow-hidden relative group cursor-pointer">
              <div className="absolute top-0 left-0 h-full bg-primary w-[45%] group-hover:bg-primary-container transition-colors"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-[45%] w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant">03:20</span>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-4 w-1/3 text-on-surface-variant">
          <button className="hover:text-primary transition-colors hidden lg:block">
            <span className="material-symbols-outlined text-[20px]">queue_music</span>
          </button>
          <div className="flex items-center gap-2 w-24">
            <span className="material-symbols-outlined text-[20px]">volume_up</span>
            <div className="flex-grow h-1.5 bg-surface-variant rounded-full overflow-hidden cursor-pointer">
              <div className="h-full bg-primary/70 w-[80%]"></div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
