"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";
import { buildPlaybackUrl, normalizeStems } from "@/lib/music-media";

interface Comment {
  id: string;
  songId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface SongDetails {
  id: string;
  title: string;
  genre: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
  processingStatus: "queued" | "processing" | "done" | "failed";
  fileUrl: string;
  owner: {
    displayName: string | null;
    email: string;
  };
  stems: Array<{
    id: string;
    type: string;
    fileUrl: string;
    duration: number | null;
  }>;
  analysis: {
    bpm: number | null;
    key: string | null;
    waveform: number[] | null;
  } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface TreeNode {
  id: string;
  title: string;
  owner: string;
  ownerId: string;
  type: string;
  x?: number;
  y?: number;
  children?: TreeNode[];
}

interface GraphNode {
  id: string;
  title: string;
  owner: string;
  ownerId: string;
  type: string;
}

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
  split: number;
}

interface GraphConnection {
  id: string;
  parentX: number;
  parentY: number;
  childX: number;
  childY: number;
  split: number;
}

interface OwnershipGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface SongStatusUpdatePayload {
  songId: string;
  status: "done" | "failed" | "processing";
  song?: SongDetails;
  stems?: Array<{
    id: string;
    type: string;
    fileUrl: string;
    duration: number | null;
  }>;
  analysis?: SongDetails["analysis"];
  error?: string;
}

interface StemState {
  id: string;
  type: string;
  fileUrl: string;
  active: boolean;
}

interface StemMixerNode {
  buffer: AudioBuffer;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
}

function toStemStates(
  stems: Array<{ id: string; type: string; fileUrl: string }>,
): StemState[] {
  return normalizeStems(
    stems.map((stem) => ({
      id: stem.id,
      type: stem.type,
      fileUrl: stem.fileUrl,
      active: true,
    })),
  );
}

function buildAndLayoutTree(
  nodes: GraphNode[],
  links: GraphLink[],
): { nodes: TreeNode[]; connections: GraphConnection[] } {
  const nodesMap = new Map<string, TreeNode>();
  for (const n of nodes) {
    nodesMap.set(n.id, { ...n, children: [] });
  }

  const childToParent = new Map<string, string>();
  const parentToChildren = new Map<
    string,
    { target: string; split: number }[]
  >();

  for (const l of links) {
    const parentId = typeof l.source === "object" ? l.source.id : l.source;
    const childId = typeof l.target === "object" ? l.target.id : l.target;

    childToParent.set(childId, parentId);

    if (!parentToChildren.has(parentId)) {
      parentToChildren.set(parentId, []);
    }
    parentToChildren.get(parentId)!.push({ target: childId, split: l.split });
  }

  let rootId = nodes[0]?.id;
  for (const n of nodes) {
    if (!childToParent.has(n.id)) {
      rootId = n.id;
      break;
    }
  }

  if (!rootId) return { nodes: [], connections: [] };

  const rootNode = nodesMap.get(rootId)!;

  function assemble(node: TreeNode) {
    const childrenRelations = parentToChildren.get(node.id) || [];
    for (const rel of childrenRelations) {
      const childNode = nodesMap.get(rel.target);
      if (childNode) {
        node.children!.push(childNode);
        assemble(childNode);
      }
    }
  }
  assemble(rootNode);

  const DX = 260;
  const DY = 120;
  let nextY = 40;

  const positionedNodes: TreeNode[] = [];
  const connections: GraphConnection[] = [];

  function layout(node: TreeNode, depth: number) {
    node.x = depth * DX + 50;

    if (!node.children || node.children.length === 0) {
      node.y = nextY;
      nextY += DY;
    } else {
      for (const child of node.children) {
        layout(child, depth + 1);
      }

      const firstChildY = node.children[0].y!;
      const lastChildY = node.children[node.children.length - 1].y!;
      node.y = (firstChildY + lastChildY) / 2;
    }

    positionedNodes.push(node);
  }

  layout(rootNode, 0);

  for (const l of links) {
    const parentId = typeof l.source === "object" ? l.source.id : l.source;
    const childId = typeof l.target === "object" ? l.target.id : l.target;

    const parent = nodesMap.get(parentId);
    const child = nodesMap.get(childId);

    if (
      parent &&
      child &&
      parent.x !== undefined &&
      parent.y !== undefined &&
      child.x !== undefined &&
      child.y !== undefined
    ) {
      connections.push({
        id: `${parentId}-${childId}`,
        parentX: parent.x,
        parentY: parent.y,
        childX: child.x,
        childY: child.y,
        split: l.split,
      });
    }
  }

  return { nodes: positionedNodes, connections };
}

export default function SongDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const songId = resolvedParams.id;

  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const currentUserId = (session?.user as { id?: string })?.id;

