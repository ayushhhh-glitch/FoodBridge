import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Users,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import {
  type DonationStatus,
  type FoodDonation,
  type NGOProfile,
  getExpiryMetrics,
  getRankedNgoMatches,
} from '../utils/matchingEngine';
import { PuneMap } from './PuneMap';

interface MatchingAndScheduleViewProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  selectedDonationId: string;
  activeNgoId: string;
  role: 'donor' | 'ngo';
  viewMode?: 'matching' | 'pickup-scheduling' | 'status-tracking';
  onSelectDonation: (id: string) => void;
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
}

const LIFECYCLE_STAGES: DonationStatus[] = [
  'Listed',
  'Matched',
  'Reserved',
  'Scheduled',
  'In Progress',
  'Collected',
  'Completed',
];

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const MatchingAndScheduleView: React.FC<MatchingAndScheduleViewProps> = ({
  donations,
  ngos,
  selectedDonationId,
  activeNgoId,
  role,
  viewMode = 'matching',
  onSelectDonation,
  onSelectNgo,
  onReserveMeals,
  onSchedulePickup,
  onAdvanceStatus,
}) => {
  const selectedDonation =
    donations.find((d) => d.id === selectedDonationId) || donations[0];

  const [reserveAmount, setReserveAmount] = useState<string>('50');
  const [pickupSlotLocal, setPickupSlotLocal] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedDonation) return;
    const defaultMeals =
      selectedDonation.availableQuantity > 0
        ? Math.min(100, selectedDonation.availableQuantity)
        : 0;
    setReserveAmount(String(defaultMeals));

    // Set default pickup slot inside the collection window
    const startMs = new Date(selectedDonation.pickupWindowStartISO).getTime();
    const endMs = new Date(selectedDonation.pickupWindowEndISO).getTime();
    const midMs = Math.max(Date.now() + 10 * 60000, Math.min(endMs - 15 * 60000, startMs + 30 * 60000));
    setPickupSlotLocal(toDateTimeLocal(new Date(midMs).toISOString()));
    setFeedback(null);
  }, [selectedDonation?.id, selectedDonation?.availableQuantity]);

  if (!selectedDonation) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-sm text-slate-600">
        No donations available to match. Create a new donation first.
      </div>
    );
  }

  const nowMs = Date.now();
  const expiry = getExpiryMetrics(
    selectedDonation.expiryTimeISO,
    nowMs,
    selectedDonation.status
  );
  const rankedMatches = getRankedNgoMatches(selectedDonation, ngos, nowMs);
  const activeNgo = ngos.find((n) => n.id === activeNgoId) || ngos[0];

  const handleReserve = (targetNgoId: string) => {
    const qty = Number(reserveAmount);
    const res = onReserveMeals(selectedDonation.id, targetNgoId, qty);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Could not reserve meals.' });
    } else {
      const ngoObj = ngos.find((n) => n.id === targetNgoId);
      setFeedback({
        type: 'success',
        message: `Reserved ${qty} meals for ${ngoObj?.name}. Inventory updated automatically.`,
      });
    }
  };

  const handleConfirmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupSlotLocal) {
      setFeedback({ type: 'error', message: 'Select a valid pickup date and time.' });
      return;
    }
    const iso = new Date(pickupSlotLocal).toISOString();
    const actor = selectedDonation.matchedNgoName || activeNgo.name;
    const res = onSchedulePickup(selectedDonation.id, actor, iso);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Invalid pickup slot.' });
    } else {
      setFeedback({
        type: 'success',
        message: `Pickup scheduled for ${new Date(iso).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })} with ${actor}.`,
      });
    }
  };

  const handleStepAdvance = (nextStatus: DonationStatus) => {
    const actor =
      role === 'ngo'
        ? selectedDonation.matchedNgoName || activeNgo.name
        : selectedDonation.organizationName;
    const res = onAdvanceStatus(selectedDonation.id, nextStatus, actor);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Cannot update status.' });
    } else {
      setFeedback({
        type: 'success',
        message: `Updated donation status to "${nextStatus}".`,
      });
    }
  };

  const currentStageIndex = LIFECYCLE_STAGES.indexOf(selectedDonation.status);

  const viewHeadings = {
    matching: {
      title: 'Smart NGO Matching & Geographic Compatibility',
      subtitle:
        'Rule-based evaluation scoring Distance (40%), Capacity (30%), Availability (20%), and Collection Window Fit (10%).',
    },
    'pickup-scheduling': {
      title: 'Pickup Window Scheduling & Dispatch Coordination',
      subtitle:
        'Confirm NGO collection slots verified to fall within the donor’s permitted pickup window and before safe food expiry.',
    },
    'status-tracking': {
      title: 'Real-Time Donation Lifecycle & Status Tracker',
      subtitle:
        'Audit every stage from initial listing and NGO reservation through temperature-verified collection and meal completion.',
    },
  }[viewMode];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
          {viewHeadings.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          {viewHeadings.subtitle}
        </p>
      </div>

      {/* Top Batch Selector & Summary Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <label
              htmlFor="select-donation-batch"
              className="block text-xs font-semibold text-slate-500 mb-1"
            >
              Select Active Donation Batch to Match, Reserve, or Track
            </label>
            <select
              id="select-donation-batch"
              value={selectedDonation.id}
              onChange={(e) => onSelectDonation(e.target.value)}
              className="w-full sm:w-[460px] px-3.5 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:border-[#10B981] focus:outline-none"
            >
              {donations.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.status}] {d.organizationName} — {d.foodName} ({d.availableQuantity}/
                  {d.originalQuantity} meals avail)
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block">Current Status</span>
              <span className="font-bold text-slate-900 text-sm">
                {selectedDonation.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Expiry Countdown</span>
              <span
                className={`font-mono font-bold text-sm ${
                  expiry.urgencyColor === 'red'
                    ? 'text-red-600'
                    : expiry.urgencyColor === 'yellow'
                    ? 'text-amber-600'
                    : 'text-[#064E3B]'
                }`}
              >
                {expiry.expiryStatus} · {expiry.formattedCountdown}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Inventory Balance</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                {selectedDonation.availableQuantity} Avail · {selectedDonation.reservedQuantity}{' '}
                Res · {selectedDonation.collectedQuantity} Coll
              </span>
            </div>
          </div>
        </div>

        {/* Distinct Collection Window vs Expiry Readout */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block">Location & Storage</span>
            <span className="font-medium text-slate-800">
              {selectedDonation.locationArea} · {selectedDonation.storageCondition}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Permitted Collection Window</span>
            <span className="font-mono text-slate-800">
              {new Date(selectedDonation.pickupWindowStartISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              –{' '}
              {new Date(selectedDonation.pickupWindowEndISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Safe Food Expiry Timestamp</span>
            <span className="font-mono font-semibold text-amber-800">
              {new Date(selectedDonation.expiryTimeISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({new Date(selectedDonation.expiryTimeISO).toLocaleDateString()})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Assigned / Matched NGO</span>
            <span className="font-semibold text-[#064E3B]">
              {selectedDonation.matchedNgoName || 'Awaiting NGO Reservation'}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          data-testid="workflow-feedback-banner"
          className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-medium ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 8-Stage Visual Lifecycle Status Tracker & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              Donation Collection Status & Interactive Lifecycle Tracker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track progress from initial listing through NGO reservation, pickup scheduling,
              collection, and community meal distribution.
            </p>
          </div>

          {expiry.expiryStatus !== 'Expired' && selectedDonation.status !== 'Expired' && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedDonation.status === 'Reserved' && (
                <span className="text-xs text-amber-700 font-medium">
                  Next: Confirm Pickup Slot below
                </span>
              )}
              {selectedDonation.status === 'Scheduled' && (
                <button
                  type="button"
                  onClick={() => handleStepAdvance('In Progress')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                >
                  Mark Pickup Dispatch In Progress
                </button>
              )}
              {(selectedDonation.status === 'Scheduled' ||
                selectedDonation.status === 'In Progress' ||
                selectedDonation.status === 'Reserved') && (
                <button
                  type="button"
                  onClick={() => handleStepAdvance('Collected')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Food Collected
                </button>
              )}
              {selectedDonation.status === 'Collected' && (
                <button
                  type="button"
                  onClick={() => handleStepAdvance('Completed')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                >
                  Complete Redistribution
                </button>
              )}
            </div>
          )}
        </div>

        {/* Visual Progress Steps */}
        {selectedDonation.status === 'Expired' || expiry.expiryStatus === 'Expired' ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
            Status: <strong>Expired</strong> — This food batch passed its safe consumption expiry
            timestamp before collection and has been locked to protect recipients.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isCompleted = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50 border-[#10B981] text-[#064E3B]'
                      : isCompleted
                      ? 'bg-slate-50 border-emerald-200 text-slate-800'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                    <span>0{idx + 1}</span>
                    <span className="font-sans text-[10px]">
                      {isCurrent ? 'Active' : isCompleted ? 'Done' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-xs font-bold mt-1">{stage}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Split: Smart NGO Matching Engine + Reservation & Pickup Scheduling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Ranked NGO Matches */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Smart NGO Matching Recommendations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Weighted Rule-Based Score: Distance (40%) · Capacity (30%) · Availability (20%) ·
                  Pickup Window (10%)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {rankedMatches.filter((m) => m.eligible).length} of {ngos.length} Eligible
              </span>
            </div>

            <div className="space-y-4">
              {rankedMatches.map((match, index) => {
                const isTop = index === 0 && match.eligible;
                return (
                  <div
                    key={match.ngo.id}
                    className={`p-5 rounded-xl border transition-colors ${
                      !match.eligible
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : isTop
                        ? 'bg-emerald-50/40 border-[#10B981]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-semibold text-[#064E3B]">
                            {isTop ? 'Top Recommended NGO' : `Rank #${index + 1}`}
                          </span>
                          <span>·</span>
                          <span>{match.ngo.area}</span>
                          <span>·</span>
                          <span>Demo Partner</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 font-display">
                          {match.ngo.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {match.explanation}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <div className="text-2xl font-extrabold font-mono tabular-nums text-[#064E3B]">
                          {match.totalScore}%
                        </div>
                        <div className="text-[11px] text-slate-500">Match Score</div>
                      </div>
                    </div>

                    {/* Factor Breakdown Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200/80 text-xs font-mono text-slate-600">
                      <div>
                        <span className="text-slate-400 block font-sans">Distance (40%)</span>
                        <span>
                          {match.distanceKm} km ({match.breakdown.distanceScore}/100)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans">Open Capacity (30%)</span>
                        <span>
                          {match.remainingCapacity} meals ({match.breakdown.capacityScore}/100)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans">Availability (20%)</span>
                        <span>{match.breakdown.availabilityScore}/100</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans">Window Fit (10%)</span>
                        <span>{match.breakdown.windowScore}/100</span>
                      </div>
                    </div>

                    {/* Quick Reserve Action for Eligible NGO */}
                    {match.eligible &&
                      selectedDonation.availableQuantity > 0 &&
                      expiry.expiryStatus !== 'Expired' && (
                        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`reserve-qty-${match.ngo.id}`}
                              className="text-xs font-medium text-slate-700"
                            >
                              Meals to Reserve:
                            </label>
                            <input
                              id={`reserve-qty-${match.ngo.id}`}
                              type="number"
                              min={1}
                              max={selectedDonation.availableQuantity}
                              value={reserveAmount}
                              onChange={(e) => setReserveAmount(e.target.value)}
                              className="w-24 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectNgo(match.ngo.id);
                              handleReserve(match.ngo.id);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                          >
                            Reserve for {match.ngo.name}
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Pickup Slot Scheduling + Map + Audit Timeline */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pickup Slot Scheduler Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 font-display mb-1">
              Confirm Pickup Schedule
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Select a pickup time strictly inside the donor’s permitted collection window (
              {new Date(selectedDonation.pickupWindowStartISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              to{' '}
              {new Date(selectedDonation.pickupWindowEndISO).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              ).
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label
                  htmlFor="acting-ngo-select"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Receiving NGO Partner
                </label>
                <select
                  id="acting-ngo-select"
                  value={activeNgo.id}
                  onChange={(e) => onSelectNgo(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white"
                >
                  {ngos.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="scheduled-pickup-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Proposed Pickup Date & Time *
                </label>
                <input
                  id="scheduled-pickup-input"
                  type="datetime-local"
                  value={pickupSlotLocal}
                  onChange={(e) => setPickupSlotLocal(e.target.value)}
                  disabled={expiry.expiryStatus === 'Expired'}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={expiry.expiryStatus === 'Expired'}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Confirm Pickup Slot Within Window
              </button>
            </form>
          </div>

          {/* Interactive Map for Selected Batch */}
          <PuneMap
            donations={donations}
            ngos={ngos}
            selectedDonationId={selectedDonation.id}
            onSelectDonation={onSelectDonation}
            heightClass="h-[280px]"
          />

          {/* Audit History Log */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 font-display mb-3">
              Batch Verification & Audit Log
            </h3>
            <div className="space-y-3">
              {selectedDonation.statusHistory.map((item, i) => (
                <div
                  key={`${item.status}-${i}`}
                  className="text-xs border-b border-slate-100 last:border-none pb-2.5 last:pb-0"
                >
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span className="font-semibold text-slate-800 font-sans">
                      {item.status} · {item.actor}
                    </span>
                    <span>
                      {new Date(item.timestampISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
