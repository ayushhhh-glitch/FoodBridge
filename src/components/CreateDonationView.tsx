import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Thermometer,
  Utensils,
} from 'lucide-react';
import {
  type DonationFormInput,
  type FoodCategory,
  type FoodDonation,
  type StorageCondition,
  PUNE_NEIGHBORHOOD_COORDS,
  validateDonationInput,
} from '../utils/matchingEngine';

interface CreateDonationViewProps {
  onCreateDonation: (input: DonationFormInput) => FoodDonation;
  onSuccessNavigate: (createdDonationId: string) => void;
}

const CATEGORIES: FoodCategory[] = [
  'Cooked Meals',
  'Bakery & Bread',
  'Fresh Produce',
  'Packaged & Dry',
  'Dairy & Beverages',
];

const STORAGE_OPTIONS: StorageCondition[] = [
  'Hot Insulated (60°C+)',
  'Refrigerated (0–4°C)',
  'Ambient / Room Temp',
  'Frozen (-18°C)',
];

const DONOR_TYPES: FoodDonation['donorType'][] = [
  'Restaurant',
  'Hostel / Canteen',
  'Event / Banquet',
  'Hotel',
  'Corporate Cafeteria',
];

function toDateTimeLocalString(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const CreateDonationView: React.FC<CreateDonationViewProps> = ({
  onCreateDonation,
  onSuccessNavigate,
}) => {
  const nowMs = Date.now();
  const min = 60000;
  const hr = 60 * min;

  const [donorName, setDonorName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [donorType, setDonorType] = useState<FoodDonation['donorType']>('Hostel / Canteen');
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Cooked Meals');
  const [quantityMeals, setQuantityMeals] = useState<string>('');
  const [preparationTime, setPreparationTime] = useState(
    toDateTimeLocalString(nowMs - 45 * min)
  );
  const [expiryTime, setExpiryTime] = useState(
    toDateTimeLocalString(nowMs + 4 * hr)
  );
  const [pickupStart, setPickupStart] = useState(
    toDateTimeLocalString(nowMs + 15 * min)
  );
  const [pickupEnd, setPickupEnd] = useState(
    toDateTimeLocalString(nowMs + 2.5 * hr)
  );
  const [locationArea, setLocationArea] = useState('Connaught Place, Central Delhi');
  const [address, setAddress] = useState('');
  const [storageCondition, setStorageCondition] = useState<StorageCondition>(
    'Hot Insulated (60°C+)'
  );
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrefillDemoSample = () => {
    const current = Date.now();
    setDonorName('Prof. Arvind Sharma');
    setOrganizationName('Delhi University Central Hostel');
    setDonorType('Hostel / Canteen');
    setFoodName('Freshly Prepared Rajma Chawal, Mix Veg & Roasted Papad');
    setCategory('Cooked Meals');
    setQuantityMeals('175');
    setPreparationTime(toDateTimeLocalString(current - 30 * min));
    setExpiryTime(toDateTimeLocalString(current + 3.5 * hr));
    setPickupStart(toDateTimeLocalString(current + 10 * min));
    setPickupEnd(toDateTimeLocalString(current + 2.2 * hr));
    setLocationArea('North Campus, Delhi');
    setAddress('Gate 2 Mess Loading Bay, Chhatra Marg, University Enclave, Delhi 110007');
    setStorageCondition('Hot Insulated (60°C+)');
    setNotes('Packed in 4 commercial stainless steel containers. Loading dock attendant available at Gate 2.');
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Number(quantityMeals);

    const candidate: Partial<DonationFormInput> = {
      donorName: donorName.trim(),
      organizationName: organizationName.trim(),
      donorType,
      foodName: foodName.trim(),
      category,
      quantityMeals: quantityMeals.trim() === '' ? NaN : parsedQty,
      preparationTimeISO: preparationTime ? new Date(preparationTime).toISOString() : '',
      expiryTimeISO: expiryTime ? new Date(expiryTime).toISOString() : '',
      pickupWindowStartISO: pickupStart ? new Date(pickupStart).toISOString() : '',
      pickupWindowEndISO: pickupEnd ? new Date(pickupEnd).toISOString() : '',
      locationArea,
      address: address.trim() || `${locationArea} Main Kitchen Dock`,
      storageCondition,
      imageUrl: imagePreview,
      notes: notes.trim(),
    };

    const validation = validateDonationInput(candidate, Date.now());
    if (!validation.valid) {
      setErrors(validation.errors);
      setCreatedMsg(null);
      return;
    }

    setErrors({});
    const created = onCreateDonation(candidate as DonationFormInput);
    setCreatedMsg(`Listed "${created.foodName}" (${created.originalQuantity} meals) and matched with Delhi NCR NGOs.`);
    setTimeout(() => {
      onSuccessNavigate(created.id);
    }, 350);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
            Create Surplus Food Donation
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Log meal quantities, storage conditions, and distinct food expiry vs. pickup collection windows.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrefillDemoSample}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fill Sample Delhi NCR Batch</span>
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          data-testid="donation-form-errors"
          className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900"
        >
          <div className="flex items-center gap-2 text-sm font-bold mb-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Please fix the following form validation errors before listing:</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 text-red-800">
            {Object.entries(errors).map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {createdMsg && (
        <div
          role="status"
          className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{createdMsg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-8"
      >
        {/* Section 1: Donor & Food Details */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-display mb-4 pb-2 border-b border-slate-100">
            01. Donor & Surplus Food Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="donor-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Donor Contact Name *
              </label>
              <input
                id="donor-name"
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g., Chef Vikramaditya Nair"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
              />
              {errors.donorName && (
                <p className="text-xs text-red-600 mt-1">{errors.donorName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="organization-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Organization / Kitchen Name *
              </label>
              <input
                id="organization-name"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g., Delhi University Central Hostel / Banquet Hall"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
              />
              {errors.organizationName && (
                <p className="text-xs text-red-600 mt-1">{errors.organizationName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="donor-type"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Donor Establishment Type
              </label>
              <select
                id="donor-type"
                value={donorType}
                onChange={(e) =>
                  setDonorType(e.target.value as FoodDonation['donorType'])
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#10B981] focus:outline-none"
              >
                {DONOR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="food-category"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Food Category *
              </label>
              <select
                id="food-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#10B981] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="food-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Food Name / Menu Items *
              </label>
              <input
                id="food-name"
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g., 160 Meals: Subz Dum Biryani, Dal Tadka & Whole Wheat Rotis"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
              />
              {errors.foodName && (
                <p className="text-xs text-red-600 mt-1">{errors.foodName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="quantity-meals"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Quantity in Meals (Portions) *
              </label>
              <input
                id="quantity-meals"
                type="number"
                min={5}
                max={5000}
                value={quantityMeals}
                onChange={(e) => setQuantityMeals(e.target.value)}
                placeholder="e.g., 150"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 font-mono focus:border-[#10B981] focus:outline-none"
              />
              {errors.quantityMeals && (
                <p className="text-xs text-red-600 mt-1">{errors.quantityMeals}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="storage-condition"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Storage & Thermal Condition *
              </label>
              <select
                id="storage-condition"
                value={storageCondition}
                onChange={(e) =>
                  setStorageCondition(e.target.value as StorageCondition)
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#10B981] focus:outline-none"
              >
                {STORAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Food Safety Expiry vs. Collection Window (Distinct Concepts) */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                02. Food Safety Expiry vs. Collection Pickup Window
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                FoodBridge strictly separates microbiological food expiry from the donor’s pickup
                window. Pickup must finish before the food expires.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Preparation & Safe Expiry */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-[#064E3B]">
                A. Food Preparation & Safe Consumption Expiry
              </div>
              <div>
                <label
                  htmlFor="prep-time"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Preparation Date & Time *
                </label>
                <input
                  id="prep-time"
                  type="datetime-local"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
                />
                {errors.preparationTimeISO && (
                  <p className="text-xs text-red-600 mt-1">{errors.preparationTimeISO}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="expiry-time"
                  className="block text-xs font-semibold text-amber-800 mb-1"
                >
                  Safe Food Expiry Date & Time (Spoilage Deadline) *
                </label>
                <input
                  id="expiry-time"
                  type="datetime-local"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-amber-300 bg-amber-50/30 focus:border-amber-600 focus:outline-none"
                />
                {errors.expiryTimeISO && (
                  <p className="text-xs text-red-600 mt-1">{errors.expiryTimeISO}</p>
                )}
              </div>
            </div>

            {/* Collection Window */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-900">
                B. Permitted NGO Collection Window
              </div>
              <div>
                <label
                  htmlFor="pickup-start"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Collection Window Start Time *
                </label>
                <input
                  id="pickup-start"
                  type="datetime-local"
                  value={pickupStart}
                  onChange={(e) => setPickupStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
                />
                {errors.pickupWindowStartISO && (
                  <p className="text-xs text-red-600 mt-1">{errors.pickupWindowStartISO}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pickup-end"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Collection Window End Time (Pickup Deadline) *
                </label>
                <input
                  id="pickup-end"
                  type="datetime-local"
                  value={pickupEnd}
                  onChange={(e) => setPickupEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
                />
                {errors.pickupWindowEndISO && (
                  <p className="text-xs text-red-600 mt-1">{errors.pickupWindowEndISO}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Location & Optional Image Upload */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 font-display mb-4 pb-2 border-b border-slate-100">
            03. Delhi NCR Pickup Location & Packaging Photo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="location-area"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Delhi NCR Neighborhood / Sector *
              </label>
              <select
                id="location-area"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:border-[#10B981] focus:outline-none"
              >
                {Object.keys(PUNE_NEIGHBORHOOD_COORDS).map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pickup-address"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Exact Street Address / Loading Bay
              </label>
              <input
                id="pickup-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Gate 2 Service Dock, Chhatra Marg, Delhi 110007"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="food-image"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Food Packaging Photo Upload (Optional)
              </label>
              <input
                id="food-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
              />
              {imagePreview && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Uploaded food container preview"
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 object-cover rounded border border-slate-200"
                  />
                  <span className="text-xs text-emerald-700 font-medium">
                    Photo attached to batch record
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="donation-notes"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Handling Notes & Container Details
              </label>
              <input
                id="donation-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Bring 4 insulated crates; security pass at Gate 1"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-4">
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors cursor-pointer"
          >
            Publish Donation & Find NGO Matches
          </button>
        </div>
      </form>
    </div>
  );
};
