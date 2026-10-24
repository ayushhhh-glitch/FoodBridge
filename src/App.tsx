/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Building2,
  PlusCircle,
  Scale,
  CalendarClock,
  Layers,
  Activity,
  BarChart3,
  Globe,
  RotateCcw,
} from 'lucide-react';
import {
  type DonationFormInput,
  type DonationStatus,
  type FoodDonation,
  type NGOProfile,
  PUNE_NEIGHBORHOOD_COORDS,
  advanceDonationStatus,
  getRankedNgoMatches,
  reserveDonationQuantity,
  scheduleDonationPickup,
} from './utils/matchingEngine';
import { createPuneNgos, createPuneSampleDonations } from './data/puneSeedData';
import { LandingWebsite } from './components/LandingWebsite';
import { DonorDashboardView, NgoDashboardView } from './components/RoleDashboards';
import { CreateDonationView } from './components/CreateDonationView';
import { MatchingAndScheduleView } from './components/MatchingAndScheduleView';
import {
  ImpactDashboardView,
  InventoryDashboardView,
} from './components/InventoryAndImpactView';

const STORAGE_KEY_DONATIONS = 'foodbridge_pune_donations_v1';
const STORAGE_KEY_NGOS = 'foodbridge_pune_ngos_v1';

export type WorkspaceTab =
  | 'donor-dashboard'
  | 'ngo-dashboard'
  | 'create-donation'
  | 'matching'
  | 'pickup-scheduling'
  | 'inventory'
  | 'status-tracking'
  | 'impact';