  const [song, setSong] = useState<SongDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [stemStates, setStemStates] = useState<StemState[]>([]);
  const [activeTab, setActiveTab] = useState<"stems" | "ownership">("stems");
  const [graphData, setGraphData] = useState<OwnershipGraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [isMixerLoading, setIsMixerLoading] = useState(false);
  const [isMixerReady, setIsMixerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [mixerDuration, setMixerDuration] = useState(0);
  const [mixerError, setMixerError] = useState("");

  const stemLoadKey = stemStates
    .map((stem) => `${stem.id}:${stem.fileUrl}`)
    .join("|");

  const audioContextRef = useRef<AudioContext | null>(null);
  const mixerNodesRef = useRef<Map<string, StemMixerNode>>(new Map());
  const playbackStartTimeRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const mixerDurationRef = useRef(0);
  const songDurationRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    mixerDurationRef.current = mixerDuration;
  }, [mixerDuration]);

  useEffect(() => {
    songDurationRef.current = song?.duration || 0;
  }, [song?.duration]);

  const getOrCreateAudioContext = React.useCallback(() => {
    const existing = audioContextRef.current;
    if (existing && existing.state !== "closed") {
      return existing;
    }

    const ctx = new window.AudioContext();
    audioContextRef.current = ctx;
    return ctx;
  }, []);

  const stopStemSources = React.useCallback((resetOffset: boolean) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const elapsed = ctx.currentTime - playbackStartTimeRef.current;
    if (isPlayingRef.current) {
      playbackOffsetRef.current = Math.min(
        playbackOffsetRef.current + Math.max(0, elapsed),
        mixerDurationRef.current > 0
          ? mixerDurationRef.current
          : songDurationRef.current || Number.MAX_SAFE_INTEGER,
      );
    }

    mixerNodesRef.current.forEach((node) => {
      if (node.source) {
        try {
          node.source.stop();
        } catch {
          // Source may already be stopped; ignore.
        }
        node.source.disconnect();
        node.source = null;
      }
    });

    if (resetOffset) {
      playbackOffsetRef.current = 0;
      setPlaybackPosition(0);
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const startStemSources = React.useCallback(
    async (startAt: number) => {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === "closed" || mixerNodesRef.current.size === 0) {
        return;
      }

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      stopStemSources(false);

      mixerNodesRef.current.forEach((node) => {
        const source = ctx.createBufferSource();
        source.buffer = node.buffer;
        source.connect(node.gain);
        node.source = source;
        source.start(0, Math.max(0, startAt));
      });

      playbackOffsetRef.current = Math.max(0, startAt);
      playbackStartTimeRef.current = ctx.currentTime;
      setPlaybackPosition(Math.max(0, startAt));
      isPlayingRef.current = true;
      setIsPlaying(true);
    },
    [getOrCreateAudioContext, stopStemSources],
  );

  const handleLikeToggle = async () => {
    if (!session || !token) {
      alert("Please log in to like this song.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/music/songs/${songId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount((prev) => (data.liked ? prev + 1 : prev - 1));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !token) return;

    try {
      const res = await fetch(`${API_URL}/music/songs/${songId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentInput }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setCommentInput("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/music/songs/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  // Fetch song details
  useEffect(() => {
    const fetchSongDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/music/songs/${songId}`);
        if (!res.ok) {
          throw new Error(`Failed to load song details: ${res.status}`);
        }
        const data: SongDetails = await res.json();
        setSong(data);

        // Initialize stem active states
        if (data.stems) {
          setStemStates(toStemStates(data.stems));
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    fetchSongDetails();
  }, [songId]);

  // Fetch like status and comments
  useEffect(() => {
    const fetchLikesAndComments = async () => {
      try {
        const likeRes = await fetch(
          `${API_URL}/music/songs/${songId}/like-status?userId=${currentUserId || ""}`,
        );
        if (likeRes.ok) {
          const likeData = await likeRes.json();
          setLikeCount(likeData.count);
          setLiked(likeData.liked);
        }

        setCommentsLoading(true);
        const commentsRes = await fetch(
          `${API_URL}/music/songs/${songId}/comments`,
        );
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData);
        }
      } catch (err) {
        console.error("Failed to fetch likes/comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchLikesAndComments();
  }, [songId, currentUserId]);

  const processingStatus = song?.processingStatus;

  // WebSocket connection for real-time processing updates
  useEffect(() => {
    if (
      !processingStatus ||
      processingStatus === "done" ||
      processingStatus === "failed"
    )
      return;

    const socket = io(`${API_URL}/music`, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log(
        `Connected to WebSocket Music gateway for song details: ${songId}`,
      );
      socket.emit("subscribeToSong", { songId });
    });

    socket.on("song:status-updated", (data: SongStatusUpdatePayload) => {
      console.log("Received real-time update in song details page:", data);
      if (data.songId === songId) {
        if (data.status === "done") {
          setSong((prev) =>
            prev
              ? {
                  ...prev,
                  processingStatus: "done",
                  bpm: data.song?.bpm ?? prev.bpm,
                  key: data.song?.key ?? prev.key,
                  duration: data.song?.duration ?? prev.duration,
                  stems: data.stems ?? prev.stems,
                  analysis: data.analysis ?? prev.analysis,
                }
              : null,
          );
          setStemStates(toStemStates(data.stems || []));
        } else if (data.status === "failed") {
          setSong((prev) =>
            prev ? { ...prev, processingStatus: "failed" } : null,
          );
          setErrorMsg(data.error || "AI separation failed.");
        } else if (data.status === "processing") {
          setSong((prev) =>
            prev ? { ...prev, processingStatus: "processing" } : null,
          );
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [processingStatus, songId]);

  const toggleStem = (index: number) => {
    setStemStates((prev) =>
      prev.map((stem, currentIndex) =>
        currentIndex === index ? { ...stem, active: !stem.active } : stem,
      ),
    );
  };

  useEffect(() => {
    if (song?.processingStatus !== "done" || stemStates.length === 0) {
      setIsMixerReady(false);
      return;
    }

    let cancelled = false;

    const initMixer = async () => {
      setIsMixerLoading(true);
      setMixerError("");
      setIsMixerReady(false);
      setPlaybackPosition(0);
      setMixerDuration(0);
      playbackOffsetRef.current = 0;

      stopStemSources(true);

      const ctx = getOrCreateAudioContext();
      const nodes = new Map<string, StemMixerNode>();

      try {
        let maxDuration = 0;
        for (const stem of stemStates) {
          const stemUrl = buildPlaybackUrl(songId, stem.id);
          const response = await fetch(stemUrl);
          if (!response.ok) {
            throw new Error(
              `Unable to load stem ${stem.type} (${response.status})`,
            );
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          maxDuration = Math.max(maxDuration, audioBuffer.duration);

          const gain = ctx.createGain();
          gain.gain.value = stem.active ? 1 : 0;
          gain.connect(ctx.destination);

          nodes.set(stem.id, {
            buffer: audioBuffer,
            gain,
            source: null,
          });
        }

        if (!cancelled) {
          if (ctx.state === "closed") {
            return;
          }
          mixerNodesRef.current = nodes;
          const resolvedDuration = Math.max(
            maxDuration,
            songDurationRef.current || 0.1,
          );
          setMixerDuration(resolvedDuration);
          setIsMixerReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setMixerError(
            error instanceof Error
              ? error.message
              : "Failed to initialize stem mixer",
          );
        }
      } finally {
        if (!cancelled) {
          setIsMixerLoading(false);
        }
      }
    };

    initMixer();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, song?.processingStatus, stemLoadKey]);

  useEffect(() => {
    stemStates.forEach((stem) => {
      const mixerNode = mixerNodesRef.current.get(stem.id);
      if (mixerNode) {
        mixerNode.gain.gain.value = stem.active ? 1 : 0;
      }
    });
  }, [stemStates]);

  useEffect(() => {
    const tick = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const playbackLimit =
        mixerDuration > 0 ? mixerDuration : songDurationRef.current;
      if (playbackLimit <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const nextPosition = Math.min(
        playbackOffsetRef.current + Math.max(0, elapsed),
        playbackLimit,
      );
      setPlaybackPosition(nextPosition);

      if (nextPosition >= playbackLimit) {
        stopStemSources(true);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
    };
  }, [isPlaying, mixerDuration, stopStemSources]);

  useEffect(() => {
    return () => {
      stopStemSources(true);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [stopStemSources]);

  const handlePlayPause = async () => {
    if (!isMixerReady) return;

    if (isPlaying) {
      stopStemSources(false);
      return;
    }

    await startStemSources(playbackOffsetRef.current);
  };

  const handleSeek = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPosition = Number(event.target.value);
    playbackOffsetRef.current = nextPosition;
    setPlaybackPosition(nextPosition);

    if (isPlaying) {
      await startStemSources(nextPosition);
    }
  };

  // Fetch ownership graph data
  useEffect(() => {
    if (activeTab === "ownership") {
      const fetchGraph = async () => {
        setGraphLoading(true);
        try {
          const res = await fetch(`${API_URL}/music/ownership/${songId}/graph`);
          if (res.ok) {
            const data = await res.json();
            setGraphData(data);
          }
        } catch (err) {
          console.error("Failed to fetch ownership graph:", err);
        } finally {
          setGraphLoading(false);
        }
      };
      fetchGraph();
    }
  }, [activeTab, songId]);

  const renderOwnershipGraph = () => {
    if (graphLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B5CF6] border-t-transparent mb-3"></div>
          <span>Loading ownership graph data...</span>
        </div>
      );
    }

    if (!graphData || graphData.nodes.length === 0) {
      return (
        <div className="text-center p-8 bg-gray-950/60 rounded-2xl border border-gray-800 text-gray-500 text-sm">
          No ownership data available for this song.
        </div>
      );
    }

    const maxDepth = Math.max(
      ...graphData.nodes.map((n) => {
        let depth = 0;
        let curr = n.id;
        const parentMap = new Map(
          graphData.links.map((l) => [
            typeof l.target === "object" ? l.target.id : l.target,
            typeof l.source === "object" ? l.source.id : l.source,
          ]),
        );
        while (parentMap.has(curr)) {
          depth++;
          curr = parentMap.get(curr)!;
        }
        return depth;
      }),
    );

    const { nodes: positionedNodes, connections } = buildAndLayoutTree(
      graphData.nodes,
      graphData.links,
    );

    const svgWidth = Math.max(760, (maxDepth + 1) * 280 + 100);
    const svgHeight = Math.max(
      320,
      Math.max(...positionedNodes.map((n) => n.y || 0)) + 120,
    );

    return (
      <div className="w-full overflow-x-auto bg-gray-950/40 border border-gray-800/80 rounded-2xl p-6">
        <div
          style={{ width: `${svgWidth}px`, height: `${svgHeight}px` }}
          className="relative mx-auto"
        >
          <svg width={svgWidth} height={svgHeight} className="absolute inset-0">
            {/* Draw Links */}
            {connections.map((c: GraphConnection) => {
              const parentBoxRightX = c.parentX + 220;
              const parentBoxCenterY = c.parentY + 35;
              const childBoxLeftX = c.childX;
              const childBoxCenterY = c.childY + 35;

              const cp1x = parentBoxRightX + 30;
              const cp1y = parentBoxCenterY;
              const cp2x = childBoxLeftX - 30;
              const cp2y = childBoxCenterY;

              const pathD = `M ${parentBoxRightX} ${parentBoxCenterY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${childBoxLeftX} ${childBoxCenterY}`;

              return (
                <g key={c.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="opacity-60"
                  />
                  <foreignObject
                    x={(parentBoxRightX + childBoxLeftX) / 2 - 25}
                    y={(parentBoxCenterY + childBoxCenterY) / 2 - 10}
                    width={50}
                    height={20}
                  >
                    <div className="bg-gray-800 text-[#10B981] border border-gray-700 text-[9px] font-bold font-mono rounded-full flex items-center justify-center h-full shadow">
                      {c.split}%
                    </div>
                  </foreignObject>
                </g>
              );
            })}

            {/* Draw Nodes */}
            {positionedNodes.map((node) => {
              const isCurrent = node.id === songId;

              return (
                <foreignObject
                  key={node.id}
                  x={node.x}
                  y={node.y}
                  width={220}
                  height={70}
                >
                  <Link
                    href={`/song/${node.id}`}
                    className={`block h-full border rounded-xl p-3 select-none transition duration-200 cursor-pointer ${
                      isCurrent
                        ? "bg-[#8B5CF6]/25 border-[#8B5CF6] shadow-lg shadow-purple-500/10"
                        : "bg-gray-900/90 border-gray-800/80 hover:border-gray-700 hover:bg-gray-900"
                    }`}
                  >
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold text-white truncate max-w-32.5"
                          title={node.title}
                        >
                          {node.title}
                        </span>
                        <span
                          className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            node.type === "original"
                              ? "bg-purple-950/80 text-[#A78BFA] border border-purple-800/30"
                              : "bg-emerald-950/80 text-[#34D399] border border-emerald-800/30"
                          }`}
                        >
                          {node.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 truncate max-w-30">
                          👤 {node.owner}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-1 py-0.5 rounded">
                            CURRENT
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </foreignObject>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B5CF6]"></div>
      </div>
    );
  }

  if (errorMsg && !song) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 bg-gray-900 border border-gray-800 rounded-3xl shadow-xl">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
          <Link href="/songs" className="text-[#8B5CF6] hover:underline">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  if (!song) return null;

  const displayCreator =
    song.owner.displayName || song.owner.email.split("@")[0];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB] p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/songs"
          className="text-sm text-gray-400 hover:text-white transition mb-6 inline-block"
        >
          ← Back to Explore
        </Link>

        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 p-8 rounded-3xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center text-[#8B5CF6] text-4xl">
                📻
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold mb-1">{song.title}</h1>
                  <button
                    onClick={handleLikeToggle}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                      liked
                        ? "bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse-subtle"
                        : "bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>{liked ? "❤️" : "🤍"}</span>
                    <span>{likeCount}</span>
                  </button>
                </div>
                <p className="text-gray-400">by {displayCreator}</p>
                <div className="flex space-x-2 mt-2 text-xs font-mono text-gray-500">
                  <span className="bg-gray-800 px-2 py-0.5 rounded">
                    {song.bpm ? `${song.bpm} BPM` : "BPM pending"}
                  </span>
                  <span className="bg-gray-800 px-2 py-0.5 rounded">
                    {song.key || "Key pending"}
                  </span>
                  <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded uppercase">
                    {song.genre}
                  </span>
                </div>
              </div>
            </div>

            {song.processingStatus === "done" && (
              <Link
                href={`/studio?songId=${song.id}`}
                className="bg-[#10B981] hover:bg-[#059669] text-black font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/10 text-center transition"
              >
                Open in AI Remix Studio
              </Link>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab("stems")}
              className={`py-2 px-6 font-semibold text-sm border-b-2 transition ${
                activeTab === "stems"
                  ? "border-[#8B5CF6] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Stems & Player
            </button>
            <button
              onClick={() => setActiveTab("ownership")}
              className={`py-2 px-6 font-semibold text-sm border-b-2 transition ${
                activeTab === "ownership"
                  ? "border-[#8B5CF6] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Ownership Graph
            </button>
          </div>

          {activeTab === "stems" ? (
            <>
              {/* Waveform Visualization */}
              <div className="mb-8">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>0:00</span>
                  <span>
                    {song.duration
                      ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}`
                      : "--:--"}
                  </span>
                </div>
                <div className="h-24 bg-gray-950/60 rounded-xl border border-gray-800 flex items-center justify-evenly px-4 overflow-hidden">
                  {song.processingStatus === "done" &&
                  song.analysis?.waveform ? (
                    // Render real waveform values from backend API
                    song.analysis.waveform.slice(0, 80).map((val, i) => {
                      const height = val * 70 + 4; // Normalize heights to container size
                      return (
                        <div
                          key={i}
                          style={{ height: `${height}px` }}
                          className="w-1.5 bg-[#8B5CF6]/60 rounded-full hover:bg-[#8B5CF6] transition duration-200"
                        />
                      );
                    })
                  ) : song.processingStatus === "failed" ? (
                    <div className="text-error text-sm font-semibold">
                      ❌ Audio analysis failed to generate waveform.
                    </div>
                  ) : (
                    // Processing Stepper placeholder
                    <div className="flex flex-col items-center justify-center space-y-2 text-gray-400 text-sm">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#8B5CF6] border-t-transparent"></div>
                      <span>
                        AI generating waveform & analysis points... (
                        {song.processingStatus})
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 bg-gray-950/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={handlePlayPause}
                      disabled={!isMixerReady || isMixerLoading}
                      className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-black text-xs font-bold px-4 py-2 rounded-lg transition"
                    >
                      {isPlaying ? "PAUSE MIX" : "PLAY MIX"}
                    </button>
                    <span className="text-xs text-gray-400 font-mono">
                      {`${Math.floor(playbackPosition / 60)}:${String(
                        Math.floor(playbackPosition % 60),
                      ).padStart(
                        2,
                        "0",
                      )} / ${Math.floor((mixerDuration || song.duration || 0) / 60)}:${String(
                        Math.floor((mixerDuration || song.duration || 0) % 60),
                      ).padStart(2, "0")}`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(mixerDuration, 0.1)}
                    step={0.01}
                    value={playbackPosition}
                    onChange={handleSeek}
                    disabled={!isMixerReady || isMixerLoading}
                    className="w-full accent-[#8B5CF6]"
                  />

                  {isMixerLoading && (
                    <p className="mt-2 text-xs text-gray-500">
                      Loading stem buffers for mixer...
                    </p>
                  )}
                  {mixerError && (
                    <p className="mt-2 text-xs text-rose-400">{mixerError}</p>
                  )}
                </div>
              </div>

              {/* Stems Separation Section */}
              <div>
                <h2 className="text-lg font-bold mb-4">
                  Stem Controls (Audio Demucs separated)
                </h2>
                {song.processingStatus === "done" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stemStates.map((stem, index) => (
                      <div
                        key={stem.id}
                        className={`border p-4 rounded-xl flex flex-col justify-between h-28 transition ${
                          stem.active
                            ? "bg-gray-900 border-[#8B5CF6]"
                            : "bg-gray-950 border-gray-800 opacity-60"
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                          {stem.type}
                        </span>

                        {/* Display R2 stem audio preview links */}
                        <span className="text-[10px] text-gray-500 truncate font-mono mt-1">
                          {stem.fileUrl.split("/").pop()}
                        </span>

                        <button
                          onClick={() => toggleStem(index)}
                          className={`mt-3 py-1.5 rounded-lg text-xs font-semibold ${
                            stem.active
                              ? "bg-[#8B5CF6] text-white"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {stem.active ? "MUTE" : "UNMUTE"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : song.processingStatus === "failed" ? (
                  <div className="text-center p-6 bg-red-950/20 border border-red-900/30 rounded-2xl text-error text-sm">
                    AI stem separation failed to process this track. Stems are
                    unavailable.
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-950/60 rounded-2xl border border-gray-800 text-gray-500 text-sm flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                    <span>
                      Stems are being separated by FastAPI AI Worker. They will
                      display here automatically when ready.
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <h2 className="text-lg font-bold mb-4 font-sans tracking-wide">
                Ownership Genealogy Tree
              </h2>
              {renderOwnershipGraph()}
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-12 pt-8 border-t border-gray-850">
            <h2 className="text-xl font-bold mb-6 font-sans">
              Discussion ({comments.length})
            </h2>

            {/* Post Comment Form */}
            {session ? (
              <form onSubmit={handlePostComment} className="mb-8 flex gap-4">
                <input
                  type="text"
                  placeholder="Share your thoughts about this track..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-gray-950/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B5CF6] transition"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition text-sm"
                >
                  Post
                </button>
              </form>
            ) : (
              <div className="p-4 bg-gray-950/40 border border-gray-800/60 rounded-xl text-center text-sm text-gray-400 mb-8 font-sans">
                Please{" "}
                <Link
                  href="/login"
                  className="text-[#8B5CF6] hover:underline font-semibold"
                >
                  log in
                </Link>{" "}
                to join the discussion.
              </div>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 bg-gray-950/20 border border-gray-800/40 rounded-2xl text-gray-500 text-sm font-sans">
                No comments yet. Be the first to share your thoughts!
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const authorName =
                    comment.user.displayName ||
                    comment.user.email.split("@")[0];
                  const isOwner = currentUserId === comment.userId;
                  return (
                    <div
                      key={comment.id}
                      className="bg-gray-950/40 border border-gray-800/60 rounded-2xl p-4 flex justify-between items-start gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-xs text-white">
                            {authorName}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 font-sans">
                          {comment.content}
                        </p>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-500 hover:text-rose-500 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-500/10 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
