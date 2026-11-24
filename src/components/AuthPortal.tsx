import React, { useState } from 'react';
import { ArrowRight, Building2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useBankAuth } from '../context/BankAuthContext';

export const AuthPortal: React.FC = () => {
  const { user, signInWithGoogle, signInWithEmail, registerWithEmail, resendVerificationEmail, logout } =
    useBankAuth();

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      if (authTab === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }
        await registerWithEmail(fullName, email, password);
        setInfoMessage(
          'Account created. Please check your inbox and verify your email address before continuing.'
        );
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          'Email/Password sign-in is not enabled yet in your Firebase project. Enable Email/Password under Firebase Console → Authentication → Sign-in method, or sign in immediately with Google above.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Switch to Sign In.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const needsEmailVerification = Boolean(user && !user.emailVerified);

  return (
    <div className="min-h-screen bg-slate-50 grid grid-cols-1 lg:grid-cols-2 items-stretch">
      {/* Left Visual Column */}
      <div className="relative hidden lg:flex flex-col justify-between bg-[#0B1F3A] text-white overflow-hidden">
        {!imgFailed ? (
          <img
            src="/src/assets/images/banking_architecture_hero_1795431727081.jpg"
            alt="BlueCrest Bank modern glass and marble atrium"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0B1F3A] via-[#123564] to-[#1D4ED8]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/95 via-[#0B1F3A]/65 to-[#0B1F3A]/40" />

        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center border border-blue-400/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-white">
            BlueCrest Bank
          </span>
        </div>

        <div className="relative z-10 p-10 max-w-xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight leading-tight text-white mb-4 [text-wrap:balance]">
            Precision banking operations and personal wealth control.
          </h1>
          <p className="text-slate-200 text-base leading-relaxed mb-8">
            Manage customer profiles, multi-branch accounts, simulated deposits and withdrawals,
            loan underwriting, and real-time transaction ledgers inside a unified workspace.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15">
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">5</p>
              <p className="text-xs text-slate-300 mt-1">Live Firestore Collections</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">ACID</p>
              <p className="text-xs text-slate-300 mt-1">Atomic Ledger Writes</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">RBAC</p>
              <p className="text-xs text-slate-300 mt-1">Zero-Trust Access Rules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Column */}
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-14 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 lg:hidden mb-8">
            <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-slate-900">
              BlueCrest Bank
            </span>
          </div>

          {needsEmailVerification ? (
            <div className="border border-slate-200 rounded-xl p-6 bg-white">
              <div className="flex items-center gap-2.5 text-blue-700 mb-3">
                <Mail className="w-5 h-5" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Verify Your Email Address
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                A verification link was sent to <span className="font-medium text-slate-900">{user?.email}</span>.
                Verified email identity is required before accessing banking records. After
                verifying, refresh this page or sign in again.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  I Have Verified My Email
                </button>
                <button
                  type="button"
                  onClick={resendVerificationEmail}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Resend Link
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-2.5 text-sm text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
                  Customer & Operations Access
                </h2>
                <p className="text-sm text-slate-600 mt-1.5">
                  Sign in with a verified Google account or register via email to access your
                  simulated banking portal.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{submitting ? 'Connecting...' : 'Continue with Google'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-500">Or use email credentials</span>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    authTab === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    authTab === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Account
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {authTab === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jordan Taylor"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {authTab === 'login' ? 'Sign In with Email' : 'Create Customer Login'}
                </button>
              </form>

              <div className="mt-8 pt-5 border-t border-slate-200 flex items-start gap-2.5 text-xs text-slate-500">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Simulated banking environment for portfolio and operational workflows. Do not
                  enter real bank credentials or perform real-money transactions.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
