import { buildPlaybackUrl, normalizeStems } from "./music-media";

describe("music-media helpers", () => {
  it("builds a backend playback url for a stem", () => {
    expect(buildPlaybackUrl("song-1", "stem-1")).toBe(
      "http://localhost:3001/music/songs/song-1/playback?stemId=stem-1",
    );
  });

  it("deduplicates stems by normalized type and keeps the priority order", () => {
    const stems = normalizeStems([
      { id: "a", type: "drums", fileUrl: "drums-1.wav", active: true },
      { id: "b", type: "vocal", fileUrl: "vocal.wav", active: true },
      { id: "c", type: "vocals", fileUrl: "vocal-dup.wav", active: true },
      { id: "d", type: "bass", fileUrl: "bass.wav", active: true },
      { id: "e", type: "other", fileUrl: "other.wav", active: true },
    ]);

    expect(stems).toHaveLength(4);
    expect(stems.map((stem) => stem.type)).toEqual([
      "vocal",
      "drums",
      "bass",
      "other",
    ]);
    expect(stems[0].fileUrl).toBe("vocal-dup.wav");
  });
});
