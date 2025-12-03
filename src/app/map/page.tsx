"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { supabaseBrowser } from "@/lib/supabase-browser";

type PlaceProps = {
  id?: string;
  title?: string;
  description?: string;
  votes?: number;
  hide_number?: boolean;
  suburb?: string;
  rank?: number;
};

type RunItem = {
  id: string;
  address: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

const RUN_KEY = "my_run_v1";

function stripHouseNumber(address: string) {
  return address.replace(/^\s*\d+\s+/, "");
}

function buildGoogleMapsUrl(run: RunItem[]): string | null {
  if (!run.length) return null;

  const coords = run.map((r) => `${r.lat},${r.lng}`);

  if (coords.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords[0]}`;
  }

  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1).join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

function detectSeason(): "halloween" | "christmas" {
  const m = new Date().getMonth() + 1;
  if (m === 9 || m === 10) return "halloween";
  if (m === 11 || m === 12) return "christmas";
  return "christmas";
}

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const focusPlaceIdRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // My Run state
  const [run, setRun] = useState<RunItem[]>([]);
  const runRef = useRef<RunItem[]>([]);
  const [runOpen, setRunOpen] = useState(false);
  const [runPulse, setRunPulse] = useState(false);

  // Cache + top 10
  const placesCacheRef = useRef<Record<string, any>>({});
  const top10FeaturesRef = useRef<any[]>([]);

  // keep ref in sync
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // load run from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RUN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned: RunItem[] = parsed
          .filter(
            (r) =>
              r &&
              r.id &&
              typeof r.lat === "number" &&
              typeof r.lng === "number"
          )
          .map((r: any) => ({
            id: String(r.id),
            address: String(r.address ?? ""),
            suburb: r.suburb ?? null,
            lat: Number(r.lat),
            lng: Number(r.lng),
          }));
        setRun(cleaned);
      }
    } catch {
      // ignore bad data
    }
  }, []);

  function saveRun(next: RunItem[]) {
    const prevLength = runRef.current.length;

    setRun(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RUN_KEY, JSON.stringify(next));
    }

    // If we ADDED something and the panel is closed -> pulse the pill
    if (next.length > prevLength && !runOpen) {
      setRunPulse(true);
      setTimeout(() => setRunPulse(false), 280);
    }
  }

  function removeFromRun(id: string) {
    const current = runRef.current;
    const next = current.filter((r) => r.id !== id);
    saveRun(next);
  }

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === "test") {
      setError(
        "Mapbox token not set yet. We’ll add it next — this is expected 👍"
      );
      return;
    }
    mapboxgl.accessToken = token as string;

    if (mapRef.current || !mapContainerRef.current) return;

    // read ?id=... from URL (leaderboard "View on map")
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id) focusPlaceIdRef.current = id;
    }

    const supabase = supabaseBrowser();

    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [153.3, -27.8],
        zoom: 10,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Single filter button (cycles All → Lights → Top 10)
      const openBtn = document.createElement("button");
      openBtn.style.top = "12px";
      openBtn.style.position = "absolute";
      openBtn.style.top = "70px"; // under header
      openBtn.style.left = "10px";
      openBtn.style.padding = "6px 14px";
      openBtn.style.borderRadius = "9999px";
      openBtn.style.fontSize = "13px";
      openBtn.style.fontWeight = "600";
      openBtn.style.letterSpacing = "0.03em";
      openBtn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
      map.getContainer().appendChild(openBtn);

      let showOpenNow = false;
      let showTop10Only = false;

      function applyFilterButtonStyles() {
        if (showTop10Only) {
          openBtn.textContent = "Top 10 only";
          openBtn.style.border = "1px solid #d6a5a5";
          openBtn.style.background =
            "linear-gradient(135deg, #fff0f0, #ffd4d4)";
          openBtn.style.color = "#5a1a1a";
        } else if (showOpenNow) {
          openBtn.textContent = "Lights on now";
          openBtn.style.border = "1px solid #d6c8a5";
          openBtn.style.background =
            "linear-gradient(135deg, #fff8e5, #ffe2b5)";
          openBtn.style.color = "#5a3a12";
        } else {
          openBtn.textContent = "All displays";
          openBtn.style.border = "1px solid #cccccc";
          openBtn.style.background = "#ffffff";
          openBtn.style.color = "#333333";
        }
      }

      applyFilterButtonStyles();

      const getMap = () => mapRef.current as mapboxgl.Map;

      const renderPopup = (opts: {
        place_id: string;
        rawTitle: string;
        hideNumber: boolean;
        description: string;
        votes: number;
        lng: number;
        lat: number;
        suburb: string | null;
        rank?: number | null;
      }) => {
        const popup = popupRef.current;
        if (!popup) return;

        const displayTitle = opts.hideNumber
          ? stripHouseNumber(opts.rawTitle)
          : opts.rawTitle;

        const inRun = runRef.current.some((r) => r.id === opts.place_id);

        popup
          .setLngLat([opts.lng, opts.lat])
          .setHTML(`
      <div 
        style="
          font-family: sans-serif;
          font-size: 14px;
          padding-right: 40px; 
          padding-top: 10px;
        "
      >
        ${
          typeof opts.rank === "number" && opts.rank >= 1 && opts.rank <= 10
            ? `
          <div
            style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 6px;
              padding: 3px 8px;
              border-radius: 9999px;
              background: #fff8e1;
              border: 1px solid #d4af37;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            "
          >
            <span style="font-size: 14px;">🏅</span>
            <span>#${opts.rank} in Gold Coast</span>
          </div>
        `
            : ""
        }

        <strong>${displayTitle}</strong>
        <div
          style="
            margin-top: 2px;
            margin-bottom: 4px;
            max-height: 2.8em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            font-size: 13px;
            color: #0c0c0c;
          "
        >
          ${opts.description}
        </div>

        <div style="margin-bottom: 10px;">
          <a
            href="/place/${opts.place_id}"
            style="font-size: 12px; text-decoration: underline; color: #969696;"
          >
            see more...
          </a>
        </div>

        <div style="margin-bottom: 10px;">
          <button id="vote-btn"
            style="
              padding: 6px 10px;
              border-radius: 9999px;
              border: 1px solid #000000;
              background-color: #ffffff;
              color: #000000;
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 0.05em;
              cursor: pointer;
              text-transform: uppercase;
              min-width: 80px;
            "
          >
            VOTE
          </button>
          <div
            id="vote-count"
            style="
              margin-top: 4px;
              font-size: 12px;
              color: #555555;
            "
          >
            ${opts.votes} votes
          </div>
        </div>

        <div style="margin-bottom: 8px;">
          <button id="run-btn"
            style="
              padding: 8px 12px;
              background: linear-gradient(135deg, #7e0a17, #c4142d);
              color: #ffffff;
              border-radius: 9999px;
              border: none;
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              min-width: 120px;
            "
          >
            ${inRun ? "Remove from run" : "Add to run"}
          </button>
        </div>
      </div>
    `)
          .addTo(getMap());

        // Attach handlers after HTML is inserted
        setTimeout(() => {
          const voteBtn = document.getElementById(
            "vote-btn"
          ) as HTMLButtonElement | null;
          const count = document.getElementById(
            "vote-count"
          ) as HTMLSpanElement | null;
          const runBtn = document.getElementById(
            "run-btn"
          ) as HTMLButtonElement | null;

        // Vote button (toggle + remember previous votes)
        if (voteBtn && count) {
          let hasVoted = false;

          // 1) On popup open, check if the user has already voted for this place
          (async () => {
            const { data: uData } = await supabase.auth.getUser();
            const user = uData.user;
            if (!user) {
              // Not logged in → leave button as default "VOTE"
              return;
            }

            const { data: existingVote } = await supabase
              .from("votes")
              .select("id")
              .eq("user_id", user.id)
              .eq("place_id", opts.place_id)
              .maybeSingle();

            if (existingVote) {
              hasVoted = true;
              voteBtn.textContent = "Voted";
              voteBtn.style.backgroundColor = "#c4142d";
              voteBtn.style.color = "#ffffff";
              voteBtn.style.borderColor = "#c4142d";
            }
          })();

          // 2) Clicking the button toggles vote on/off
          voteBtn.addEventListener("click", async () => {
            voteBtn.disabled = true;

            const { data: uData } = await supabase.auth.getUser();
            const user = uData.user;
            if (!user) {
              alert("Please log in on the Login page before voting.");
              voteBtn.disabled = false;
              return;
            }

            if (!hasVoted) {
              // Add vote
              const { error } = await supabase.from("votes").insert({
                user_id: user.id,
                place_id: opts.place_id,
              });

              if (error && !error.message.includes("duplicate key")) {
                console.error("Vote error:", error.message);
                alert("Could not save your vote. Please try again.");
                voteBtn.disabled = false;
                return;
              }

              hasVoted = true;
            } else {
              // Remove vote
              const { error } = await supabase
                .from("votes")
                .delete()
                .eq("user_id", user.id)
                .eq("place_id", opts.place_id);

              if (error) {
                console.error("Unvote error:", error.message);
                alert("Could not remove your vote. Please try again.");
                voteBtn.disabled = false;
                return;
              }

              hasVoted = false;
            }

            // Get the latest vote count
            const { data: vcData, error: vcErr } = await supabase
              .from("vote_counts")
              .select("votes")
              .eq("place_id", opts.place_id)
              .maybeSingle();

            if (!vcErr && vcData && typeof vcData.votes === "number") {
              count.textContent =
                vcData.votes === 1 ? "1 vote" : `${vcData.votes} votes`;
            }

            // Update button style + text based on new state
            if (hasVoted) {
              voteBtn.textContent = "VOTED";
              voteBtn.style.backgroundColor = "#c4142d";
              voteBtn.style.color = "#ffffff";
              voteBtn.style.borderColor = "#c4142d";
            } else {
              voteBtn.textContent = "VOTE";
              voteBtn.style.backgroundColor = "#ffffff";
              voteBtn.style.color = "#000000";
              voteBtn.style.borderColor = "#000000";
            }

            voteBtn.disabled = false;
          });
        }



          // Run button
          if (runBtn) {
            runBtn.addEventListener("click", () => {
              const current = runRef.current;
              const existingIndex = current.findIndex(
                (r) => r.id === opts.place_id
              );

              let next: RunItem[];
              if (existingIndex >= 0) {
                next = [
                  ...current.slice(0, existingIndex),
                  ...current.slice(existingIndex + 1),
                ];
                runBtn.textContent = "Add to run";
              } else {
                const item: RunItem = {
                  id: opts.place_id,
                  address: displayTitle,
                  suburb: opts.suburb,
                  lat: opts.lat,
                  lng: opts.lng,
                };
                next = [...current, item];
                runBtn.textContent = "Remove from run";
              }

              saveRun(next);
              setRunOpen(true);
            });
          }
        }, 50);
      };

      async function refetch() {
        const season = detectSeason();
        const params = new URLSearchParams();
        params.set("season", season);
        if (showOpenNow) params.set("openNow", "true");

        const query = params.toString();
        const cacheKey = query || "default";

        let data: any;

        try {
          // cache
          if (placesCacheRef.current[cacheKey]) {
            data = placesCacheRef.current[cacheKey];
          } else {
            const res = await fetch(`/api/places?${query}`);
            if (!res.ok) {
              throw new Error("Failed to load places");
            }
            data = await res.json();
            placesCacheRef.current[cacheKey] = data;
          }
        } catch (e: any) {
          console.error(e);
          setError(e?.message || "Failed to load places");
          return;
        }

        // store top 10
        if (Array.isArray(data.features)) {
          const ranked = (data.features as any[])
            .filter(
              (f) =>
                typeof f.properties?.rank === "number" &&
                f.properties.rank >= 1 &&
                f.properties.rank <= 10
            )
            .sort(
              (a, b) =>
                (a.properties.rank ?? 999) - (b.properties.rank ?? 999)
            );
          top10FeaturesRef.current = ranked;
        } else {
          top10FeaturesRef.current = [];
        }

        // top 10 only filter
        let fc = data;
        if (showTop10Only && Array.isArray(data.features)) {
          fc = {
            ...data,
            features: data.features.filter((f: any) => {
              const r = f.properties?.rank;
              return typeof r === "number" && r >= 1 && r <= 10;
            }),
          };
        }

        const src = getMap().getSource("places") as mapboxgl.GeoJSONSource;
        src.setData(fc);

        // focus on given id
        const focusId = focusPlaceIdRef.current;
        if (focusId && Array.isArray(data.features) && popupRef.current) {
          const feature = (data.features as any[]).find(
            (f) => f.properties?.id === focusId
          );
          if (feature) {
            const [lng, lat] = feature.geometry
              .coordinates as [number, number];
            const props = (feature.properties || {}) as PlaceProps;

            const place_id = props.id ?? "";
            const rawTitle = props.title ?? "Untitled";
            const hideNumber = props.hide_number === true;
            const description = props.description ?? "";
            const votes = props.votes ?? 0;
            const suburb = props.suburb ?? null;
            const rank = props.rank ?? null;

            renderPopup({
              place_id,
              rawTitle,
              hideNumber,
              description,
              votes,
              lng,
              lat,
              suburb,
              rank,
            });

            getMap().easeTo({ center: [lng, lat], zoom: 14 });
            focusPlaceIdRef.current = null;
          }
        }
      }

      openBtn.onclick = async () => {
        // All → Lights → Top 10 → All
        if (!showOpenNow && !showTop10Only) {
          showOpenNow = true;
          showTop10Only = false;
        } else if (showOpenNow && !showTop10Only) {
          showOpenNow = false;
          showTop10Only = true;
        } else {
          showOpenNow = false;
          showTop10Only = false;
        }

        applyFilterButtonStyles();
        await refetch();
      };

      // Map load: load icons + add source + layers
      map.on("load", () => {
        const baubleUrl = "/icons/christmas-map-marker.png";

        map.loadImage(baubleUrl, (error, image) => {
          if (error || !image) {
            console.error("Failed to load bauble icon", error);
          } else {
            if (!map.hasImage("christmas-bauble")) {
              map.addImage("christmas-bauble", image);
            }
          }

          // top 10 numbered markers
          for (let i = 1; i <= 10; i++) {
            const name = `christmas-marker-${i}`;
            const url = `/icons/top10/${name}.png`;

            map.loadImage(url, (err, img) => {
              if (err || !img) {
                console.error("Failed to load marker", url, err);
                return;
              }
              if (!map.hasImage(name)) {
                map.addImage(name, img);
              }
            });
          }

          try {
            const emptyFC = {
              type: "FeatureCollection",
              features: [] as any[],
            } as const;

            if (map.getSource("places")) map.removeSource("places");
            map.addSource("places", {
              type: "geojson",
              data: emptyFC,
              cluster: true,
              clusterRadius: 40,
              clusterMaxZoom: 14,
            });

            // clusters
            map.addLayer({
              id: "clusters",
              type: "circle",
              source: "places",
              filter: ["has", "point_count"],
              paint: {
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  18,
                  10,
                  24,
                  30,
                  32,
                ],
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  "#006625",
                  10,
                  "#c4142d",
                  30,
                  "#7e0a17",
                ],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1.5,
              },
            });

            // cluster counts
            map.addLayer({
              id: "cluster-count",
              type: "symbol",
              source: "places",
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get", "point_count_abbreviated"],
                "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
                "text-size": 12,
              },
              paint: { "text-color": "#fefefe" },
            });

            // unclustered single points with rank-based markers
            map.addLayer({
              id: "unclustered-point",
              type: "symbol",
              source: "places",
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": [
                  "case",
                  [
                    "all",
                    ["has", "rank"],
                    ["<=", ["coalesce", ["get", "rank"], 9999], 10],
                  ],
                  ["concat", "christmas-marker-", ["get", "rank"]],
                  "christmas-bauble",
                ],
                "icon-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  8,
                  0.18,
                  11,
                  0.26,
                  14,
                  0.36,
                  17,
                  0.48,
                ],
                "icon-anchor": "bottom",
              },
            });

            // cluster click → zoom
            map.on("click", "clusters", (e) => {
              const features = map.queryRenderedFeatures(e.point, {
                layers: ["clusters"],
              });
              const clusterId = features[0].properties?.cluster_id;
              const source = map.getSource(
                "places"
              ) as mapboxgl.GeoJSONSource;
              source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err || zoom == null) return;
                const [lng, lat] = (features[0].geometry as any).coordinates;
                map.easeTo({ center: [lng, lat], zoom });
              });
            });

            // popup instance
            popupRef.current = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
            });

            // point click → popup
            map.on("click", "unclustered-point", (e) => {
              const f = map.queryRenderedFeatures(e.point, {
                layers: ["unclustered-point"],
              })[0];

              if (!f) return;

              const props = (f.properties ?? {}) as PlaceProps;
              const place_id = props.id ?? "";
              const rawTitle = props.title ?? "Untitled";
              const hideNumber = props.hide_number === true;
              const description = props.description ?? "";
              const votes = props.votes ?? 0;
              const suburb = props.suburb ?? null;
              const rank = props.rank ?? null;
              const [lng, lat] = (f.geometry as any)
                .coordinates as [number, number];

              renderPopup({
                place_id,
                rawTitle,
                hideNumber,
                description,
                votes,
                lng,
                lat,
                suburb,
                rank,
              });
            });

            // cursor hints
            map.on("mouseenter", "clusters", () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "clusters", () => {
              map.getCanvas().style.cursor = "";
            });
            map.on("mouseenter", "unclustered-point", () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "unclustered-point", () => {
              map.getCanvas().style.cursor = "";
            });

            // initial data load
            refetch();
          } catch (e: any) {
            setError(e?.message || "Failed to load places");
          }
        });
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load map");
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, []);

  const googleUrl = buildGoogleMapsUrl(run);

  function loadTop10Route() {
    const features = top10FeaturesRef.current;
    if (!features || !features.length) {
      alert("Top 10 data isn’t loaded yet. Try again in a moment.");
      return;
    }

    const items: RunItem[] = (features as any[]).map((f) => {
      const props = f.properties || {};
      const id = String(props.id ?? "");
      const rawTitle = props.title ?? "Untitled";
      const hideNumber = props.hide_number === true;
      const address = hideNumber ? stripHouseNumber(rawTitle) : rawTitle;
      const suburb = props.suburb ?? null;
      const [lng, lat] = f.geometry.coordinates as [number, number];

      return {
        id,
        address,
        suburb,
        lat,
        lng,
      };
    });

    saveRun(items);
    setRunOpen(true);
  }

  return (
    <main className="relative h-[calc(100vh-4rem)]">
      {error ? (
        <div className="p-6 text-yellow-800 bg-yellow-100 border border-yellow-200 rounded-md m-4">
          {error}
        </div>
      ) : (
        <>
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* 🧭 My Run panel */}
          <div className="absolute right-2 sm:right-4 max-w-[90vw] sm:max-w-xs text-sm bottom-[5.5rem] sm:bottom-4">
            {/* Trigger buttons only when panel is CLOSED */}
            {!runOpen && (
              <>
                {/* Desktop / tablet: pill button with label + count */}
                <button
                  onClick={() => setRunOpen(true)}
                  className={
                    "hidden sm:flex w-full mb-2 items-center justify-between rounded-full text-[13px] font-semibold tracking-wide uppercase shadow" +
                    (runPulse ? " run-pulse" : "")
                  }
                  style={{
                    background: "linear-gradient(135deg, #7e0a17, #c4142d)",
                    color: "#ffffff",
                    padding: "6px 12px",
                  }}
                >
                  <span>My Run</span>

                  <span
                    className="inline-flex items-center justify-center rounded-full bg-white ml-3"
                    style={{
                      color: "#c4142d",
                      minWidth: "26px",
                      height: "24px",
                      padding: "0 6px",
                      fontSize: "12px",
                    }}
                  >
                    {run.length}
                  </span>
                </button>

                {/* Mobile: compact pill with label + count */}
                <button
                  onClick={() => setRunOpen(true)}
                  className={
                    "sm:hidden flex items-center gap-2 mb-2 rounded-full shadow-lg border border-white px-3 py-2" +
                    (runPulse ? " run-pulse" : "")
                  }
                  style={{
                    background: "linear-gradient(135deg, #7e0a17, #c4142d)",
                    color: "#ffffff",
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    My Run
                  </span>
                  <span
                    className="inline-flex items-center justify-center rounded-full bg-white"
                    style={{
                      color: "#c4142d",
                      minWidth: "22px",
                      height: "22px",
                      padding: "0 4px",
                      fontSize: "11px",
                    }}
                  >
                    {run.length}
                  </span>
                </button>
              </>
            )}

            {/* Panel – shows when runOpen = true */}
            {runOpen && (
              <div
                className="bg-white rounded-xl shadow-xl p-4 max-h-80 overflow-auto"
                style={{ border: "1px solid #efefef" }}
              >
                {/* Panel header + close button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                    My Run
                  </div>
                  <button
                    type="button"
                    onClick={() => setRunOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full border text-xs text-gray-600 hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>

                {run.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    Tap a pin and choose &ldquo;Add to run&rdquo; to build your
                    route.
                  </div>
                ) : (
                  <>
                    {/* Stops list */}
                    <ol className="space-y-2 mb-3">
                      {run.map((r, idx) => (
                        <li key={r.id}>
                          <div className="mx-auto flex items-center justify-between gap-4 w-full max-w-xs">
                            <div className="pr-2">
                              <div className="text-xs text-gray-500">
                                Stop {idx + 1}
                              </div>
                              <div className="font-medium">{r.address}</div>
                              {r.suburb && (
                                <div className="text-xs text-gray-500">
                                  {r.suburb}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => removeFromRun(r.id)}
                              className="px-3 py-1.5 rounded-full border font-semibold text-[13px] uppercase tracking-wide"
                              style={{
                                borderColor: "#c4142d",
                                color: "#c4142d",
                                backgroundColor: "#ffffff",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>

                    {googleUrl && (
                      <>
                        {/* Big red button */}
                        <a
                          href={googleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center text-[13px] font-semibold uppercase tracking-wide rounded-full py-2"
                          style={{
                            background:
                              "linear-gradient(135deg, #7e0a17, #c4142d)",
                            color: "#ffffff",
                          }}
                        >
                          Open in Google Maps
                        </a>

                        {/* Grey underlined links side-by-side */}
                        <div className="mt-1 flex justify-center gap-4">
                          <button
                            type="button"
                            onClick={loadTop10Route}
                            className="text-[11px] text-gray-500 underline"
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                            }}
                          >
                            Load Top 10 route
                          </button>

                          <button
                            type="button"
                            onClick={() => saveRun([])}
                            className="text-[11px] text-gray-500 underline"
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                            }}
                          >
                            Clear run
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
