import React, { useState } from 'react';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Truck,
  Utensils,
  Building2,
  Scale,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  type DonationStatus,
  type DonorVerificationProfile,
  type FoodDonation,
  type NGOProfile,
  calculateImpactSummary,
  getExpiryMetrics,
  getRankedNgoMatches,
} from '../utils/matchingEngine';
import {
  BatchDetailModal,
  DonorVerifiedBadge,
  TwoWayContactUnlockCard,
  VerificationComplianceModule,
} from './VerificationAndContactComponents';

interface DonorDashboardProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  donorVerificationProfile: DonorVerificationProfile;
  onUpdateDonorVerification: (updated: DonorVerificationProfile) => void;
  isDemoMode: boolean;
  onNavigateTab: (tab: string, donationId?: string) => void;
  onAdvanceStatus: (donationId: string, nextStatus: DonationStatus, actorName: string) => {
    success: boolean;
    error?: string;
  };
}

export const DonorDashboardView: React.FC<DonorDashboardProps> = ({
  donations,
  ngos,
  donorVerificationProfile,
  onUpdateDonorVerification,
  isDemoMode,
  onNavigateTab,
  onAdvanceStatus,
}) => {
  const [tabFilter, setTabFilter] = useState<'active' | 'history'>('active');
  const [detailModalDonation, setDetailModalDonation] = useState<FoodDonation | null>(null);
  const nowMs = Date.now();
  const summary = calculateImpactSummary(donations, ngos, nowMs);

  const activeDonations = donations.filter((d) => {
    const expiry = getExpiryMetrics(d.expiryTimeISO, nowMs, d.status);
    return (
      d.status !== 'Completed' &&
      d.status !== 'Collected' &&
      d.status !== 'Expired' &&
      expiry.expiryStatus !== 'Expired'
    );
  });

  const historyDonations = donations.filter((d) => {
    const expiry = getExpiryMetrics(d.expiryTimeISO, nowMs, d.status);
    return (
      d.status === 'Completed' ||
      d.status === 'Collected' ||
      d.status === 'Expired' ||
      expiry.expiryStatus === 'Expired'
    );
  });

  const displayedList = tabFilter === 'active' ? activeDonations : historyDonations;

  return (
    <div className="space-y-8">
      {/* Header & Quick CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
              Donor Coordination Dashboard
            </h2>
            <DonorVerifiedBadge
              status={donorVerificationProfile.verificationStatus}
              category={donorVerificationProfile.organizationCategory}
              documentType={donorVerificationProfile.documentType}
            />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage surplus food listings, official compliance credentials, and two-way NGO pickup
            coordination across Delhi NCR.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('create-donation')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Food Donation</span>
        </button>
      </div>

      {/* Donor Official Document Verification & Compliance Module */}
      <VerificationComplianceModule
        verificationProfile={donorVerificationProfile}
        onUpdateVerification={onUpdateDonorVerification}
        isDemoMode={isDemoMode}
        defaultExpanded={false}
      />

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Active Open Batches</div>
          <div
            data-testid="donor-active-count"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1"
          >
            {activeDonations.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.totalMealsAvailable} meals awaiting reservation
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Reserved for Pickup</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {summary.totalMealsReserved}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Meals locked by Delhi NCR NGOs
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Meals Redistributed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] font-mono tabular-nums mt-1">
            {summary.totalMealsCollected}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.foodWastePreventedKg} kg food waste avoided
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Completed Handovers</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] font-mono tabular-nums mt-1">
            {summary.completedDonationsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {summary.expiredDonationsCount} expired / locked
          </div>
        </div>
      </div>

      {/* Segmented Control: Active Donations vs Donation History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTabFilter('active')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              tabFilter === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Donations ({activeDonations.length})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('history')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              tabFilter === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Donation History ({historyDonations.length})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          All sample Delhi NCR records are labeled as Demo Data
        </span>
      </div>

      {/* Donation Cards List */}
      <div className="space-y-4">
        {displayedList.map((donation) => {
          const expiry = getExpiryMetrics(
            donation.expiryTimeISO,
            nowMs,
            donation.status
          );
          const topMatch = getRankedNgoMatches(donation, ngos, nowMs).find(
            (m) => m.eligible
          );

          return (
            <div
              key={donation.id}
              className="bg-white rounded-xl border border-slate-200 p-6 transition-colors hover:border-slate-300"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {donation.organizationName}
                    </span>
                    <DonorVerifiedBadge
                      status={
                        donation.donorVerificationStatus ||
                        donorVerificationProfile.verificationStatus
                      }
                      category={
                        donation.donorOrganizationCategory ||
                        donorVerificationProfile.organizationCategory
                      }
                      documentType={
                        donation.donorDocumentType || donorVerificationProfile.documentType
                      }
                      compact
                    />
                    <span>·</span>
                    <span>{donation.locationArea}</span>
                    <span>·</span>
                    <span>{donation.category}</span>
                    <span>·</span>
                    <span>{donation.storageCondition}</span>
                    {donation.isDemoData && (
                      <>
                        <span>·</span>
                        <span className="text-slate-400">Demo Record</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {donation.foodName}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 font-mono">
                    <span>
                      Pickup Window:{' '}
                      {new Date(donation.pickupWindowStartISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      –
                      {new Date(donation.pickupWindowEndISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>·</span>
                    <span className="text-amber-800 font-semibold">
                      Safe Expiry:{' '}
                      {new Date(donation.expiryTimeISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Right Metrics & Status */}
                <div className="flex flex-wrap items-center gap-6 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500">Meal Inventory</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900">
                      {donation.availableQuantity} Avail / {donation.originalQuantity} Total
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {donation.reservedQuantity} Reserved · {donation.collectedQuantity} Collected
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500">Status & Expiry</div>
                    <div className="text-sm font-bold text-[#064E3B]">
                      {donation.status}
                    </div>
                    <div
                      className={`text-xs font-mono font-semibold ${
                        expiry.urgencyColor === 'red'
                          ? 'text-red-600'
                          : expiry.urgencyColor === 'yellow'
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {expiry.formattedCountdown}
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-Way Contact Details Unlock Card (Donor Perspective) */}
              <TwoWayContactUnlockCard
                donation={donation}
                ngos={ngos}
                viewerRole="donor"
                donorVerificationProfile={donorVerificationProfile}
                onOpenDetailModal={setDetailModalDonation}
              />

              {/* Bottom Action Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                  {donation.matchedNgoName ? (
                    <span>
                      Assigned Partner:{' '}
                      <strong className="text-[#064E3B]">{donation.matchedNgoName}</strong>
                      {donation.scheduledPickupTimeISO && (
                        <>
                          {' '}
                          · Pickup at{' '}
                          <span className="font-mono font-semibold">
                            {new Date(donation.scheduledPickupTimeISO).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </span>
                  ) : topMatch ? (
                    <span>
                      Top Smart Match:{' '}
                      <strong className="text-slate-900">{topMatch.ngo.name}</strong> (
                      <span className="font-mono font-semibold text-[#10B981]">
                        {topMatch.totalScore}% score
                      </span>{' '}
                      · {topMatch.distanceKm} km away)
                    </span>
                  ) : (
                    <span>No active NGO assignment</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('matching', donation.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Find NGO Matches & Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('status-tracking', donation.id)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Track Status Timeline
                  </button>
                  {(donation.status === 'Scheduled' || donation.status === 'In Progress') && (
                    <button
                      type="button"
                      onClick={() =>
                        onAdvanceStatus(
                          donation.id,
                          'Collected',
                          donation.organizationName
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Handover Collected
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BatchDetailModal
        donation={detailModalDonation}
        ngos={ngos}
        donorVerificationProfile={donorVerificationProfile}
        onClose={() => setDetailModalDonation(null)}
        onNavigateToMatcher={(donId) => onNavigateTab('matching', donId)}
      />
    </div>
  );
};

interface NgoDashboardProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  activeNgoId: string;
  donorVerificationProfile?: DonorVerificationProfile | null;
  onSelectNgo: (ngoId: string) => void;
  onReserveMeals: (donationId: string, ngoId: string, meals: number) => {
    success: boolean;
    error?: string;
  };
  onSchedulePickup: (donationId: string, ngoName: string, pickupISO: string) => {
    success: boolean;
    error?: string;
  };
  onAdvanceStatus: (donationId: string, nextStatus: DonationStatus, actorName: string) => {
    success: boolean;
    error?: string;
  };
  onInspectInMatcher: (donationId: string) => void;
}

export const NgoDashboardView: React.FC<NgoDashboardProps> = ({
  donations,
  ngos,
  activeNgoId,
  donorVerificationProfile,
  onSelectNgo,
  onReserveMeals,
  onSchedulePickup,
  onAdvanceStatus,
  onInspectInMatcher,
}) => {
  const activeNgo = ngos.find((n) => n.id === activeNgoId) || ngos[0];
  const [customReserveMap, setCustomReserveMap] = useState<Record<string, string>>({});
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  const [detailModalDonation, setDetailModalDonation] = useState<FoodDonation | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const nowMs = Date.now();
  const remainingCap = Math.max(0, activeNgo.maxMealCapacity - activeNgo.currentLoadMeals);

  // Donations available or already assigned to this NGO
  const relevantDonations = donations.filter((d) => !rejectedIds.includes(d.id));

  const handleQuickReserve = (donation: FoodDonation) => {
    const rawVal = customReserveMap[donation.id];
    const defaultMeals = Math.min(donation.availableQuantity, remainingCap || 50);
    const qty = rawVal !== undefined ? Number(rawVal) : defaultMeals;

    const res = onReserveMeals(donation.id, activeNgo.id, qty);
    if (!res.success) {
      setBanner({ type: 'error', text: res.error || 'Reservation failed.' });
    } else {
      setBanner({
        type: 'success',
        text: `${activeNgo.name} reserved ${qty} meals from "${donation.foodName}". Next: confirm pickup slot or mark collected.`,
      });
    }
  };

  const handleQuickConfirmWindowSlot = (donation: FoodDonation) => {
    const startMs = new Date(donation.pickupWindowStartISO).getTime();
    const endMs = new Date(donation.pickupWindowEndISO).getTime();
    const slotMs = Math.min(endMs - 10 * 60000, Math.max(startMs + 15 * 60000, Date.now() + 15 * 60000));
    const slotISO = new Date(slotMs).toISOString();

    const res = onSchedulePickup(donation.id, activeNgo.name, slotISO);
    if (!res.success) {
      setBanner({ type: 'error', text: res.error || 'Could not schedule slot.' });
    } else {
      setBanner({
        type: 'success',
        text: `Pickup scheduled for ${new Date(slotISO).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })} within donor collection window.`,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Active NGO Profile Switcher Header */}
      <div className="bg-[#064E3B] text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="text-xs text-emerald-300 font-medium mb-1">
            Recipient Organization Portal · {activeNgo.registrationLabel}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight">
            {activeNgo.name}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            {activeNgo.address} · Contact: {activeNgo.contactPerson} ({activeNgo.phone})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-emerald-950/70 px-4 py-2.5 rounded-lg border border-emerald-800 text-xs">
            <span className="text-emerald-300 block">Open Intake Capacity</span>
            <span className="text-lg font-bold font-mono tabular-nums text-white">
              {remainingCap} / {activeNgo.maxMealCapacity} meals
            </span>
          </div>

          <div>
            <label
              htmlFor="ngo-profile-selector"
              className="block text-[11px] text-emerald-200 mb-1"
            >
              Switch Active Demo NGO Profile
            </label>
            <select
              id="ngo-profile-selector"
              value={activeNgo.id}
              onChange={(e) => onSelectNgo(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white rounded-lg border border-emerald-300"
            >
              {ngos.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.area})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {banner && (
        <div
          role="status"
          data-testid="ngo-action-banner"
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
            banner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {banner.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Available & Assigned Donations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 font-display">
            Available Surplus Batches & Active NGO Pickups
          </h3>
          <span className="text-xs text-slate-500">
            Sorted by Compatibility & Urgency
          </span>
        </div>

        {relevantDonations.map((donation) => {
          const expiry = getExpiryMetrics(
            donation.expiryTimeISO,
            nowMs,
            donation.status
          );
          const matchInfo = getRankedNgoMatches(donation, [activeNgo], nowMs)[0];
          const isExpired = expiry.expiryStatus === 'Expired' || donation.status === 'Expired';
          const defaultQty = Math.min(donation.availableQuantity, remainingCap || 50);
          const inputQty =
            customReserveMap[donation.id] !== undefined
              ? customReserveMap[donation.id]
              : String(defaultQty);

          return (
            <div
              key={donation.id}
              className={`bg-white rounded-xl border p-6 ${
                isExpired ? 'border-red-200 bg-red-50/20 opacity-80' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#064E3B]">
                      {matchInfo.totalScore}% Compatibility Match
                    </span>
                    <span>·</span>
                    <span>{matchInfo.distanceKm} km from {activeNgo.area}</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-800">
                      {donation.organizationName}
                    </span>
                    <DonorVerifiedBadge
                      status={
                        donation.donorVerificationStatus ||
                        donorVerificationProfile?.verificationStatus ||
                        'verified'
                      }
                      category={
                        donation.donorOrganizationCategory ||
                        donorVerificationProfile?.organizationCategory
                      }
                      documentType={
                        donation.donorDocumentType || donorVerificationProfile?.documentType
                      }
                      compact
                    />
                    <span>·</span>
                    <span>{donation.storageCondition}</span>
                    <span>·</span>
                    {donation.isDemoData ? (
                      <span className="text-slate-400">Demo Record</span>
                    ) : (
                      <span className="font-semibold text-[#10B981]">
                        Live Firestore Batch
                      </span>
                    )}
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {donation.foodName}
                  </h4>

                  <p className="text-xs text-slate-600">
                    {matchInfo.explanation}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono text-slate-600">
                    <span>
                      Collection Window:{' '}
                      {new Date(donation.pickupWindowStartISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      –
                      {new Date(donation.pickupWindowEndISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>·</span>
                    <span className="text-amber-800 font-semibold">
                      Expiry:{' '}
                      {new Date(donation.expiryTimeISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      ({expiry.formattedCountdown})
                    </span>
                  </div>
                </div>

                {/* Quantities & Current Status */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Available to Reserve</div>
                    <div className="text-xl font-extrabold font-mono tabular-nums text-[#10B981]">
                      {donation.availableQuantity} / {donation.originalQuantity} meals
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Status: <strong className="text-slate-800">{donation.status}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-Way Contact Details Unlock Card (NGO Perspective) */}
              <TwoWayContactUnlockCard
                donation={donation}
                ngos={ngos}
                viewerRole="ngo"
                activeNgoId={activeNgo.id}
                donorVerificationProfile={donorVerificationProfile}
                onOpenDetailModal={setDetailModalDonation}
              />

              {/* NGO Action Controls */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                {isExpired ? (
                  <span className="text-xs font-semibold text-red-600">
                    Expired Batch — Locked against reservation for food safety compliance
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {donation.availableQuantity > 0 && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`ngo-res-qty-${donation.id}`}
                          className="text-xs font-medium text-slate-700"
                        >
                          Reserve Meals:
                        </label>
                        <input
                          id={`ngo-res-qty-${donation.id}`}
                          type="number"
                          min={1}
                          max={donation.availableQuantity}
                          value={inputQty}
                          onChange={(e) =>
                            setCustomReserveMap((prev) => ({
                              ...prev,
                              [donation.id]: e.target.value,
                            }))
                          }
                          className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickReserve(donation)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                        >
                          Accept & Reserve Food
                        </button>
                      </div>
                    )}

                    {donation.status === 'Reserved' && (
                      <button
                        type="button"
                        onClick={() => handleQuickConfirmWindowSlot(donation)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                      >
                        Schedule Pickup Slot
                      </button>
                    )}

                    {(donation.status === 'Scheduled' ||
                      donation.status === 'In Progress' ||
                      donation.status === 'Reserved') && (
                      <button
                        type="button"
                        onClick={() =>
                          onAdvanceStatus(donation.id, 'Collected', activeNgo.name)
                        }
                        className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Food Collected
                      </button>
                    )}

                    {donation.status === 'Collected' && (
                      <button
                        type="button"
                        onClick={() =>
                          onAdvanceStatus(donation.id, 'Completed', activeNgo.name)
                        }
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                      >
                        Mark Distribution Completed
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onInspectInMatcher(donation.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Open Full Scheduler & Map
                  </button>
                  {donation.status === 'Listed' && !isExpired && (
                    <button
                      type="button"
                      onClick={() =>
                        setRejectedIds((prev) => [...prev, donation.id])
                      }
                      className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Pass Batch
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BatchDetailModal
        donation={detailModalDonation}
        ngos={ngos}
        activeNgoId={activeNgo.id}
        donorVerificationProfile={donorVerificationProfile}
        onClose={() => setDetailModalDonation(null)}
        onNavigateToMatcher={onInspectInMatcher}
      />
    </div>
  );
};
