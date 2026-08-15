import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import {
  isYouTubeUrl,
  extractYouTubeId,
  parseStartSeconds,
  buildYouTubeEmbedUrl,
} from "@shared/video-embed";
import { VideoBlock } from "../../../renderer/react/media";
import type { BlockConfig } from "@shared/schema-types";

describe("shared/video-embed", () => {
  it("detects various YouTube URL formats", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
    expect(isYouTubeUrl("https://example.com/video.mp4")).toBe(false);
    expect(isYouTubeUrl("")).toBe(false);
    expect(isYouTubeUrl(undefined)).toBe(false);
  });

  it("extracts YouTube video IDs accurately", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://example.com/video.mp4")).toBe(null);
  });

  it("parses start seconds from start or t parameters", () => {
    expect(parseStartSeconds("https://www.youtube.com/watch?v=abc&start=120")).toBe(120);
    expect(parseStartSeconds("https://youtu.be/abc?t=1m30s")).toBe(90);
    expect(parseStartSeconds("https://youtu.be/abc?t=45s")).toBe(45);
    expect(parseStartSeconds("https://youtu.be/abc?t=1h2m3s")).toBe(3723);
  });

  it("builds clean embed URLs with options", () => {
    const embedUrl = buildYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      autoplay: true,
      controls: true,
      loop: true,
      muted: true,
    });
    expect(embedUrl).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?");
    expect(embedUrl).toContain("autoplay=1");
    expect(embedUrl).toContain("loop=1");
    expect(embedUrl).toContain("playlist=dQw4w9WgXcQ");
    expect(embedUrl).toContain("mute=1");
  });
});

describe("renderer/react/media VideoBlock", () => {
  it("renders a responsive YouTube iframe for YouTube URLs", () => {
    const block: BlockConfig = {
      id: "video-1",
      name: "core/video",
      type: "block",
      parentId: null,
      content: {
        kind: "media",
        mediaType: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        caption: "A cool YouTube video",
      },
    };

    const { container } = render(<VideoBlock {...block} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(container.textContent).toContain("A cool YouTube video");
  });

  it("renders a standard HTML5 video tag for direct MP4 URLs", () => {
    const block: BlockConfig = {
      id: "video-2",
      name: "core/video",
      type: "block",
      parentId: null,
      content: {
        kind: "media",
        mediaType: "video",
        url: "https://example.com/movie.mp4",
        poster: "https://example.com/poster.jpg",
      },
    };

    const { container } = render(<VideoBlock {...block} />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("https://example.com/movie.mp4");
    expect(video?.getAttribute("poster")).toBe("https://example.com/poster.jpg");
  });

  it("passes muted through to the YouTube embed even without autoplay", () => {
    const block: BlockConfig = {
      id: "video-3",
      name: "core/video",
      type: "block",
      parentId: null,
      content: {
        kind: "media",
        mediaType: "video",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        autoplay: false,
        muted: true,
      },
    };

    const { container } = render(<VideoBlock {...block} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toContain("mute=1");
  });
});
