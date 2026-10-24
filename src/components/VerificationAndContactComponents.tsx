import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Upload,
  FileCheck2,
  Building2,
  GraduationCap,
  UserCheck,
  Lock,
  Unlock,
  PhoneCall,
  MessageSquare,
  MapPin,
  Truck,
  Mail,
  User,
  CheckCircle2,
  Sparkles,
  Send,
} from 'lucide-react';
import {
  type DonorOrganizationCategory,
  type DonorVerificationProfile,
  type DonorVerificationStatus,
  type FoodDonation,
  type NGOProfile,
  getRequiredDocumentsForCategory,
  getTwoWayContactDetails,
  validateDonorVerificationInput,
} from '../utils/matchingEngine';

interface DonorVerifiedBadgeProps {
  status?: DonorVerificationStatus;
  category?: DonorOrganizationCategory;
  documentType?: string;
  compact?: boolean;
}

export const DonorVerifiedBadge: React.FC<DonorVerifiedBadgeProps> = ({
  status = 'verified',
  category,
  documentType,
  compact = false,
}) => {
  if (status === 'verified') {
    return (
      <span
        data-testid="verified-donor-badge"
        title={
          documentType
            ? `Verified Donor ✅ (${category || 'Commercial'} · ${documentType})`
            : 'Official Document Verified Donor ✅'
        }
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-emerald-100 text-[#064E3B] border border-emerald-300 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
        <span>Verified Donor ✅</span>
        {!compact && category && (
          <span className="text-[10px] font-mono text-emerald-800 hidden sm:inline">
            · {category}
          </span>
        )}
      </span>
    );
  }

  if (status === 'pending_verification') {
    return (
      <span
        data-testid="pending-donor-badge"
        className={`inline-flex items-center gap-1 font-semibold rounded-full bg-amber-100 text-amber-900 border border-amber-300 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
        }`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Pending Verification</span>
      </span>
    );
  }

  return (
    <span
      data-testid="unverified-donor-badge"
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-300 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <span>Unverified Donor</span>
    </span>
  );
};

interface VerificationComplianceModuleProps {
  verificationProfile: DonorVerificationProfile;
  onUpdateVerification: (updated: DonorVerificationProfile) => void;
  isDemoMode: boolean;
  defaultExpanded?: boolean;
}

export const VerificationComplianceModule: React.FC<VerificationComplianceModuleProps> = ({
  verificationProfile,
  onUpdateVerification,
  isDemoMode,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [category, setCategory] = useState<DonorOrganizationCategory>(
    verificationProfile.organizationCategory
  );
  const [documentType, setDocumentType] = useState<string>(
    verificationProfile.documentType
  );
  const [documentNumber, setDocumentNumber] = useState<string>(
    verificationProfile.documentNumber
  );
  const [documentFileName, setDocumentFileName] = useState<string>(
    verificationProfile.documentFileName
  );
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string>(
    verificationProfile.documentPreviewUrl
  );
  const [contactPerson, setContactPerson] = useState<string>(
    verificationProfile.contactPerson
  );
  const [contactPhone, setContactPhone] = useState<string>(
    verificationProfile.contactPhone
  );
  const [contactEmail, setContactEmail] = useState<string>(
    verificationProfile.contactEmail
  );
  const [pickupGateAddress, setPickupGateAddress] = useState<string>(
    verificationProfile.pickupGateAddress
  );

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleCategoryChange = (nextCategory: DonorOrganizationCategory) => {
    setCategory(nextCategory);
    const docs = getRequiredDocumentsForCategory(nextCategory);
    setDocumentType(docs[0]);
    if (nextCategory === 'Commercial') {
      setDocumentNumber('FSSAI-13324089001421');
      setDocumentFileName('fssai_license_certificate_delhi_ncr.pdf');
    } else if (nextCategory === 'Institutional') {
      setDocumentNumber('INST-DU-HOSTEL-2026-09');
      setDocumentFileName('du_central_hostel_authority_letter.pdf');
    } else {
      setDocumentNumber('DL-01-20190084920');
      setDocumentFileName('govt_photo_id_driving_license.png');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDocumentPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitForVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const check = validateDonorVerificationInput({
      organizationCategory: category,
      documentType,
      documentNumber,
      contactPerson,
      contactPhone,
      contactEmail,
      pickupGateAddress,
    });

    if (!check.valid) {
      setFeedback({
        type: 'error',
        text: check.error || 'Please complete all verification fields.',
      });
      return;
    }

    const updated: DonorVerificationProfile = {
      organizationCategory: category,
      documentType,
      documentNumber: documentNumber.trim(),
      documentFileName: documentFileName || 'official_compliance_doc.pdf',
      documentPreviewUrl,
      verificationStatus: 'pending_verification',
      contactPerson: contactPerson.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      pickupGateAddress: pickupGateAddress.trim(),
      updatedAtISO: new Date().toISOString(),
    };

    onUpdateVerification(updated);
    setFeedback({
      type: 'success',
      text: `Compliance dossier (${documentType}) submitted! Status is now 'pending_verification'. Use the 1-Click Admin Quick-Verify button to approve immediately for demo.`,
    });
  };

  const handleAdminQuickVerifyToggle = () => {
    const nextStatus: DonorVerificationStatus =
      verificationProfile.verificationStatus === 'verified'
        ? 'unverified'
        : 'verified';

    const updated: DonorVerificationProfile = {
      organizationCategory: category,
      documentType,
      documentNumber: documentNumber.trim() || 'FSSAI-21524089001421',
      documentFileName: documentFileName || 'verified_compliance_certificate.pdf',
      documentPreviewUrl,
      verificationStatus: nextStatus,
      contactPerson: contactPerson.trim() || 'Prof. Arvind Sharma',
      contactPhone: contactPhone.trim() || '+91 98110 44210',
      contactEmail: contactEmail.trim() || 'arvind.sharma@du-hostel.edu.in',
      pickupGateAddress:
        pickupGateAddress.trim() || 'Gate 2 Mess Loading Bay, Chhatra Marg, University Enclave, Delhi 110007',
      updatedAtISO: new Date().toISOString(),
    };

    onUpdateVerification(updated);
    setFeedback({
      type: 'success',
      text:
        nextStatus === 'verified'
          ? 'Admin Quick-Verify activated: Donor is now officially VERIFIED. Green "Verified Donor" badge applied to profile and all listed food batches!'
          : 'Verification status reset to Unverified for demonstration.',
    });
  };

  const requiredDocs = getRequiredDocumentsForCategory(category);

  return (
    <section
      data-testid="donor-verification-compliance-module"
      aria-label="Donor Verification and Compliance Module"
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
    >
      {/* Top Summary Banner */}
      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#064E3B]">
              Verification & Compliance
            </span>
            <DonorVerifiedBadge
              status={verificationProfile.verificationStatus}
              category={verificationProfile.organizationCategory}
              documentType={verificationProfile.documentType}
            />
            <span className="text-xs font-mono text-slate-500">
              {verificationProfile.documentType} ({verificationProfile.documentNumber})
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
            Donor Official Document Verification & Ground Contact Profile
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl">
            Verify your organization with FSSAI, Institutional ID, or Official Govt Photo ID to
            display the trusted <strong>Verified Donor</strong> badge across all food listings and
            configure your two-way pickup contact credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* 1-Click Admin Quick-Verify Toggle for Demo / Development */}
          <button
            type="button"
            data-testid="admin-quick-verify-toggle"
            onClick={handleAdminQuickVerifyToggle}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              verificationProfile.verificationStatus === 'verified'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800 hover:bg-emerald-900'
                : 'bg-[#10B981] text-white border-[#059669] hover:bg-[#059669]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {verificationProfile.verificationStatus === 'verified'
                ? 'Admin Quick-Verify: Verified (Click to Reset)'
                : '1-Click Admin Quick-Verify'}
            </span>
          </button>

          <button
            type="button"
            data-testid="toggle-verification-panel-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            {isExpanded ? 'Hide Compliance Form' : 'Manage Documents & Contacts'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          data-testid="verification-feedback-banner"
          className={`mx-6 mt-4 p-3.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {isExpanded && (
        <form onSubmit={handleSubmitForVerification} className="p-6 space-y-6">
          {/* Step 1: Organization Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              1. Select Donor Organization Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                data-testid="org-category-commercial"
                onClick={() => handleCategoryChange('Commercial')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  category === 'Commercial'
                    ? 'border-[#10B981] bg-emerald-50/70 text-[#064E3B] shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Building2 className="w-4 h-4 text-[#10B981]" />
                  <span>Commercial (Restaurant / Canteen)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Requires FSSAI License Number / Certificate or Business Registration / GST
                </p>
              </button>

              <button
                type="button"
                data-testid="org-category-institutional"
                onClick={() => handleCategoryChange('Institutional')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  category === 'Institutional'
                    ? 'border-[#10B981] bg-emerald-50/70 text-[#064E3B] shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <GraduationCap className="w-4 h-4 text-[#10B981]" />
                  <span>Institutional (Hostel / College)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Requires Authorized College/Hostel ID or Institutional Authority Letter
                </p>
              </button>

              <button
                type="button"
                data-testid="org-category-individual"
                onClick={() => handleCategoryChange('Individual')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  category === 'Individual'
                    ? 'border-[#10B981] bg-emerald-50/70 text-[#064E3B] shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <UserCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Individual / Event Organizer</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Requires Official Govt Photo ID (Driving License / Passport / Voter ID)
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Required Document Type, Number & Upload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Official Verification Document Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="donor-doc-type-select"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Required Document Type *
                  </label>
                  <select
                    id="donor-doc-type-select"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    {requiredDocs.map((docOpt) => (
                      <option key={docOpt} value={docOpt}>
                        {docOpt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="donor-doc-number-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    License / Document ID Number *
                  </label>
                  <input
                    id="donor-doc-number-input"
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="e.g. FSSAI-21524089001421"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Document Upload & Preview */}
              <div>
                <label
                  htmlFor="donor-doc-upload-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Upload Official Certificate / ID Scan (PDF, PNG, JPG)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40">
                  <label
                    htmlFor="donor-doc-upload-input"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Choose Document File</span>
                  </label>
                  <input
                    id="donor-doc-upload-input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                  <div className="text-xs text-slate-600 truncate">
                    <span className="font-semibold text-slate-800">{documentFileName}</span>
                    <span className="block text-[11px] text-slate-500">
                      Encrypted document preview stored with donor verification record
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Preview Card */}
            <div className="lg:col-span-5">
              <div className="h-full rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <FileCheck2 className="w-4 h-4 text-[#10B981]" />
                    <span>Official Document Preview</span>
                  </span>
                  <DonorVerifiedBadge
                    status={verificationProfile.verificationStatus}
                    compact
                  />
                </div>

                {documentPreviewUrl && documentPreviewUrl.startsWith('data:image') ? (
                  <div className="my-3 rounded-lg overflow-hidden border border-slate-200 bg-white max-h-36 flex items-center justify-center">
                    <img
                      src={documentPreviewUrl}
                      alt="Uploaded verification document preview"
                      className="max-h-36 object-contain"
                    />
                  </div>
                ) : (
                  <div className="my-3 p-3.5 rounded-lg bg-white border border-slate-200 space-y-1.5 font-mono text-[11px]">
                    <div className="text-[10px] font-bold uppercase text-[#10B981]">
                      FOODBRIDGE COMPLIANCE REGISTRY · DELHI NCR
                    </div>
                    <div className="text-slate-900 font-bold truncate">{documentType}</div>
                    <div className="text-slate-600">Reg ID: {documentNumber}</div>
                    <div className="text-slate-500 truncate">File: {documentFileName}</div>
                    <div className="text-slate-500">
                      Category: {category} Donor
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Status: {verificationProfile.verificationStatus.toUpperCase()}</span>
                  <span>{isDemoMode ? 'Demo + Local Persistence' : 'Cloud Firestore /users'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Two-Way Contact Profile Fields */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Ground Handover Contact Details (Masked Until NGO Reservation is Confirmed)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="verify-contact-person"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Donor Contact Person *
                </label>
                <input
                  id="verify-contact-person"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label
                  htmlFor="verify-contact-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Direct Phone / WhatsApp *
                </label>
                <input
                  id="verify-contact-phone"
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label
                  htmlFor="verify-contact-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Official Contact Email *
                </label>
                <input
                  id="verify-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label
                  htmlFor="verify-pickup-gate"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Exact Pickup Gate / Address *
                </label>
                <input
                  id="verify-pickup-gate"
                  type="text"
                  value={pickupGateAddress}
                  onChange={(e) => setPickupGateAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500">
              Submitting sets status to <strong>pending_verification</strong>. Use{' '}
              <strong>1-Click Admin Quick-Verify</strong> above for instant demo approval.
            </span>
            <button
              type="submit"
              data-testid="submit-verification-btn"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
            >
              Submit Verification & Save Contact Profile
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

interface TwoWayContactUnlockCardProps {
  donation: FoodDonation;
  ngos: NGOProfile[];
  viewerRole: 'donor' | 'ngo';
  activeNgoId?: string;
  donorVerificationProfile?: DonorVerificationProfile | null;
  onOpenDetailModal?: (donation: FoodDonation) => void;
}

export const TwoWayContactUnlockCard: React.FC<TwoWayContactUnlockCardProps> = ({
  donation,
  ngos,
  viewerRole,
  activeNgoId,
  donorVerificationProfile,
  onOpenDetailModal,
}) => {
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [sentMessages, setSentMessages] = useState<
    { sender: string; text: string; time: string }[]
  >([]);

  const contactData = getTwoWayContactDetails(
    donation,
    ngos,
    activeNgoId,
    donorVerificationProfile
  );
  const {
    unlocked,
    donorVerificationStatus,
    donorOrganizationCategory,
    donorDocumentType,
    donorDocumentNumber,
    donorSideSeesNgo,
    ngoSideSeesDonor,
  } = contactData;

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDraft.trim()) return;
    const senderLabel =
      viewerRole === 'donor'
        ? ngoSideSeesDonor.contactPerson
        : donorSideSeesNgo.coordinatorName.includes('•')
        ? 'NGO Dispatch Team'
        : donorSideSeesNgo.coordinatorName;
    setSentMessages((prev) => [
      ...prev,
      {
        sender: senderLabel,
        text: chatDraft.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatDraft('');
  };

  const cleanTelHref = `tel:${ngoSideSeesDonor.rawPhone.replace(/\s+/g, '')}`;
  const cleanMailtoHref = `mailto:${ngoSideSeesDonor.email}?subject=${encodeURIComponent(
    `FoodBridge Pickup Coordination: ${donation.foodName}`
  )}`;

  return (
    <div
      data-testid={`two-way-contact-card-${donation.id}`}
      data-contact-unlocked="true"
      className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 transition-colors"
    >
      {/* Header Status & Direct Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-emerald-200/80">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid={`donor-contact-info-heading-${donation.id}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#064E3B] text-white"
          >
            <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Donor Contact Info</span>
          </span>
          <DonorVerifiedBadge
            status={donorVerificationStatus}
            category={donorOrganizationCategory}
            documentType={donorDocumentType}
          />
          <span className="text-xs text-slate-600 font-mono">
            {donorDocumentType} ({donorDocumentNumber})
          </span>
        </div>

        {/* Active Call Donor & WhatsApp Coordination Quick-Action Buttons on Every Batch Card */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={cleanTelHref}
            data-testid={`call-donor-btn-${donation.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors shadow-2xs"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Call Donor</span>
          </a>

          <a
            href={ngoSideSeesDonor.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`whatsapp-donor-btn-${donation.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Coordination</span>
          </a>

          <button
            type="button"
            data-testid={`quick-chat-btn-${donation.id}`}
            onClick={() => setQuickChatOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#064E3B] bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{quickChatOpen ? 'Hide Note' : 'Quick Note'}</span>
          </button>

          {onOpenDetailModal && (
            <button
              type="button"
              data-testid={`open-batch-modal-btn-${donation.id}`}
              onClick={() => onOpenDetailModal(donation)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <span>Batch Details</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Full Unmasked Donor Contact Info (Left) & NGO Counterparty Info (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3">
        {/* Dedicated Donor Contact Info Section (Always 100% Unmasked for NGOs) */}
        <div
          data-testid={`donor-contact-section-${donation.id}`}
          className="lg:col-span-7 p-3.5 rounded-lg border bg-white border-emerald-300 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#064E3B]" />
              <span
                data-testid={`donor-facility-name-${donation.id}`}
                className="text-xs sm:text-sm font-bold text-slate-900"
              >
                {ngoSideSeesDonor.organizationName}
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-[#064E3B]">
              Direct Ground Contact Open
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-start gap-2 text-slate-700">
              <User className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-slate-500 block">
                  Ground Contact Person
                </span>
                <strong
                  data-testid={`donor-contact-person-${donation.id}`}
                  className="text-slate-900 font-semibold"
                >
                  {ngoSideSeesDonor.contactPerson}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-700">
              <PhoneCall className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-slate-500 block">
                  Direct Phone Number
                </span>
                <a
                  href={cleanTelHref}
                  data-testid={`donor-contact-phone-${donation.id}`}
                  className="font-mono font-bold text-[#064E3B] hover:text-[#10B981] underline"
                >
                  {ngoSideSeesDonor.phoneNumber}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-700 sm:col-span-2">
              <Mail className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-500 block">
                  Official Email Address
                </span>
                <a
                  href={cleanMailtoHref}
                  data-testid={`donor-contact-email-${donation.id}`}
                  className="font-mono font-semibold text-[#064E3B] hover:text-[#10B981] underline break-all"
                >
                  {ngoSideSeesDonor.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-2 text-slate-700 sm:col-span-2 pt-1 border-t border-slate-100">
              <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-slate-500 block">
                  Complete Pickup Location (Building/Hostel, Gate/Loading Bay, Neighborhood, PIN Code)
                </span>
                <strong
                  data-testid={`donor-pickup-gate-${donation.id}`}
                  className="text-slate-900 font-semibold"
                >
                  {ngoSideSeesDonor.exactPickupGateAddress}
                </strong>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Corridor: {donation.locationArea} · Storage: {donation.storageCondition}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: NGO Dispatch Counterparty Details */}
        <div
          className={`lg:col-span-5 p-3.5 rounded-lg border ${
            viewerRole === 'donor'
              ? 'bg-white border-emerald-300 shadow-2xs'
              : 'bg-white/90 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
              NGO Dispatch Partner · {donorSideSeesNgo.ngoName}
            </span>
            {unlocked ? (
              <span
                data-testid={`contact-unlocked-badge-${donation.id}`}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-[#064E3B]"
              >
                 NGO Reserved
              </span>
            ) : (
              <span
                data-testid={`contact-locked-badge-${donation.id}`}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600"
              >
                Awaiting Reservation
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                NGO Coordinator:{' '}
                <strong
                  data-testid={`ngo-coordinator-name-${donation.id}`}
                  className="text-slate-900"
                >
                  {donorSideSeesNgo.coordinatorName}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Contact Number:{' '}
                <strong
                  data-testid={`ngo-coordinator-phone-${donation.id}`}
                  className="font-mono text-slate-900"
                >
                  {donorSideSeesNgo.contactNumber}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                Organization Email:{' '}
                <strong
                  data-testid={`ngo-coordinator-email-${donation.id}`}
                  className="font-mono text-slate-900"
                >
                  {donorSideSeesNgo.organizationEmail}
                </strong>
              </span>
            </div>
            <div className="flex items-start gap-2 text-slate-700">
              <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Pickup Vehicle:{' '}
                <strong
                  data-testid={`ngo-pickup-vehicle-${donation.id}`}
                  className="text-slate-900"
                >
                  {donorSideSeesNgo.pickupVehicleDetails}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Ground Coordination Quick Chat / WhatsApp Bridge */}
      {quickChatOpen && (
        <div
          data-testid={`quick-chat-drawer-${donation.id}`}
          className="mt-3 pt-3 border-t border-emerald-200 bg-white rounded-lg p-3.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#064E3B] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#10B981]" />
              <span>
                Direct Ground Coordination Channel · {ngoSideSeesDonor.contactPerson} (
                {ngoSideSeesDonor.organizationName})
              </span>
            </span>
            <a
              href={ngoSideSeesDonor.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#10B981] hover:underline"
            >
              Open External WhatsApp Link ↗
            </a>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-slate-600">
              <strong className="text-[#064E3B]">Direct Pickup Channel:</strong> Coordinating{' '}
              <strong>{donation.foodName}</strong> ({donation.availableQuantity}/
              {donation.originalQuantity} meals available). Pickup gate:{' '}
              {ngoSideSeesDonor.exactPickupGateAddress}. Direct Phone:{' '}
              {ngoSideSeesDonor.phoneNumber}.
            </div>
            {sentMessages.map((m, idx) => (
              <div key={idx} className="text-slate-800 bg-emerald-50 px-2.5 py-1.5 rounded">
                <strong>{m.sender}</strong> ({m.time}): {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendQuickMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Type a quick coordination note (e.g., Van arriving at Gate 2 in 10 mins)..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

interface BatchDetailModalProps {
  donation: FoodDonation | null;
  ngos: NGOProfile[];
  activeNgoId?: string;
  donorVerificationProfile?: DonorVerificationProfile | null;
  onClose: () => void;
  onNavigateToMatcher?: (donationId: string) => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  donation,
  ngos,
  activeNgoId,
  donorVerificationProfile,
  onClose,
  onNavigateToMatcher,
}) => {
  if (!donation) return null;

  const contactData = getTwoWayContactDetails(
    donation,
    ngos,
    activeNgoId,
    donorVerificationProfile
  );
  const { ngoSideSeesDonor } = contactData;
  const cleanTelHref = `tel:${ngoSideSeesDonor.rawPhone.replace(/\s+/g, '')}`;
  const cleanMailtoHref = `mailto:${ngoSideSeesDonor.email}?subject=${encodeURIComponent(
    `FoodBridge Pickup Coordination: ${donation.foodName}`
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Batch and Donor Contact Details for ${donation.foodName}`}
      data-testid="batch-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-5 my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-[#064E3B]">
                {donation.status}
              </span>
              <DonorVerifiedBadge
                status={contactData.donorVerificationStatus}
                category={contactData.donorOrganizationCategory}
                documentType={contactData.donorDocumentType}
              />
              <span className="text-xs font-mono text-slate-500">
                {donation.category} · {donation.storageCondition}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
              {donation.foodName}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {donation.availableQuantity} of {donation.originalQuantity} meals available ·{' '}
              {donation.reservedQuantity} reserved · {donation.collectedQuantity} collected
            </p>
          </div>
          <button
            type="button"
            data-testid="close-batch-detail-modal"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Dedicated Donor Contact Info Section Inside Modal */}
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#064E3B]">
                Donor Contact Info
              </span>
              <DonorVerifiedBadge
                status={contactData.donorVerificationStatus}
                category={contactData.donorOrganizationCategory}
                documentType={contactData.donorDocumentType}
                compact
              />
            </div>
            <span className="text-xs font-mono text-slate-600">
              {contactData.donorDocumentType} ({contactData.donorDocumentNumber})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">
                Donor Organization / Facility Name
              </span>
              <strong className="text-slate-900 text-sm font-bold">
                {ngoSideSeesDonor.organizationName}
              </strong>
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">
                Ground Contact Person Name
              </span>
              <strong className="text-slate-900 text-sm font-bold">
                {ngoSideSeesDonor.contactPerson}
              </strong>
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">
                Direct Phone Number
              </span>
              <a
                href={cleanTelHref}
                className="font-mono text-sm font-bold text-[#064E3B] hover:text-[#10B981] underline"
              >
                {ngoSideSeesDonor.phoneNumber}
              </a>
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200">
              <span className="text-slate-500 block text-[11px]">
                Email Address
              </span>
              <a
                href={cleanMailtoHref}
                className="font-mono text-sm font-bold text-[#064E3B] hover:text-[#10B981] underline break-all"
              >
                {ngoSideSeesDonor.email}
              </a>
            </div>

            <div className="bg-white p-3 rounded-lg border border-emerald-200 sm:col-span-2">
              <span className="text-slate-500 block text-[11px]">
                Complete Pickup Location (Building/Hostel, Gate/Loading Bay, Neighborhood, PIN Code)
              </span>
              <strong className="text-slate-900 text-sm font-bold block mt-0.5">
                {ngoSideSeesDonor.exactPickupGateAddress}
              </strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Delhi NCR Area: {donation.locationArea}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={cleanTelHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#064E3B] hover:bg-emerald-900 rounded-lg transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Call Donor ({ngoSideSeesDonor.phoneNumber})</span>
              </a>
              <a
                href={ngoSideSeesDonor.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Coordination</span>
              </a>
            </div>

            {onNavigateToMatcher && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToMatcher(donation.id);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#064E3B] bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                Reserve / Schedule in Matcher →
              </button>
            )}
          </div>
        </div>

        {donation.notes && (
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <strong className="text-slate-800">Packaging & Handover Notes:</strong>{' '}
            {donation.notes}
          </div>
        )}
      </div>
    </div>
  );
};
