import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  type FoodDonation,
  type NGOProfile,
  getExpiryMetrics,
  getRankedNgoMatches,
} from '../utils/matchingEngine';

export const DELHI_NCR_CENTER_COORDS: [number, number] = [28.6139, 77.2090];
export const PUNE_CENTER_COORDS: [number, number] = DELHI_NCR_CENTER_COORDS;

interface PuneMapProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  selectedDonationId?: string;
  activeNgoId?: string;
  onSelectDonation?: (id: string) => void;
  onSelectNgo?: (ngoId: string) => void;
  onActionDonation?: (donationId: string) => void;
  onActionNgo?: (ngoId: string) => void;
  heightClass?: string;
}

export const PuneMap: React.FC<PuneMapProps> = ({
  donations,
  ngos,
  selectedDonationId,
  activeNgoId,
  onSelectDonation,
  onSelectNgo,
  onActionDonation,
  onActionNgo,
  heightClass = 'h-[420px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [markerFilter, setMarkerFilter] = useState<'all' | 'donors' | 'ngos'>('all');

  // Store latest callbacks in refs so Leaflet popup button listeners always invoke fresh handlers
  const onSelectDonationRef = useRef(onSelectDonation);
  const onSelectNgoRef = useRef(onSelectNgo);
  const onActionDonationRef = useRef(onActionDonation);
  const onActionNgoRef = useRef(onActionNgo);

  useEffect(() => {
    onSelectDonationRef.current = onSelectDonation;
    onSelectNgoRef.current = onSelectNgo;
    onActionDonationRef.current = onActionDonation;
    onActionNgoRef.current = onActionNgo;
  }, [onSelectDonation, onSelectNgo, onActionDonation, onActionNgo]);

  // Initialize Leaflet Map on Delhi NCR center coordinates [28.6139, 77.2090] with zoom 11
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: DELHI_NCR_CENTER_COORDS,
      zoom: 11,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    // Ensure proper tile sizing after mount and on container resize
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Render Donor (Green) and NGO (Blue) markers & popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const nowMs = Date.now();

    const selectedDonation =
      donations.find((d) => d.id === selectedDonationId) || donations[0];

    // 1. Render NGO / Recipient Organization Markers (Custom Blue Markers)
    if (markerFilter === 'all' || markerFilter === 'ngos') {
      ngos.forEach((ngo) => {
        const remainingCap = Math.max(0, ngo.maxMealCapacity - ngo.currentLoadMeals);
        const isActiveNgo = activeNgoId === ngo.id;
        const size = isActiveNgo ? 36 : 32;

        const ngoIcon = L.divIcon({
          className: 'custom-ngo-blue-marker',
          html: `<div data-testid="map-marker-ngo-${ngo.id}" style="background:#2563EB;color:#ffffff;width:${size}px;height:${size}px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;letter-spacing:0.02em;border:${
            isActiveNgo ? '3px solid #0F172A' : '2.5px solid #ffffff'
          };box-shadow:0 3px 10px rgba(37,99,235,0.45);cursor:pointer;" title="${ngo.name} (Recipient NGO)">NGO</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const marker = L.marker([ngo.lat, ngo.lng], {
          icon: ngoIcon,
          title: `${ngo.name} (NGO)`,
        });

        const popupEl = document.createElement('div');
        popupEl.style.fontFamily = 'var(--font-sans, sans-serif)';
        popupEl.style.minWidth = '230px';
        popupEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:800;color:#1D4ED8;background:#DBEAFE;padding:2px 7px;border-radius:4px;letter-spacing:0.04em;">ROLE: RECIPIENT NGO</span>
            <span style="font-size:10px;color:#64748B;font-family:monospace;">${ngo.area}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;line-height:1.3;">${ngo.name}</div>
          <div style="font-size:11.5px;color:#475569;margin-top:3px;">${ngo.address}</div>
          <div style="margin-top:8px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;font-size:11.5px;color:#0F172A;">
            <div>Required / Open Capacity: <strong style="color:#1D4ED8;">${remainingCap} meals</strong></div>
            <div style="font-size:10.5px;color:#64748B;margin-top:2px;">Max Daily Intake: ${ngo.maxMealCapacity} meals · Contact: ${ngo.contactPerson}</div>
          </div>
          <button
            type="button"
            data-testid="popup-match-ngo-btn"
            style="margin-top:9px;width:100%;padding:6px 10px;background:#2563EB;color:#ffffff;font-size:11.5px;font-weight:700;border:none;border-radius:6px;cursor:pointer;text-align:center;"
          >
            View & Match with NGO →
          </button>
        `;

        const actionBtn = popupEl.querySelector('button');
        if (actionBtn) {
          actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onSelectNgoRef.current) {
              onSelectNgoRef.current(ngo.id);
            }
            if (onActionNgoRef.current) {
              onActionNgoRef.current(ngo.id);
            }
            marker.closePopup();
          });
        }

        marker.bindPopup(popupEl);
        marker.on('click', () => {
          if (onSelectNgoRef.current) {
            onSelectNgoRef.current(ngo.id);
          }
        });

        marker.addTo(layerGroup);
      });
    }

    // 2. Render Surplus Food Donor Markers (Custom Green Markers)
    if (markerFilter === 'all' || markerFilter === 'donors') {
      donations.forEach((donation) => {
        const { formattedCountdown, expiryStatus } = getExpiryMetrics(
          donation.expiryTimeISO,
          nowMs,
          donation.status
        );
        const isSelected = selectedDonation?.id === donation.id;
        // Custom Emerald Green marker for Donors (#10B981), with subtle dark green border if selected
        const bgHex =
          expiryStatus === 'Expired' || donation.status === 'Expired'
            ? '#059669'
            : '#10B981';

        const size = isSelected ? 36 : 30;
        const donorIcon = L.divIcon({
          className: 'custom-donor-green-marker',
          html: `<div data-testid="map-marker-donor-${donation.id}" style="background:${bgHex};color:#ffffff;width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;border:${
            isSelected ? '3px solid #0F172A' : '2.5px solid #ffffff'
          };box-shadow:0 3px 10px rgba(16,185,129,0.45);cursor:pointer;" title="${donation.organizationName} (Donor)">${donation.availableQuantity || donation.originalQuantity}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const marker = L.marker([donation.lat, donation.lng], {
          icon: donorIcon,
          title: `${donation.organizationName} (Donor)`,
        });

        const popupEl = document.createElement('div');
        popupEl.style.fontFamily = 'var(--font-sans, sans-serif)';
        popupEl.style.minWidth = '235px';
        popupEl.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;font-weight:800;color:#065F46;background:#D1FAE5;padding:2px 7px;border-radius:4px;letter-spacing:0.04em;">ROLE: SURPLUS DONOR</span>
            <span style="font-size:10px;color:#64748B;font-family:monospace;">${donation.status}</span>
          </div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;line-height:1.3;">${donation.organizationName}</div>
          <div style="font-size:12px;font-weight:600;color:#047857;margin-top:2px;">${donation.foodName}</div>
          <div style="font-size:11.5px;color:#475569;margin-top:3px;">${donation.address} (${donation.locationArea})</div>
          <div style="margin-top:8px;padding:6px 8px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;font-size:11.5px;color:#0F172A;">
            <div>Available Meals: <strong style="color:#059669;">${donation.availableQuantity} / ${donation.originalQuantity} meals</strong></div>
            <div style="font-size:10.5px;color:#64748B;margin-top:2px;">${donation.storageCondition} · ${formattedCountdown}</div>
          </div>
          <button
            type="button"
            data-testid="popup-match-donation-btn"
            style="margin-top:9px;width:100%;padding:6px 10px;background:#10B981;color:#ffffff;font-size:11.5px;font-weight:700;border:none;border-radius:6px;cursor:pointer;text-align:center;"
          >
            View & Match Batch →
          </button>
        `;

        const actionBtn = popupEl.querySelector('button');
        if (actionBtn) {
          actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onSelectDonationRef.current) {
              onSelectDonationRef.current(donation.id);
            }
            if (onActionDonationRef.current) {
              onActionDonationRef.current(donation.id);
            }
            marker.closePopup();
          });
        }

        marker.bindPopup(popupEl);
        marker.on('click', () => {
          if (onSelectDonationRef.current) {
            onSelectDonationRef.current(donation.id);
          }
        });

        marker.addTo(layerGroup);
      });
    }

    // 3. Draw smart matching route lines from selected donation to top 2 eligible NGOs
    if (selectedDonation && markerFilter === 'all') {
      const ranked = getRankedNgoMatches(selectedDonation, ngos, nowMs).filter(
        (m) => m.eligible
      );
      ranked.slice(0, 2).forEach((match, idx) => {
        const polyline = L.polyline(
          [
            [selectedDonation.lat, selectedDonation.lng],
            [match.ngo.lat, match.ngo.lng],
          ],
          {
            color: idx === 0 ? '#10B981' : '#2563EB',
            weight: idx === 0 ? 3.5 : 2,
            dashArray: idx === 0 ? undefined : '6, 6',
            opacity: 0.85,
          }
        );
        polyline.bindTooltip(
          `${idx === 0 ? 'Top Match' : '2nd Match'}: ${match.ngo.name} (${match.totalScore}% · ${match.distanceKm} km)`,
          { sticky: true }
        );
        polyline.addTo(layerGroup);
      });
    }
  }, [donations, ngos, selectedDonationId, activeNgoId, markerFilter]);

  const handleRecenterPune = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(DELHI_NCR_CENTER_COORDS, 11, { animate: true });
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
      {/* Top Interactive Map Filter & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMarkerFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              markerFilter === 'all'
                ? 'bg-[#064E3B] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Locations ({donations.length + ngos.length})
          </button>
          <button
            type="button"
            onClick={() => setMarkerFilter('donors')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              markerFilter === 'donors'
                ? 'bg-[#10B981] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block" />
            <span>Donors ({donations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMarkerFilter('ngos')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              markerFilter === 'ngos'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB] inline-block" />
            <span>NGOs ({ngos.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleRecenterPune}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer font-mono"
        >
          Center Delhi NCR [28.6139, 77.2090]
        </button>
      </div>

      {/* Map Viewport with explicit minimum height */}
      <div
        ref={mapContainerRef}
        data-testid="pune-leaflet-map"
        className={`w-full min-h-[400px] ${heightClass}`}
      />

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block border border-white shadow-xs" />
            <span>Green Marker: Surplus Food Donor (Available Meals)</span>
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <span className="w-3 h-3 rounded-xs bg-[#2563EB] inline-block border border-white shadow-xs" />
            <span>Blue Marker: Recipient NGO / Community Kitchen</span>
          </span>
          <span>·</span>
          <span className="text-slate-500">Click any marker for details & matching</span>
        </div>
        <span className="font-mono text-slate-500">
          OpenStreetMap · Delhi NCR [28.6139, 77.2090]
        </span>
      </div>
    </div>
  );
};

