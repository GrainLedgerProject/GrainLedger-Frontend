import { toast } from "@/app/store/feedbackStore";
import React, { useEffect, useRef, useState, useCallback, useEffectEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Crosshair,
  NavigationArrow,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsOut,
  ArrowsIn,
  MagnifyingGlass,
  CircleNotch,
  X,
} from "@phosphor-icons/react";

export interface LatLngPoint {
  lat: number;
  lng: number;
  formatted: string;
}

export interface MapLocationPickerProps {
  value?: string | [number, number]; // e.g. "10.3541, 106.0125" or [lat, lng]
  polygon?: [number, number][][];
  onChange: (point: LatLngPoint) => void;
  className?: string;
  height?: number | string;
  disabled?: boolean;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

function createPinIcon() {
  return L.divIcon({
    className: "gl-map-pin",
    html: `
      <div style="width: 34px; height: 46px; position: relative; pointer-events: none; margin: 0; padding: 0;">
        <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.38));">
          <!-- Teardrop Pin body: tip points exactly at coordinate (17, 44) -->
          <path d="M17 2C8.716 2 2 8.716 2 17C2 28.5 17 44 17 44C17 44 32 28.5 32 17C32 8.716 25.284 2 17 2Z" fill="#2F6B3A" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
          <!-- Inner target focal indicator -->
          <circle cx="17" cy="17" r="5" fill="#FFFFFF"/>
          <circle cx="17" cy="17" r="2.5" fill="#2F6B3A"/>
        </svg>
      </div>
    `,
    iconSize: [34, 46],
    iconAnchor: [17, 44],
    popupAnchor: [0, -44],
  });
}

function parseCoordinates(input?: string | [number, number]): { lat: number; lng: number } {
  const defaultCoord = { lat: 10.3541, lng: 106.0125 }; // Cái Bè, Tiền Giang
  if (!input) return defaultCoord;

  if (Array.isArray(input) && input.length >= 2) {
    return { lat: Number(input[0]) || defaultCoord.lat, lng: Number(input[1]) || defaultCoord.lng };
  }

  if (typeof input === "string") {
    // Check if JSON array: "[106.0125, 10.3541]" (GeoJSON: lng, lat)
    const trimmed = input.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          // GeoJSON standard is [longitude, latitude]
          if (parsed[0] > 50 && parsed[1] < 30) {
            return { lat: Number(parsed[1]), lng: Number(parsed[0]) };
          }
          return { lat: Number(parsed[0]), lng: Number(parsed[1]) };
        }
      } catch {
        // fallback to comma split
      }
    }

    // Comma separated: "10.3541, 106.0125" (lat, lng)
    const parts = trimmed.split(",").map((p) => parseFloat(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      // If first is > 50 and second is < 30, it might be lng, lat
      if (parts[0] > 50 && parts[1] < 30) {
        return { lat: parts[1], lng: parts[0] };
      }
      return { lat: parts[0], lng: parts[1] };
    }
  }

  return defaultCoord;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  polygon,
  onChange,
  className = "",
  height = 280,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const suppressedSearchRef = useRef<string | null>(null);

  const [initialCoord] = useState(() => parseCoordinates(value));
  const [pickedCoord, setPickedCoord] = useState(initialCoord);
  const currentCoord = value ? parseCoordinates(value) : pickedCoord;
  const [isLocating, setIsLocating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Address Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const updateLocation = useCallback(
    (lat: number, lng: number, panTo = true) => {
      const fixedLat = parseFloat(lat.toFixed(6));
      const fixedLng = parseFloat(lng.toFixed(6));
      const point: LatLngPoint = {
        lat: fixedLat,
        lng: fixedLng,
        formatted: `${fixedLat}, ${fixedLng}`,
      };

      setPickedCoord({ lat: fixedLat, lng: fixedLng });
      onChange(point);

      if (markerRef.current) {
        markerRef.current.setLatLng([fixedLat, fixedLng]);
      }

      if (panTo && mapRef.current) {
        mapRef.current.setView([fixedLat, fixedLng], mapRef.current.getZoom());
      }
    },
    [onChange]
  );

  const onMapPick = useEffectEvent((lat: number, lng: number, pan: boolean) => {
    if (!disabled) updateLocation(lat, lng, pan);
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [initialCoord.lat, initialCoord.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // Standard OSM Tile Layer with fast caching
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Attribution control in bottom-right
      L.control
        .attribution({ position: "bottomright", prefix: false })
        .addAttribution('© <a href="https://openstreetmap.org" target="_blank">OSM</a>')
        .addTo(map);

      // Initial Draggable Marker
      const marker = L.marker([initialCoord.lat, initialCoord.lng], {
        icon: createPinIcon(),
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onMapPick(pos.lat, pos.lng, false);
      });

      // Click to pick location
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapPick(e.latlng.lat, e.latlng.lng, true);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Force resize calculation after modal animation completes
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [initialCoord]);

  useEffect(() => {
    const dragging = markerRef.current?.dragging;
    if (disabled) dragging?.disable();
    else dragging?.enable();
  }, [disabled]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !polygon?.length) return;
    marker.remove();
    const boundary = L.polygon(
      polygon.map((ring) => ring.map(([longitude, latitude]) => L.latLng(latitude, longitude))),
      { color: "#2f6b3a" },
    ).addTo(map);
    map.fitBounds(boundary.getBounds(), { padding: [20, 20], maxZoom: 18 });
    return () => {
      boundary.remove();
      if (mapRef.current === map) marker.addTo(map);
    };
  }, [polygon]);

  // Sync external value changes
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || polygon) return;
    const position = marker.getLatLng();
    if (Math.abs(position.lat - currentCoord.lat) > 0.00001 || Math.abs(position.lng - currentCoord.lng) > 0.00001) {
      marker.setLatLng([currentCoord.lat, currentCoord.lng]);
      mapRef.current?.panTo([currentCoord.lat, currentCoord.lng]);
    }
  }, [currentCoord.lat, currentCoord.lng, polygon]);

  // Handle GPS location via Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.warning("Trình duyệt không hỗ trợ Geolocation.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        updateLocation(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Không thể lấy toạ độ GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
  };

  // Perform address search using OpenStreetMap Nominatim
  const handleSearch = useCallback(
    async (queryToSearch?: string) => {
      const q = (queryToSearch ?? searchQuery).trim();
      if (!q) {
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setIsDropdownOpen(true);

      try {
        // Query OpenStreetMap Nominatim with Vietnam prioritization
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=vn&limit=5&addressdetails=1`;

        const res = await fetch(url, {
          headers: {
            "Accept-Language": "vi,en",
          },
        });

        if (!res.ok) throw new Error("Không thể kết nối máy chủ bản đồ");
        const data = (await res.json()) as NominatimResult[];

        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
          setSearchError(null);
        } else {
          // Fallback search without country filter if no regional result
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              q
            )}&limit=5&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "vi,en",
              },
            }
          );
          const fallbackData = (await fallbackRes.json()) as NominatimResult[];
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            setSearchResults(fallbackData);
            setSearchError(null);
          } else {
            setSearchResults([]);
            setSearchError("Không tìm thấy địa chỉ phù hợp");
          }
        }
      } catch {
        setSearchResults([]);
        setSearchError("Không thể tìm kiếm địa chỉ lúc này");
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery]
  );

  // Debounced auto-search when typing
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) return;
    if (suppressedSearchRef.current === q) {
      suppressedSearchRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      void handleSearch(q);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle selection of a search result
  const handleSelectResult = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      updateLocation(lat, lng, true);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 15);
      }
      const nextLabel = item.display_name.split(",")[0];
      suppressedSearchRef.current = nextLabel.trim();
      setSearchQuery(nextLabel);
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Ensure Leaflet marker has clean transparent background and no borders */}
      <style>{`
        .gl-map-pin {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>

      {/* Header bar with coordinates display and GPS actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 font-mono text-xs text-ink-primary shadow-2xs">
          <MapPin size={14} className="text-accent-primary" weight="fill" />
          <span>
            {currentCoord.lat.toFixed(6)}, {currentCoord.lng.toFixed(6)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled || isLocating}
            onClick={handleGetCurrentLocation}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-overlay border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary font-medium text-xs transition-colors cursor-pointer"
            title="Lấy vị trí GPS hiện tại"
          >
            <Crosshair
              size={13}
              className={`text-accent-info ${isLocating ? "animate-spin" : ""}`}
            />
            <span>{isLocating ? "Đang định vị..." : "GPS của tôi"}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleExpand}
            className="p-1 rounded-md bg-surface-raised hover:bg-surface-overlay border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
            title={isExpanded ? "Thu nhỏ bản đồ" : "Phóng to bản đồ"}
          >
            {isExpanded ? <ArrowsIn size={14} /> : <ArrowsOut size={14} />}
          </button>
        </div>
      </div>

      {/* Address Search Bar */}
      <div ref={searchBoxRef} className="relative z-[500]">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim().length < 3) {
                setSearchResults([]);
                setSearchError(null);
              }
              setIsDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
                void handleSearch();
              }
            }}
            placeholder="Tìm địa chỉ (VD: Cái Bè, Cai Lậy, Sa Đéc, Tiền Giang, Cần Thơ...)"
            aria-label="Tìm địa chỉ trên bản đồ"
            disabled={disabled}
            className="w-full pl-8 pr-16 py-1.5 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none text-xs text-ink-primary placeholder:text-ink-tertiary shadow-2xs transition-colors"
          />
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 text-ink-tertiary pointer-events-none"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="p-1 rounded text-ink-tertiary hover:text-ink-primary transition-colors cursor-pointer"
                title="Xoá tìm kiếm"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="button"
              disabled={disabled || isSearching || !searchQuery.trim()}
              onClick={() => void handleSearch()}
              className="px-2.5 py-1 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isSearching ? (
                <CircleNotch size={12} className="animate-spin" />
              ) : (
                "Tìm"
              )}
            </button>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {isDropdownOpen && (searchResults.length > 0 || searchError || isSearching) && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-ink-tertiary/10 backdrop-blur-xs">
            {isSearching && searchResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-ink-secondary flex items-center justify-center gap-2">
                <CircleNotch size={14} className="animate-spin text-accent-primary" />
                <span>Đang tìm kiếm địa chỉ...</span>
              </div>
            ) : searchError && searchResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-ink-secondary">
                {searchError}
              </div>
            ) : (
              searchResults.map((item) => {
                const parts = item.display_name.split(",");
                const mainName = parts[0];
                const addressDetails = parts.slice(1).join(",").trim();
                return (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2.5 hover:bg-surface-raised dark:hover:bg-surface-overlay flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin size={15} className="text-accent-primary shrink-0 mt-0.5" weight="fill" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink-primary truncate">
                        {mainName}
                      </div>
                      <div className="text-xs text-ink-secondary truncate">
                        {addressDetails}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-ink-tertiary shrink-0">
                      {parseFloat(item.lat).toFixed(4)}, {parseFloat(item.lon).toFixed(4)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div
        className="relative rounded-xl border border-ink-tertiary/20 overflow-hidden shadow-xs bg-surface-raised"
        style={{ height: isExpanded ? 420 : height }}
      >
        <div ref={containerRef} className="w-full h-full z-0 cursor-crosshair" />

        {/* Floating Custom Map Controls */}
        <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1 shadow-md rounded-lg overflow-hidden border border-ink-tertiary/20 bg-surface-base/95 backdrop-blur-xs">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 hover:bg-surface-raised text-ink-primary transition-colors flex items-center justify-center border-b border-ink-tertiary/15 cursor-pointer"
            title="Phóng to"
          >
            <MagnifyingGlassPlus size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 hover:bg-surface-raised text-ink-primary transition-colors flex items-center justify-center cursor-pointer"
            title="Thu nhỏ"
          >
            <MagnifyingGlassMinus size={16} />
          </button>
        </div>

        {/* Bottom hint banner */}
        <div className="absolute left-3 bottom-3 z-[400] px-2.5 py-1 rounded-md bg-surface-base/90 dark:bg-surface-overlay/90 backdrop-blur-xs border border-ink-tertiary/20 text-[10px] text-ink-secondary flex items-center gap-1.5 shadow-sm">
          <NavigationArrow size={12} className="text-accent-primary" />
          <span>Nhấp chuột hoặc kéo ghim để định vị thửa ruộng</span>
        </div>
      </div>
    </div>
  );
};
export default MapLocationPicker;
