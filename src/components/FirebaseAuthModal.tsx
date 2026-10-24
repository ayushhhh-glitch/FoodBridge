import React, { useState } from 'react';
import {
  ShieldCheck,
  LogIn,
  UserPlus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Database,
  X,
  KeyRound,
  Building2,
  Utensils,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  createOrEnsureUserProfile,
  fetchUserProfile,
  type ConnectionCheckResult,
  type FirebaseUser,
  type FoodBridgeUserProfile,
} from '../firebase';
import { PUNE_NEIGHBORHOOD_COORDS } from '../utils/matchingEngine';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile: FoodBridgeUserProfile | null;
  connectionStatus: ConnectionCheckResult | null;
  onProfileLoaded: (profile: FoodBridgeUserProfile | null) => void;
  onRetestConnection: () => Promise<void>;
}

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  connectionStatus,
  onProfileLoaded,
  onRetestConnection,
}) => {
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [accountRole, setAccountRole] = useState<'donor' | 'ngo'>('donor');
  const [area, setArea] = useState('Connaught Place, Central Delhi');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatAuthError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    if (raw.includes('auth/operation-not-allowed')) {
      return 'This sign-in provider is not yet enabled in Firebase Console > Authentication > Sign-in method.';
    }
    if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
      return 'Invalid email or password. If you do not have an account yet, switch to Register Account.';
    }
    if (raw.includes('auth/email-already-in-use')) {
      return 'This email is already registered. Switch to Sign In to access your account.';
    }
    if (raw.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters long.';
    }
    return raw;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      let profile = await fetchUserProfile(cred.user.uid);
      if (!profile) {
        profile = await createOrEnsureUserProfile({
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: cred.user.displayName || 'Delhi NCR Coordinator',
          organizationName: 'Delhi NCR FoodBridge Partner',
          accountRole,
          area,
        });
      }
      onProfileLoaded(profile);
      setSuccessMsg(
        `Signed in as ${profile.displayName} (${profile.accountRole.toUpperCase()}) & verified Firestore /users/${cred.user.uid} profile!`
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || password.length < 6) {
      setErrorMsg('Valid email and a password of at least 6 characters are required.');
      return;
    }
    if (displayName.trim().length < 2 || organizationName.trim().length < 2) {
      setErrorMsg('Please enter your contact name and organization/kitchen name.');
      return;
    }

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const profile = await createOrEnsureUserProfile({
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName: displayName.trim(),
        organizationName: organizationName.trim(),
        accountRole,
        area,
        phone: phone.trim(),
      });
      onProfileLoaded(profile);
      setSuccessMsg(
        `Created ${accountRole.toUpperCase()} account and stored profile in Firestore (/users/${cred.user.uid})!`
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      let profile = await fetchUserProfile(cred.user.uid);
      if (!profile) {
        profile = await createOrEnsureUserProfile({
          uid: cred.user.uid,
          email: cred.user.email || 'user@foodbridge.org',
          displayName: cred.user.displayName || 'FoodBridge Coordinator',
          organizationName:
            organizationName.trim() ||
            (accountRole === 'ngo' ? 'Delhi NCR NGO Partner' : 'Delhi NCR Surplus Donor Kitchen'),
          accountRole,
          area,
        });
      }
      onProfileLoaded(profile);
      setSuccessMsg(
        `Authenticated via Google as ${profile.displayName} (${profile.accountRole.toUpperCase()})!`
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await signOut(auth);
      onProfileLoaded(null);
      setSuccessMsg('Signed out of Firebase. Demo Mode (localStorage) remains active.');
    } catch (err) {
      setErrorMsg(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 shadow-xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-mono font-semibold text-[#10B981]">
              STEP 1 · FIREBASE AUTH & CONNECTION VERIFICATION
            </div>
            <h2
              id="firebase-auth-modal-title"
              className="text-xl font-bold text-slate-900 font-display mt-0.5"
            >
              FoodBridge Firebase Account & Security Console
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Firebase console modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Connection Diagnostic Strip */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Project ID: {FIREBASE_PROJECT_ID}</span>
            </span>
            <button
              type="button"
              onClick={onRetestConnection}
              className="text-[#064E3B] hover:text-[#10B981] font-semibold underline cursor-pointer"
            >
              Re-test Firestore Ping
            </button>
          </div>
          <div className="font-mono text-[11px] text-slate-500 truncate">
            DB Instance: {FIRESTORE_DATABASE_ID}
          </div>
          {connectionStatus && (
            <div
              data-testid="firebase-connection-status"
              className={`font-medium flex items-center gap-1.5 ${
                connectionStatus.reachable ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{connectionStatus.message}</span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Authenticated State vs Sign-In / Register Forms */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <div className="text-xs font-semibold text-[#064E3B]">
                Authenticated Firebase Session Active
              </div>
              <div className="text-base font-bold text-slate-900">
                {userProfile?.displayName || currentUser.displayName || currentUser.email}
              </div>
              <div className="text-xs text-slate-600 space-y-1 font-mono">
                <div>UID: {currentUser.uid}</div>
                <div>Email: {currentUser.email}</div>
                {userProfile && (
                  <>
                    <div>
                      Role: <strong className="uppercase">{userProfile.accountRole}</strong> ·
                      Organization: {userProfile.organizationName}
                    </div>
                    <div>Area: {userProfile.area}</div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Existing Delhi NCR localStorage demo data remains preserved alongside your Firebase
                session.
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Role Selection for Auth */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Select Account Role (Donor or Recipient NGO)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountRole('donor')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    accountRole === 'donor'
                      ? 'bg-emerald-50 border-[#10B981] text-[#064E3B]'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Surplus Food Donor</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Restaurants, Hostels, Banquets
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountRole('ngo')}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    accountRole === 'ngo'
                      ? 'bg-emerald-50 border-[#10B981] text-[#064E3B]'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Recipient NGO Partner</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    NGOs & Community Kitchens
                  </div>
                </button>
              </div>
            </div>

            {/* Segmented Mode: Sign In vs Register */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  authTab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email / Password Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register New Account
              </button>
            </div>

            {authTab === 'signin' ? (
              <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="fb-signin-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="fb-signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="donor@foodbridge.org"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="fb-signin-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="fb-signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  {busy ? 'Authenticating...' : 'Sign In with Email & Password'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailRegister} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="fb-reg-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Your Full Name *
                    </label>
                    <input
                      id="fb-reg-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Meera Kulkarni"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fb-reg-org"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Organization Name *
                    </label>
                    <input
                      id="fb-reg-org"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="Annapurna Seva Foundation"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="fb-reg-area"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Delhi NCR Neighborhood *
                    </label>
                    <select
                      id="fb-reg-area"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                      htmlFor="fb-reg-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Phone Number (Optional)
                    </label>
                    <input
                      id="fb-reg-phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98220 41209"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="fb-reg-email"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Email Address *
                    </label>
                    <input
                      id="fb-reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coordinator@ngo.org"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fb-reg-pass"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Password (min 6 chars) *
                    </label>
                    <input
                      id="fb-reg-pass"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  {busy
                    ? 'Creating Account & Firestore Profile...'
                    : `Create ${accountRole.toUpperCase()} Account in Firebase`}
                </button>
              </form>
            )}

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[11px] text-slate-400">OR</span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Continue with Google Sign-In Popup ({accountRole.toUpperCase()})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
