import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  type FoodDonation,
  type NGOProfile,
  getExpiryMetrics,
  getRankedNgoMatches,
} from '../utils/matchingEngine';

interface PuneMapProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  selectedDonationId?: string;
  onSelectDonation?: (id: string) => void;
  heightClass?: string;
}

export const PuneMap: React.FC<PuneMapProps> = ({
  donations,
  ngos,
  selectedDonationId,
  onSelectDonation,
  heightClass = 'h-[420px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [18.536, 73.8475],
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const nowMs = Date.now();

    const selectedDonation =
      donations.find((d) => d.id === selectedDonationId) || donations[0];

    // Render NGO markers
    ngos.forEach((ngo) => {
      const remainingCap = Math.max(0, ngo.maxMealCapacity - ngo.currentLoadMeals);
      const ngoIcon = L.divIcon({
        className: 'custom-ngo-marker',
        html: `<div style="background:#064E3B;color:#ffffff;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.28);">NGO</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([ngo.lat, ngo.lng], { icon: ngoIcon });
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:190px;">
          <div style="font-size:11px;color:#047857;font-weight:600;">RECIPIENT NGO (DEMO)</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${ngo.name}</div>
          <div style="font-size:12px;color:#475569;margin-top:2px;">${ngo.area}</div>
          <div style="font-size:12px;color:#0F172A;margin-top:6px;">Open Capacity: <strong>${remainingCap} meals</strong> (Max ${ngo.maxMealCapacity})</div>
          <div style="font-size:11px;color:#64748B;margin-top:3px;">Contact: ${ngo.contactPerson}</div>
        </div>
      `);
      marker.addTo(layerGroup);
    });

    // Render Donation markers
    donations.forEach((donation) => {
      const { urgencyColor, formattedCountdown } = getExpiryMetrics(
        donation.expiryTimeISO,
        nowMs,
        donation.status
      );
      const isSelected = selectedDonation?.id === donation.id;
      const bgHex =
        donation.status === 'Completed' || donation.status === 'Collected'
          ? '#0D9488'
          : urgencyColor === 'red'
          ? '#DC2626'
          : urgencyColor === 'yellow'
          ? '#D97706'
          : '#10B981';

      const size = isSelected ? 34 : 26;
      const donorIcon = L.divIcon({
        className: 'custom-donor-marker',
        html: `<div style="background:${bgHex};color:#ffffff;width:${size}px;height:${size}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:${
          isSelected ? '3px solid #0F172A' : '2px solid #ffffff'
        };box-shadow:0 2px 8px rgba(0,0,0,0.3);">${donation.originalQuantity}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([donation.lat, donation.lng], { icon: donorIcon });
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:205px;">
          <div style="font-size:11px;color:#64748B;font-weight:600;">${donation.organizationName}</div>
          <div style="font-size:13px;font-weight:700;color:#0F172A;margin-top:2px;">${donation.foodName}</div>
          <div style="font-size:12px;color:#0F172A;margin-top:6px;">Available: <strong>${donation.availableQuantity}</strong> / ${donation.originalQuantity} meals</div>
          <div style="font-size:12px;color:#475569;margin-top:2px;">Status: <strong>${donation.status}</strong> · ${formattedCountdown}</div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectDonation) {
          onSelectDonation(donation.id);
        }
      });

      marker.addTo(layerGroup);
    });

    // Draw smart matching lines from selected donation to top 2 eligible NGOs
    if (selectedDonation) {
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
            color: idx === 0 ? '#10B981' : '#F59E0B',
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
  }, [donations, ngos, selectedDonationId, onSelectDonation]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      <div
        ref={mapContainerRef}
        data-testid="pune-leaflet-map"
        className={`w-full ${heightClass}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-slate-900">Pune Live Redistribution Map</span>
          <span>·</span>
          <span>Emerald Circle: Available Donor Batch (Meal Count)</span>
          <span>·</span>
          <span>Amber/Red Circle: Urgent / Expired</span>
          <span>·</span>
          <span>Dark Green Square: Registered NGO Kitchen</span>
        </div>
        <span className="font-mono text-slate-500">OpenStreetMap · Pune 18.52°N, 73.85°E</span>
      </div>
    </div>
  );
};
