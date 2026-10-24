import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Filter,
  Search,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  type FoodCategory,
  type FoodDonation,
  type InventoryBadge,
  type NGOProfile,
  type UrgencyColor,
  calculateImpactSummary,
  getExpiryMetrics,
  getInventoryStatusBadge,
} from '../utils/matchingEngine';
import { MONTHLY_TREND_DATA } from '../data/puneSeedData';

interface InventoryViewProps {
  donations: FoodDonation[];
  onInspectDonation: (donationId: string) => void;
}

export const InventoryDashboardView: React.FC<InventoryViewProps> = ({
  donations,
  onInspectDonation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | InventoryBadge>('All');
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | UrgencyColor>('All');

  const nowMs = Date.now();
  const uniqueLocations = Array.from(new Set(donations.map((d) => d.locationArea)));
  const uniqueCategories: FoodCategory[] = [
    'Cooked Meals',
    'Bakery & Bread',
    'Fresh Produce',
    'Packaged & Dry',
    'Dairy & Beverages',
  ];

  const filteredDonations = donations.filter((d) => {
    const expiry = getExpiryMetrics(d.expiryTimeISO, nowMs, d.status);
    const badge = getInventoryStatusBadge(d, nowMs);

    if (
      searchQuery.trim() !== '' &&
      !d.foodName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !d.organizationName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (locationFilter !== 'All' && d.locationArea !== locationFilter) return false;
    if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && badge !== statusFilter) return false;
    if (urgencyFilter !== 'All' && expiry.urgencyColor !== urgencyFilter) return false;

    return true;
  });

  const totals = filteredDonations.reduce(
    (acc, d) => {
      acc.original += d.originalQuantity;
      acc.available += d.availableQuantity;
      acc.reserved += d.reservedQuantity;
      acc.collected += d.collectedQuantity;
      return acc;
    },
    { original: 0, available: 0, reserved: 0, collected: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
            Live Food Inventory Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time meal balance across all Delhi NCR donors tracking Original, Available, Reserved,
            and Collected quantities.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Showing {filteredDonations.length} of {donations.length} batches (Demo Data)
        </div>
      </div>

      {/* Aggregate Inventory Balance Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Original Listed Meals</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {totals.original.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Currently Available</div>
          <div className="text-2xl font-bold text-[#10B981] font-mono tabular-nums mt-1">
            {totals.available.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Reserved for Pickup</div>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">
            {totals.reserved.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Collected & Redistributed</div>
          <div className="text-2xl font-bold text-[#064E3B] font-mono tabular-nums mt-1">
            {totals.collected.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label
              htmlFor="inv-search"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Search Donor or Food
            </label>
            <input
              id="inv-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search biryani, bakery..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="inv-location"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Filter by Location
            </label>
            <select
              id="inv-location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="All">All Delhi NCR Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="inv-category"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Food Category
            </label>
            <select
              id="inv-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="inv-status"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Inventory Status
            </label>
            <select
              id="inv-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | InventoryBadge)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Collected">Collected</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="inv-urgency"
              className="block text-[11px] font-semibold text-slate-600 mb-1"
            >
              Expiry Urgency
            </label>
            <select
              id="inv-urgency"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as 'All' | UrgencyColor)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
            >
              <option value="All">All Urgency Levels</option>
              <option value="green">Green — Safe Window (&gt;3.5h)</option>
              <option value="yellow">Yellow — Expiring Soon (&lt;3.5h)</option>
              <option value="red">Red — Critical (&lt;90m) or Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3.5 px-4">Donor & Food Batch</th>
                <th className="py-3.5 px-4">Location & Storage</th>
                <th className="py-3.5 px-4 text-right">Original</th>
                <th className="py-3.5 px-4 text-right">Available</th>
                <th className="py-3.5 px-4 text-right">Reserved</th>
                <th className="py-3.5 px-4 text-right">Collected</th>
                <th className="py-3.5 px-4">Expiry & Window</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDonations.map((d) => {
                const expiry = getExpiryMetrics(d.expiryTimeISO, nowMs, d.status);
                const badge = getInventoryStatusBadge(d, nowMs);

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 max-w-[260px]">
                      <div className="font-bold text-slate-900 truncate">
                        {d.foodName}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {d.organizationName} · {d.category}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium">{d.locationArea}</div>
                      <div className="text-slate-500 mt-0.5">{d.storageCondition}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {d.originalQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#10B981]">
                      {d.availableQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-600">
                      {d.reservedQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#064E3B]">
                      {d.collectedQuantity}
                    </td>
                    <td className="py-3.5 px-4">
                      <div
                        className={`font-mono font-semibold ${
                          expiry.urgencyColor === 'red'
                            ? 'text-red-600'
                            : expiry.urgencyColor === 'yellow'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {expiry.formattedCountdown}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                        Win:{' '}
                        {new Date(d.pickupWindowStartISO).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        –
                        {new Date(d.pickupWindowEndISO).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          badge === 'Available'
                            ? 'text-[#10B981]'
                            : badge === 'Reserved'
                            ? 'text-amber-600'
                            : badge === 'Collected'
                            ? 'text-[#064E3B]'
                            : 'text-red-600'
                        }`}
                      >
                        {badge} ({d.status})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectDonation(d.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#064E3B] hover:text-white bg-emerald-50 hover:bg-[#10B981] rounded-md transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Manage Batch
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface ImpactDashboardViewProps {
  donations: FoodDonation[];
  ngos: NGOProfile[];
}

export const ImpactDashboardView: React.FC<ImpactDashboardViewProps> = ({
  donations,
  ngos,
}) => {
  const summary = calculateImpactSummary(donations, ngos);

  // Category distribution data calculated from actual donations
  const categoryMap: Record<string, { category: string; collected: number; available: number }> = {};
  for (const d of donations) {
    if (!categoryMap[d.category]) {
      categoryMap[d.category] = { category: d.category, collected: 0, available: 0 };
    }
    categoryMap[d.category].collected += d.collectedQuantity + d.reservedQuantity;
    categoryMap[d.category].available += d.availableQuantity;
  }
  const categoryChartData = Object.values(categoryMap);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
            Community Impact & Sustainability Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Live redistribution metrics computed from Delhi NCR donor batches and recipient NGO partners
            (Demo Data).
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Total Meals Collected</div>
          <div
            data-testid="impact-meals-collected"
            className="text-2xl sm:text-3xl font-extrabold text-[#064E3B] font-mono tabular-nums mt-1"
          >
            {summary.totalMealsCollected.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            +{summary.totalMealsReserved} meals currently reserved
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Food Waste Avoided</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#10B981] font-mono tabular-nums mt-1">
            {summary.foodWastePreventedKg.toLocaleString()} kg
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            ~{summary.co2AvoidedKg.toLocaleString()} kg CO2e prevented
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Completed Donations</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {summary.completedDonationsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            of {donations.length} total logged batches
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Active NGO Partners</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {summary.activeNgosCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Delhi NCR Cluster (Demo)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-500">Expired / Unclaimed</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono tabular-nums mt-1">
            {summary.expiredDonationsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Auto-locked by safety guard
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Redistribution Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Delhi NCR Monthly Meals Redistributed Trend (Demo Trajectory)
            </h3>
            <p className="text-xs text-slate-500">
              Cumulative meals recovered across partner hostels, hotels, and corporate campuses
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_TREND_DATA}>
                <defs>
                  <linearGradient id="emeraldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="mealsRedistributed"
                  name="Meals Redistributed"
                  stroke="#064E3B"
                  strokeWidth={2.5}
                  fill="url(#emeraldFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Live Session Meals by Food Category
            </h3>
            <p className="text-xs text-slate-500">
              Comparison of Collected/Reserved meals vs. Currently Available inventory
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip />
                <Bar
                  dataKey="collected"
                  name="Collected / Reserved Meals"
                  fill="#064E3B"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="available"
                  name="Available Meals"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* NGO Partner Capacity Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-bold text-slate-900 font-display mb-4">
          Registered Delhi NCR Recipient Organizations (Sample Demo Partners)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Delhi NCR Corridor</th>
                <th className="py-3 px-4">Supported Storage</th>
                <th className="py-3 px-4 text-right">Current Load</th>
                <th className="py-3 px-4 text-right">Max Capacity</th>
                <th className="py-3 px-4 text-right">Open Intake Slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ngos.map((ngo) => {
                const open = Math.max(0, ngo.maxMealCapacity - ngo.currentLoadMeals);
                return (
                  <tr key={ngo.id}>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {ngo.name}
                      <span className="block font-normal text-slate-500 text-[11px]">
                        {ngo.registrationLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{ngo.area}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {ngo.supportedStorage.join(' · ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {ngo.currentLoadMeals} meals
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {ngo.maxMealCapacity} meals
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#10B981]">
                      {open} meals
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
