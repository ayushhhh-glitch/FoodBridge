import React, { useState } from 'react';
import {
  ArrowRight,
  Clock,
  MapPin,
  ShieldCheck,
  Truck,
  Utensils,
  BarChart3,
  Building2,
  CheckCircle2,
  Scale,
  HeartHandshake,
  Layers,
  PhoneCall,
  Mail,
  User,
  MessageSquare,
} from 'lucide-react';
import {
  type FoodDonation,
  type NGOProfile,
  calculateImpactSummary,
  getExpiryMetrics,
  getTwoWayContactDetails,
} from '../utils/matchingEngine';
import { PuneMap } from './PuneMap';
import {
  BatchDetailModal,
  DonorVerifiedBadge,
} from './VerificationAndContactComponents';

interface LandingWebsiteProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
  onEnterApp: (
    role: 'donor' | 'ngo',
    targetTab?: string,
    donationId?: string,
    ngoId?: string
  ) => void;
}

export const LandingWebsite: React.FC<LandingWebsiteProps> = ({
  donations,
  ngos,
  onEnterApp,
}) => {
  const [detailModalDonation, setDetailModalDonation] = useState<FoodDonation | null>(null);
  const nowMs = Date.now();
  const impact = calculateImpactSummary(donations, ngos, nowMs);

  // Baseline historical Delhi NCR demo pilot figures combined with live state
  const displayMealsRedistributed = 18420 + impact.totalMealsCollected;
  const displayWastePreventedKg = Math.round(displayMealsRedistributed * 0.42);
  const displaySuccessfulDonations = 142 + impact.completedDonationsCount;
  const displayNgoPartners = ngos.length;

  const activeSurplusBatches = donations
    .filter((d) => d.status !== 'Expired' && d.status !== 'Completed')
    .slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (5 concise nav links) — Zone 3 (1 primary CTA) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="text-xl font-extrabold tracking-tight text-[#064E3B] whitespace-nowrap shrink-0 font-display"
          >
            FoodBridge
          </a>

          <nav
            aria-label="Primary Website Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#how-it-works"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#our-impact"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Our Impact
            </a>
            <a
              href="#live-network"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              Delhi NCR Food Redistribution Network
            </a>
            <a
              href="#about"
              className="hover:text-[#064E3B] transition-colors whitespace-nowrap shrink-0"
            >
              About Mission
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onEnterApp('donor', 'donor-dashboard')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Donate Food
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
              {/* Left Column: Value Proposition & Actions */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-[#064E3B] mb-4">
                    PS-43 Community Food Donation Matcher · Delhi NCR Pilot (Demo Environment)
                  </p>
                  <h1
                    className="font-display font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-6"
                    style={{
                      fontSize: 'clamp(2.35rem, 4.2vw, 3.75rem)',
                      textWrap: 'balance',
                    }}
                  >
                    Good Food Deserves a Better Destination.
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
                    Connecting surplus food with communities that need it through
                    intelligent matching and seamless donation coordination.
                    FoodBridge pairs restaurants, hostels, and banquet kitchens
                    with nearby NGOs before safe consumption windows close.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3.5 mb-10">
                    <button
                      type="button"
                      onClick={() => onEnterApp('donor', 'create-donation')}
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                    >
                      <span>Donate Food</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnterApp('ngo', 'ngo-dashboard')}
                      className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Join as NGO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnterApp('donor', 'inventory')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Explore Donations</span>
                    </button>
                  </div>
                </div>

                {/* Live Snapshot Strip */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <div className="text-xs text-slate-500">Live Available in Delhi NCR</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {impact.totalMealsAvailable.toLocaleString()} meals
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Matching Algorithm</div>
                    <div className="text-xl sm:text-2xl font-bold text-[#064E3B] font-mono tabular-nums mt-0.5">
                      4-Factor Rule
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Safety Verification</div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-600 font-mono tabular-nums mt-0.5">
                      Dual-Window
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Custom Architectural Food Redistribution Illustration */}
              <div className="lg:col-span-5 flex">
                <div className="w-full rounded-2xl bg-[#064E3B] text-white p-6 sm:p-8 flex flex-col justify-between border border-emerald-900">
                  <div>
                    <div className="flex items-center justify-between text-xs text-emerald-200 mb-4">
                      <span>Redistribution Coordination Topology</span>
                      <span className="font-mono">DELHI NCR CLUSTER · LIVE DEMO</span>
                    </div>
                    <h2 className="text-lg font-bold text-white font-display mb-2">
                      Real-Time Surplus-to-Shelter Dispatch
                    </h2>
                    <p className="text-xs text-emerald-100/80 leading-relaxed mb-6">
                      Separating food safety expiry from pickup window slots ensures zero
                      expired meals are dispatched to community kitchens.
                    </p>
                  </div>

                  {/* Interactive SVG Diagram of Food Redistribution */}
                  <div className="my-2 bg-emerald-950/70 rounded-xl p-4 border border-emerald-800/80">
                    <svg
                      viewBox="0 0 420 250"
                      className="w-full h-auto"
                      role="img"
                      aria-label="Illustration of surplus food moving from donor kitchens through smart matching to NGO community kitchens"
                    >
                      <defs>
                        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="50%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>

                      {/* Background subtle grid */}
                      <g stroke="#065F46" strokeWidth="0.6" opacity="0.45">
                        <line x1="0" y1="50" x2="420" y2="50" />
                        <line x1="0" y1="125" x2="420" y2="125" />
                        <line x1="0" y1="200" x2="420" y2="200" />
                        <line x1="105" y1="0" x2="105" y2="250" />
                        <line x1="210" y1="0" x2="210" y2="250" />
                        <line x1="315" y1="0" x2="315" y2="250" />
                      </g>

                      {/* Connecting Curves */}
                      <path
                        d="M 105 65 C 155 65, 160 125, 210 125"
                        fill="none"
                        stroke="url(#routeGrad)"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M 105 185 C 155 185, 160 125, 210 125"
                        fill="none"
                        stroke="url(#routeGrad)"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M 210 125 C 265 125, 270 70, 325 70"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3"
                      />
                      <path
                        d="M 210 125 C 265 125, 270 180, 325 180"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Left Nodes: Surplus Donors */}
                      <g transform="translate(16, 36)">
                        <rect
                          width="96"
                          height="56"
                          rx="8"
                          fill="#022C22"
                          stroke="#F59E0B"
                          strokeWidth="1.5"
                        />
                        <text x="10" y="20" fill="#FCD34D" fontSize="9" fontWeight="700">
                          DONOR BATCH
                        </text>
                        <text x="10" y="34" fill="#FFFFFF" fontSize="10" fontWeight="600">
                          DU Central Hostel
                        </text>
                        <text x="10" y="46" fill="#A7F3D0" fontSize="8.5">
                          190 Meals · 60°C+
                        </text>
                      </g>

                      <g transform="translate(16, 156)">
                        <rect
                          width="96"
                          height="56"
                          rx="8"
                          fill="#022C22"
                          stroke="#10B981"
                          strokeWidth="1.5"
                        />
                        <text x="10" y="20" fill="#6EE7B7" fontSize="9" fontWeight="700">
                          CORP CANTEEN
                        </text>
                        <text x="10" y="34" fill="#FFFFFF" fontSize="10" fontWeight="600">
                          Nehru Place
                        </text>
                        <text x="10" y="46" fill="#A7F3D0" fontSize="8.5">
                          160 Meals · Listed
                        </text>
                      </g>

                      {/* Center Node: Smart Matcher */}
                      <g transform="translate(156, 86)">
                        <rect
                          width="108"
                          height="78"
                          rx="12"
                          fill="#10B981"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x="54"
                          y="22"
                          textAnchor="middle"
                          fill="#022C22"
                          fontSize="9"
                          fontWeight="800"
                        >
                          SMART MATCHER
                        </text>
                        <text
                          x="54"
                          y="37"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="600"
                        >
                          Dist 40% · Cap 30%
                        </text>
                        <text
                          x="54"
                          y="50"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="600"
                        >
                          Avail 20% · Win 10%
                        </text>
                        <text
                          x="54"
                          y="66"
                          textAnchor="middle"
                          fill="#022C22"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          Expiry Verified
                        </text>
                      </g>

                      {/* Right Nodes: Recipient NGOs */}
                      <g transform="translate(306, 40)">
                        <rect
                          width="98"
                          height="58"
                          rx="8"
                          fill="#022C22"
                          stroke="#34D399"
                          strokeWidth="1.5"
                        />
                        <text x="10" y="19" fill="#6EE7B7" fontSize="8.5" fontWeight="700">
                          95% MATCH SCORE
                        </text>
                        <text x="10" y="33" fill="#FFFFFF" fontSize="9.5" fontWeight="600">
                          Feeding India Hub
                        </text>
                        <text x="10" y="46" fill="#A7F3D0" fontSize="8.5">
                          Connaught Place
                        </text>
                      </g>

                      <g transform="translate(306, 152)">
                        <rect
                          width="98"
                          height="58"
                          rx="8"
                          fill="#022C22"
                          stroke="#34D399"
                          strokeWidth="1.2"
                        />
                        <text x="10" y="19" fill="#FCD34D" fontSize="8.5" fontWeight="700">
                          92% MATCH SCORE
                        </text>
                        <text x="10" y="33" fill="#FFFFFF" fontSize="9.5" fontWeight="600">
                          Akshaya Patra NCR
                        </text>
                        <text x="10" y="46" fill="#A7F3D0" fontSize="8.5">
                          Okhla · 400 Cap
                        </text>
                      </g>
                    </svg>
                  </div>

                  <div className="mt-4 pt-4 border-t border-emerald-800/80 flex items-center justify-between text-xs text-emerald-100">
                    <span>Dual Verification: Expiry vs. Pickup Window</span>
                    <button
                      type="button"
                      onClick={() => onEnterApp('donor', 'matching')}
                      className="font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                    >
                      Inspect Matching Engine →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT SECTION (Explicitly labeled as Demo Data) */}
        <section id="our-impact" className="py-16 bg-[#064E3B] text-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs font-medium text-emerald-300 mb-2">
                  Simulated Pilot Impact · Clearly Labeled Demo Data
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">
                  Measurable Community Redistribution across Delhi NCR
                </h2>
              </div>
              <p className="text-xs text-emerald-200 max-w-md">
                Note: Figures below combine baseline Delhi NCR hackathon demonstration data with your
                live browser session records. Organizations shown are sample profiles for
                demonstration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800">
                <div className="text-xs text-emerald-300">Meals Redistributed (Demo)</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-2 text-white">
                  {displayMealsRedistributed.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-200/80 mt-2">
                  Includes {impact.totalMealsCollected.toLocaleString()} meals from current session
                </div>
              </div>

              <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800">
                <div className="text-xs text-emerald-300">Food Waste Prevented (Demo)</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-2 text-[#10B981]">
                  {displayWastePreventedKg.toLocaleString()} kg
                </div>
                <div className="text-xs text-emerald-200/80 mt-2">
                  ~{Math.round(displayWastePreventedKg * 2.5).toLocaleString()} kg CO2e emissions avoided
                </div>
              </div>

              <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800">
                <div className="text-xs text-emerald-300">Successful Donations (Demo)</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-2 text-amber-400">
                  {displaySuccessfulDonations.toLocaleString()}
                </div>
                <div className="text-xs text-emerald-200/80 mt-2">
                  Temperature & expiry window verified before handover
                </div>
              </div>

              <div className="p-6 rounded-xl bg-emerald-950/60 border border-emerald-800">
                <div className="text-xs text-emerald-300">Sample NGO Partners (Delhi NCR)</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-2 text-white">
                  {displayNgoPartners}
                </div>
                <div className="text-xs text-emerald-200/80 mt-2">
                  Connaught Place · Hauz Khas · Okhla · Rohini · Mayur Vihar
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION (5 Steps) */}
        <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#10B981] mb-2">
              End-to-End Redistribution Workflow
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
              How FoodBridge Moves Surplus Meals in Five Steps
            </h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Every donation batch is tracked from kitchen preparation to community
              serving, enforcing strict separation between safe consumption expiry
              and collection pickup windows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                num: '01',
                title: 'List Surplus Food',
                desc: 'Donors log meal quantity, storage temperature, safe expiry time, and permitted pickup window.',
                actionLabel: 'Create Listing',
                tab: 'create-donation',
                role: 'donor' as const,
              },
              {
                num: '02',
                title: 'Find Suitable NGOs',
                desc: 'Rule-based engine scores Delhi NCR NGOs by distance (40%), capacity (30%), availability (20%), and window (10%).',
                actionLabel: 'View Matches',
                tab: 'matching',
                role: 'donor' as const,
              },
              {
                num: '03',
                title: 'Schedule Pickup',
                desc: 'Recipient NGOs reserve full or partial meal quantities and confirm a pickup slot inside the window.',
                actionLabel: 'Schedule Slot',
                tab: 'ngo-dashboard',
                role: 'ngo' as const,
              },
              {
                num: '04',
                title: 'Track Collection',
                desc: 'Live 8-stage timeline monitors progress from Listed and Reserved through In Progress and Collected.',
                actionLabel: 'Track Status',
                tab: 'status-tracking',
                role: 'donor' as const,
              },
              {
                num: '05',
                title: 'Create Impact',
                desc: 'Inventory balances and community impact metrics update automatically upon verified meal handover.',
                actionLabel: 'View Analytics',
                tab: 'impact',
                role: 'donor' as const,
              },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono font-semibold text-[#10B981] mb-3">
                    {step.num}. Step
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-display mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {step.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEnterApp(step.role, step.tab)}
                  className="text-xs font-semibold text-[#064E3B] hover:text-[#10B981] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES SECTION (Bento Grid) */}
        <section id="features" className="py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-[#064E3B] mb-2">
                Platform Capabilities
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                Engineered for Food Safety, Speed, and Accountability
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1: Spans 2 cols */}
              <div className="md:col-span-2 p-7 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#064E3B]">
                      01. Smart NGO Matching Engine
                    </span>
                    <Scale className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 font-display mb-2">
                    Weighted Multi-Factor Compatibility Scoring
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                    Calculates deterministic match scores using Haversine distance (40%),
                    remaining community kitchen meal capacity (30%), active dispatch
                    availability (20%), and collection window alignment (10%)—filtering out
                    organizations lacking required cold-chain or hot-insulated storage.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600 font-mono">
                  <span>Distance: 40% Weight</span>
                  <span>·</span>
                  <span>Capacity: 30% Weight</span>
                  <span>·</span>
                  <span>Availability: 20% Weight</span>
                  <span>·</span>
                  <span>Pickup Window: 10% Weight</span>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-7 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#064E3B]">
                      02. Expiry Tracking
                    </span>
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                    Live Countdown & Auto-Lock
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Continuous countdown timers classify batches as Available, Expiring
                    Soon, or Expired. Once a batch reaches its expiry timestamp,
                    reservations are automatically locked.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  Separate Expiry & Pickup Window Validation
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-7 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#064E3B]">
                      03. Pickup Scheduling
                    </span>
                    <Truck className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                    Window-Validated Slot Booking
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    NGO coordinators confirm exact pickup timestamps verified to fall
                    inside the donor’s permitted collection window and prior to food
                    spoilage deadlines.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  Zero Conflict Dispatch Coordination
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-7 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#064E3B]">
                      04. Inventory Management
                    </span>
                    <Layers className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                    Split-Batch Quantity Ledger
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Tracks Original, Available, Reserved, and Collected meal counts in
                    real time. Supports partial reservations by multiple NGOs while
                    preventing overbooking or negative inventory.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  Real-Time Quantity Reconciliation
                </div>
              </div>

              {/* Feature 5 & 6 */}
              <div className="p-7 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-[#064E3B]">
                      05. Status & Impact Analytics
                    </span>
                    <BarChart3 className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-display mb-2">
                    8-Stage Audit Trail & Charts
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Interactive progress timeline from Listed to Completed, paired with
                    live Recharts analytics measuring meals recovered, waste avoided, and
                    NGO partner throughput.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                  Full Lifecycle Transparency
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE DELHI NCR FOOD REDISTRIBUTION NETWORK MAP PREVIEW */}
        <section id="live-network" className="py-20 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#10B981] mb-2">
                Live Geographic Coverage · Delhi NCR (Central, South, North, East, West Delhi, Noida & Ghaziabad)
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
                Delhi NCR Food Redistribution Network
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onEnterApp('donor', 'matching')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Full Matching Console
            </button>
          </div>

          <PuneMap
            donations={donations}
            ngos={ngos}
            heightClass="h-[420px]"
            onActionDonation={(donId) => onEnterApp('donor', 'matching', donId)}
            onActionNgo={(ngoId) => onEnterApp('ngo', 'ngo-dashboard', undefined, ngoId)}
          />

          {/* ACTIVE SURPLUS BATCHES FEED (With Full Unmasked Donor Contact Info) */}
          <div className="mt-14">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold text-[#10B981] mb-1">
                  Direct Ground Coordination · Zero Contact Masking for NGOs
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
                  Active Surplus Batches — Live Delhi NCR Feed
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Verified donor contact details, gate loading bays, phone numbers, and WhatsApp
                  links are directly accessible for immediate NGO pickup dispatch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterApp('ngo', 'ngo-dashboard')}
                className="px-4 py-2 text-xs font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open NGO Recipient Portal →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSurplusBatches.map((batch) => {
                const expiry = getExpiryMetrics(batch.expiryTimeISO, nowMs, batch.status);
                const contact = getTwoWayContactDetails(batch, ngos);
                const { ngoSideSeesDonor } = contact;
                const cleanTel = `tel:${ngoSideSeesDonor.rawPhone.replace(/\s+/g, '')}`;
                const cleanMail = `mailto:${ngoSideSeesDonor.email}`;

                return (
                  <div
                    key={batch.id}
                    data-testid={`landing-batch-card-${batch.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition-colors"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-[#064E3B] border border-emerald-200">
                          {batch.status} · {batch.availableQuantity}/{batch.originalQuantity} Meals
                        </span>
                        <span
                          className={`text-xs font-mono font-semibold ${
                            expiry.urgencyColor === 'red'
                              ? 'text-red-600'
                              : expiry.urgencyColor === 'yellow'
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {expiry.formattedCountdown}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 font-display line-clamp-2">
                        {batch.foodName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {batch.category} · {batch.storageCondition}
                      </p>

                      {/* Dedicated Donor Contact Info Section Inside Batch Card */}
                      <div className="mt-4 p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-emerald-200/80">
                          <span className="font-bold uppercase tracking-wider text-[11px] text-[#064E3B]">
                            Donor Contact Info
                          </span>
                          <DonorVerifiedBadge
                            status={contact.donorVerificationStatus}
                            category={contact.donorOrganizationCategory}
                            documentType={contact.donorDocumentType}
                            compact
                          />
                        </div>

                        <div className="flex items-start gap-2 text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-[#064E3B] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              Donor Organization / Facility
                            </span>
                            <strong className="font-semibold text-slate-900">
                              {ngoSideSeesDonor.organizationName}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-slate-800">
                          <User className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              Ground Contact Person
                            </span>
                            <strong className="font-semibold text-slate-900">
                              {ngoSideSeesDonor.contactPerson}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-800">
                          <PhoneCall className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                          <a
                            href={cleanTel}
                            className="font-mono font-bold text-[#064E3B] hover:text-[#10B981] underline"
                          >
                            {ngoSideSeesDonor.phoneNumber}
                          </a>
                        </div>

                        <div className="flex items-center gap-2 text-slate-800">
                          <Mail className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                          <a
                            href={cleanMail}
                            className="font-mono text-[#064E3B] hover:text-[#10B981] underline truncate"
                          >
                            {ngoSideSeesDonor.email}
                          </a>
                        </div>

                        <div className="flex items-start gap-2 text-slate-800 pt-1 border-t border-emerald-200/60">
                          <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] text-slate-500 block">
                              Complete Pickup Location
                            </span>
                            <span className="font-medium text-slate-900">
                              {ngoSideSeesDonor.exactPickupGateAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons on Every Batch Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={cleanTel}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors"
                        >
                          <PhoneCall className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Call Donor</span>
                        </a>
                        <a
                          href={ngoSideSeesDonor.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailModalDonation(batch)}
                          className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Donor Contact Modal
                        </button>
                        <button
                          type="button"
                          onClick={() => onEnterApp('ngo', 'matching', batch.id)}
                          className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Reserve Meals →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ABOUT MISSION SECTION */}
        <section id="about" className="py-20 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold text-[#064E3B] mb-2">
                About FoodBridge (PS-43)
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight mb-4">
                Bridging the Gap Between Commercial Surplus and Community Nutrition
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4">
                Across urban centers like Delhi NCR, university hostels, corporate IT food
                courts, wedding banquets, and bakeries generate hundreds of wholesome
                surplus meals daily. Most go uncollected not from lack of goodwill,
                but because phone-tree coordination takes longer than the safe food
                holding window.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
                FoodBridge replaces ad-hoc messages with structured inventory tracking,
                explicit food expiry boundaries, and capacity-aware NGO matching so
                community kitchens can dispatch vehicles with certainty.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onEnterApp('donor', 'donor-dashboard')}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
                >
                  Launch Donor Portal
                </button>
                <button
                  type="button"
                  onClick={() => onEnterApp('ngo', 'ngo-dashboard')}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Launch NGO Portal
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#F8FAFC] p-7 rounded-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 font-display mb-4">
                Food Safety & Demo Governance Principles
              </h3>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Distinct Expiry vs. Collection Window:</strong>{' '}
                    Pickup slots must conclude prior to the microbiological food safety expiry timestamp.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Thermal & Storage Compatibility:</strong>{' '}
                    Matches verify whether batches require Hot Insulated (60°C+) or Cold Chain (0–4°C) transport.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900">Transparent Demo Mode:</strong>{' '}
                    All 5 Delhi NCR NGOs and 10 initial donations are clearly labeled as sample demonstration data.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* QUIET FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="text-lg font-bold text-white font-display mb-2">
              FoodBridge
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              PS-43 Community Food Donation Matcher. Connecting surplus food donors with
              registered NGOs and community kitchens across Delhi NCR.
            </p>
            <p className="text-xs text-slate-500">
               Coordination Desk: Connaught Place Innovation Hub, New Delhi 110001 · support@foodbridge-delhi.org
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-white mb-3">Quick Links</div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onEnterApp('donor', 'donor-dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Donor Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onEnterApp('ngo', 'ngo-dashboard')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  NGO Recipient Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onEnterApp('donor', 'inventory')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Live Food Inventory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onEnterApp('donor', 'impact')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Impact Analytics
                </button>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold text-white mb-3">Community & Social</div>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  Delhi NCR Zero-Waste Charter
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  FSSAI Surplus Handling Guide
                </a>
              </li>
              <li>
                <a href="#our-impact" className="hover:text-white transition-colors">
                  Open Impact Ledger (Demo)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <span>© 2026 FoodBridge Platform. Built for PS-43 Community Food Redistribution.</span>
          <span>Demo Environment · Persistent Browser Storage Enabled</span>
        </div>
      </footer>

      <BatchDetailModal
        donation={detailModalDonation}
        ngos={ngos}
        onClose={() => setDetailModalDonation(null)}
        onNavigateToMatcher={(donId) => onEnterApp('ngo', 'matching', donId)}
      />
    </div>
  );
};
