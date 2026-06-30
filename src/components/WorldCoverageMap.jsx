import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { COVERAGE_TIERS, getCoverage } from "@/utils/countryCoverage";
import { X } from "lucide-react";

export default function WorldCoverageMap() {
  const [worldGeo, setWorldGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then((r) => r.json())
      .then((d) => { setWorldGeo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const styleCountry = useCallback((feature) => {
    const iso = feature.properties?.ISO_A3;
    const tier = getCoverage(iso).tier;
    return {
      fillColor: COVERAGE_TIERS[tier].color,
      fillOpacity: 0.75,
      color: "#fff",
      weight: 0.8,
    };
  }, []);

  const onEachCountry = useCallback((feature, layer) => {
    const iso = feature.properties?.ISO_A3;
    const name = feature.properties?.ADMIN || feature.properties?.name || "Country";
    const coverage = getCoverage(iso);

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2.5, color: "#1a1a1a", fillOpacity: 0.9 });
      },
      mouseout: (e) => {
        e.target.setStyle(styleCountry(feature));
      },
      click: () => {
        setSelected({ name, iso, coverage });
      },
    });
  }, [styleCountry]);

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_#1a1a1a] overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              🌍 Interactive Coverage Map
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Click any country to see how SafeEats sources its data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COVERAGE_TIERS).map(([key, tier]) => (
              <div key={key} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-200">
                <div className="w-3.5 h-3.5 rounded-sm border border-black/10 flex-shrink-0" style={{ background: tier.color }} />
                <span className="text-xs font-bold text-slate-700">{tier.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: 460 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && worldGeo && (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri"
            />
            <GeoJSON key="world-coverage" data={worldGeo} style={styleCountry} onEachFeature={onEachCountry} />
            <ZoomControl position="bottomright" />
          </MapContainer>
        )}

        {/* Side panel on click */}
        {selected && (
          <div className="absolute top-3 right-3 z-[1000] bg-white border-2 border-slate-900 rounded-2xl shadow-xl px-5 py-4 min-w-[240px] max-w-[300px]">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-extrabold text-slate-900 text-base leading-tight pr-6">{selected.name}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5 mb-3">
              {selected.iso}
            </p>
            <div
              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full text-white mb-3"
              style={{ background: COVERAGE_TIERS[selected.coverage.tier].color }}
            >
              {COVERAGE_TIERS[selected.coverage.tier].label}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              {COVERAGE_TIERS[selected.coverage.tier].description}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">{selected.coverage.detail}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-400">
          Green = real-time API · Yellow = verified open data source · Blue = AI search fallback (195+ countries)
        </p>
      </div>
    </div>
  );
}