export default function App() {
  const [surface, setSurface] = useState<'website' | 'app'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'app' : 'website';
  });

  const [role, setRole] = useState<'donor' | 'ngo'>('donor');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('donor-dashboard');

  const [ngos, setNgos] = useState<NGOProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NGOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createPuneNgos();
  });

  const [donations, setDonations] = useState<FoodDonation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DONATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createPuneSampleDonations(Date.now());
  });

  const [selectedDonationId, setSelectedDonationId] = useState<string>(
    () => donations[0]?.id || 'don-pune-101'
  );
  const [activeNgoId, setActiveNgoId] = useState<string>(
    () => ngos[0]?.id || 'ngo-pune-1'
  );

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(donations));
    } catch {
      // ignore quota errors
    }
  }, [donations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NGOS, JSON.stringify(ngos));
    } catch {
      // ignore quota errors
    }
  }, [ngos]);

  // Live ticker every 30s to refresh countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleEnterApp = (targetRole: 'donor' | 'ngo', targetTab?: string) => {
    setRole(targetRole);
    if (targetTab) {
      setActiveTab(targetTab as WorkspaceTab);
    } else {
      setActiveTab(targetRole === 'donor' ? 'donor-dashboard' : 'ngo-dashboard');
    }
    setSurface('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleSwitch = (newRole: 'donor' | 'ngo') => {
    setRole(newRole);
    setActiveTab(newRole === 'donor' ? 'donor-dashboard' : 'ngo-dashboard');
  };

  const handleResetDemoData = () => {
    const freshNgos = createPuneNgos();
    const freshDonations = createPuneSampleDonations(Date.now());
    setNgos(freshNgos);
    setDonations(freshDonations);
    setSelectedDonationId(freshDonations[0].id);
    setActiveNgoId(freshNgos[0].id);
    localStorage.setItem(STORAGE_KEY_NGOS, JSON.stringify(freshNgos));
    localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(freshDonations));
  };

  const handleCreateDonation = (input: DonationFormInput): FoodDonation => {
    const nowMs = Date.now();
    const coords = PUNE_NEIGHBORHOOD_COORDS[input.locationArea] || {
      lat: 18.5204,
      lng: 73.8567,
    };

    const newDonation: FoodDonation = {
      id: `don-pune-${nowMs}`,
      donorName: input.donorName,
      organizationName: input.organizationName,
      donorType: input.donorType || 'Hostel / Canteen',
      foodName: input.foodName,
      category: input.category,
      originalQuantity: input.quantityMeals,
      availableQuantity: input.quantityMeals,
      reservedQuantity: 0,
      collectedQuantity: 0,
      preparationTimeISO: input.preparationTimeISO,
      expiryTimeISO: input.expiryTimeISO,
      pickupWindowStartISO: input.pickupWindowStartISO,
      pickupWindowEndISO: input.pickupWindowEndISO,
      locationArea: input.locationArea,
      address: input.address || input.locationArea,
      lat: coords.lat,
      lng: coords.lng,
      storageCondition: input.storageCondition,
      status: 'Matched',
      imageUrl: input.imageUrl,
      notes: input.notes,
      isDemoData: false,
      reservations: [],
      statusHistory: [
        {
          status: 'Listed',
          timestampISO: new Date(nowMs).toISOString(),
          actor: input.organizationName,
          note: `Listed ${input.quantityMeals} meals (${input.category}).`,
        },
      ],
    };

    // Auto-identify top NGO match
    const topMatch = getRankedNgoMatches(newDonation, ngos, nowMs).find(
      (m) => m.eligible
    );
    if (topMatch) {
      newDonation.matchedNgoId = topMatch.ngo.id;
      newDonation.matchedNgoName = topMatch.ngo.name;
      newDonation.statusHistory.push({
        status: 'Matched',
        timestampISO: new Date(nowMs).toISOString(),
        actor: 'FoodBridge Smart Matcher',
        note: `Top recommended partner: ${topMatch.ngo.name} (${topMatch.totalScore}% compatibility score).`,
      });
    }

    setDonations((prev) => [newDonation, ...prev]);
    setSelectedDonationId(newDonation.id);
    return newDonation;
  };

  const handleReserveMeals = (
    donationId: string,
    ngoId: string,
    meals: number
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    const targetNgo = ngos.find((n) => n.id === ngoId);
    if (!targetDonation || !targetNgo) {
      return { success: false, error: 'Donation or NGO record not found.' };
    }

    const result = reserveDonationQuantity(
      targetDonation,
      targetNgo,
      meals,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );
    setNgos((prev) =>
      prev.map((n) =>
        n.id === ngoId
          ? { ...n, currentLoadMeals: n.currentLoadMeals + meals }
          : n
      )
    );
    return { success: true };
  };

  const handleSchedulePickup = (
    donationId: string,
    ngoName: string,
    pickupISO: string
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) {
      return { success: false, error: 'Donation batch not found.' };
    }

    const result = scheduleDonationPickup(
      targetDonation,
      ngoName,
      pickupISO,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );
    return { success: true };
  };

  const handleAdvanceStatus = (
    donationId: string,
    nextStatus: DonationStatus,
    actorName: string
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) {
      return { success: false, error: 'Donation batch not found.' };
    }

    const result = advanceDonationStatus(
      targetDonation,
      nextStatus,
      actorName,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );
    return { success: true };
  };

  if (surface === 'website') {
    return (
      <LandingWebsite
        donations={donations}
        ngos={ngos}
        onEnterApp={handleEnterApp}
      />
    );
  }

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'donor-dashboard', label: 'Donor Dashboard', icon: Utensils },
    { id: 'ngo-dashboard', label: 'NGO Dashboard', icon: Building2 },
    { id: 'create-donation', label: 'Create Donation', icon: PlusCircle },
    { id: 'matching', label: 'NGO Matching', icon: Scale },
    { id: 'pickup-scheduling', label: 'Pickup Scheduling', icon: CalendarClock },
    { id: 'inventory', label: 'Inventory Tracking', icon: Layers },
    { id: 'status-tracking', label: 'Status Tracking', icon: Activity },
    { id: 'impact', label: 'Impact Dashboard', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] text-slate-900">
      {/* Sidebar Navigation (260px on desktop) */}
      <aside className="w-full lg:w-64 bg-[#064E3B] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-emerald-900">
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-5 border-b border-emerald-800/80">
            <button
              type="button"
              onClick={() => setSurface('website')}
              className="text-left cursor-pointer"
            >
              <span className="text-xl font-extrabold tracking-tight text-white font-display block">
                FoodBridge
              </span>
              <span className="text-[11px] text-emerald-300 block">
                Pune Redistribution Platform
              </span>
            </button>
          </div>

          {/* Demo Role Switcher */}
          <div className="my-5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800">
            <div className="text-[11px] font-semibold text-emerald-300 mb-2">
              Demo Mode Role Switcher
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleRoleSwitch('donor')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  role === 'donor'
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                Donor Mode
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch('ngo')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  role === 'ngo'
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                NGO Mode
              </button>
            </div>
          </div>

          {/* 8 Functional Application Pages */}
          <nav aria-label="Application Workspace Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#10B981] text-white'
                      : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Return to Public Website & Reset Demo Controls */}
        <div className="p-5 border-t border-emerald-800/80 space-y-2.5">
          <button
            type="button"
            onClick={() => setSurface('website')}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-100 bg-emerald-900/60 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Website Home</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pune Demo Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract for SaaS Workspace */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 truncate">
            <span className="font-semibold text-slate-900">
              {role === 'donor' ? 'Surplus Donor Workspace' : 'Recipient NGO Workspace'}
            </span>
            <span>/</span>
            <span className="text-[#064E3B] font-semibold truncate">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
            <span className="hidden md:inline text-slate-400">·</span>
            <span className="hidden md:inline text-xs text-slate-500">
              Pune, Maharashtra (Demo Mode)
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('create-donation')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + New Donation
            </button>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'donor-dashboard' && (
            <DonorDashboardView
              donations={donations}
              ngos={ngos}
              onNavigateTab={(tab, donId) => {
                if (donId) setSelectedDonationId(donId);
                setActiveTab(tab as WorkspaceTab);
              }}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {activeTab === 'ngo-dashboard' && (
            <NgoDashboardView
              donations={donations}
              ngos={ngos}
              activeNgoId={activeNgoId}
              onSelectNgo={setActiveNgoId}
              onReserveMeals={handleReserveMeals}
              onSchedulePickup={handleSchedulePickup}
              onAdvanceStatus={handleAdvanceStatus}
              onInspectInMatcher={(donId) => {
                setSelectedDonationId(donId);
                setActiveTab('matching');
              }}
            />
          )}

          {activeTab === 'create-donation' && (
            <CreateDonationView
              onCreateDonation={handleCreateDonation}
              onSuccessNavigate={(newId) => {
                setSelectedDonationId(newId);
                setActiveTab('matching');
              }}
            />
          )}

          {(activeTab === 'matching' ||
            activeTab === 'pickup-scheduling' ||
            activeTab === 'status-tracking') && (
            <MatchingAndScheduleView
              donations={donations}
              ngos={ngos}
              selectedDonationId={selectedDonationId}
              activeNgoId={activeNgoId}
              role={role}
              viewMode={activeTab}
              onSelectDonation={setSelectedDonationId}
              onSelectNgo={setActiveNgoId}
              onReserveMeals={handleReserveMeals}
              onSchedulePickup={handleSchedulePickup}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryDashboardView
              donations={donations}
              onInspectDonation={(donId) => {
                setSelectedDonationId(donId);
                setActiveTab('matching');
              }}
            />
          )}

          {activeTab === 'impact' && (
            <ImpactDashboardView donations={donations} ngos={ngos} />
          )}
        </main>
      </div>
    </div>
  );
}
