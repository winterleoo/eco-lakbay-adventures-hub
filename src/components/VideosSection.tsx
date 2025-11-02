import React, { useState } from "react";

type Video = {
  id: string; // unique id for internal use
  title: string;
  youtubeId: string;
  description?: string;
};

const VIDEOS: Video[] = [
  {
    id: "v1",
    title: "Welcome to the city of Angels",
    youtubeId: "vzlS4P-R-rk", // replace with real ids
    description: "Welcome to Angeles City Pampanga",
  },
  {
    id: "v2",
    title: "Discover Pampanga",
    youtubeId: "howgEFee5MU",
    description: "Mekeni tana! (Tara na dito!)",
  },
  {
    id: "v3",
    title: "Best of Kapampangan Cuisine",
    youtubeId: "avqseTGOCOA",
    description: "Explore the Culinary Capital of the Philippines",
  },
];

export default function VideosSection() {
  const [active, setActive] = useState<Video | null>(null);

  return (
    <section id="videos" className="max-w-6xl mx-auto py-12 px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Watch & Learn</h2>
        <p className="text-sm text-muted-foreground">
          Curated videos about environmental protection, sustainable travel, and community projects.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {VIDEOS.map((v) => (
          <div key={v.id} className="bg-white dark:bg-card rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setActive(v)}
              className="w-full text-left"
              aria-label={`Open video: ${v.title}`}
            >
              <div className="relative">
                <img
                  src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                  alt={v.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-3">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{v.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-black rounded-lg max-w-4xl w-full aspect-video overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <iframe
                title={active.title}
                src={`https://www.youtube.com/embed/${active.youtubeId}?autoplay=1`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setActive(null)}
                className="absolute top-2 right-2 bg-white/90 rounded-full p-1"
                aria-label="Close video"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
