import React, { useState, useEffect } from "react";
import { LuX, LuArrowRight, LuSmartphone, LuShieldCheck, LuLoader2 } from "react-icons/lu";
import { customerAuth } from "../../services/customerAuth";
import { getBrandingSettings } from "../../services/api";
import { GoogleOAuthProvider, GoogleLogin as GoogleLoginButton } from "@react-oauth/google";

const CustomerLoginModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState("OTP Login");
  const [googleClientId, setGoogleClientId] = useState("");
  const [enableGoogleLogin, setEnableGoogleLogin] = useState(false);
  const [requireAdminApproval, setRequireAdminApproval] = useState(false);
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  // OTP state
  const [mobileNo, setMobileNo] = useState("");
  const [otp, setOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [fullName, setFullName] = useState("");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailLogin, setIsEmailLogin] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  // Derived: is this a Google-only mode?
  const isGoogleMode = authMode === "Google Login" || authMode === "Google + Approval";
  const isOTPMode = authMode === "OTP Login" || authMode === "OTP + Approval";
  const isEmailMode = authMode === "Email + Password";

  useEffect(() => {
    const fetchBranding = async () => {
      const data = await getBrandingSettings();
      if (data) {
        const mode = data.authentication_mode || "OTP Login";
        setAuthMode(mode);
        setGoogleClientId(data.google_client_id || "");
        
        let googleEnabled = data.enable_google_login === 1;
        if (mode.includes("Google")) {
            googleEnabled = true;
        }
        setEnableGoogleLogin(googleEnabled);
        
        setRequireAdminApproval(data.is_admin_approval_required === 1);
      }
      setBrandingLoaded(true);
    };
    fetchBranding();
  }, []);

  const handlePostLogin = (response) => {
    if (response.success) {
      // Determine if approval is pending from backend response
      const approvalStatus = response.portal_approval_status;
      const userIsNew = response.is_new_user;

      if (approvalStatus === "Pending") {
        setPendingApproval(true);
        setSuccessMsg(
          "Registration successful! Your account is awaiting administrator approval."
        );
      } else if (approvalStatus === "Rejected") {
        setError("Your account registration has been rejected. Please contact support.");
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } else {
      setError(response.message || "Authentication failed.");
    }
  };

  // ── OTP handlers ──
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (mobileNo.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    const response = await customerAuth.sendLoginOTP(mobileNo);
    setLoading(false);
    if (response.success) {
      setIsNewUser(response.is_new_user || false);
      setStep(2);
    } else {
      setError(response.message || "Failed to send OTP.");
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter a valid OTP.");
      return;
    }
    if (isNewUser && !fullName.trim()) {
      setError("Please enter your full name to register.");
      return;
    }
    setError("");
    setLoading(true);
    const response = await customerAuth.verifyLoginOTP(
      mobileNo,
      otp,
      fullName.trim() || null
    );
    setLoading(false);
    handlePostLogin(response);
  };

  // ── Email handlers ──
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (isEmailLogin) {
      const response = await customerAuth.loginWithEmail(email, password);
      setLoading(false);
      handlePostLogin(response);
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      const response = await customerAuth.registerWithEmail(
        fullName,
        email,
        mobileNo,
        password
      );
      setLoading(false);
      if (response.success) {
        setSuccessMsg(
          response.message || "Registration successful! Please verify your email."
        );
        setIsEmailLogin(true);
      } else {
        setError(response.message || "Registration failed.");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    setLoading(true);
    const response = await customerAuth.forgotPassword(email);
    setLoading(false);
    if (response.success) {
      setSuccessMsg(response.message);
    } else {
      setError(response.message);
    }
  };

  // ── Google handler ──
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    const response = await customerAuth.googleLogin(credentialResponse.credential);
    setLoading(false);
    handlePostLogin(response);
  };

  // ── Rendering ──

  const renderGoogleButton = () => {
    if (!googleClientId) {
      return (
        <p className="text-sm text-red-500 text-center">
          Google Login is not configured. Please contact support.
        </p>
      );
    }

    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google Login failed. Please try again.")}
          useOneTap={false}
          shape="rectangular"
          theme="outline"
          size="large"
          width="360"
        />
      </GoogleOAuthProvider>
    );
  };

  // Don't render until branding is loaded to prevent flash of wrong UI
  if (!brandingLoaded) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 flex items-center justify-center m-4">
          <LuLoader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <LuX className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6">
          {/* Header Icon */}
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-6 text-sky-600">
            {isGoogleMode ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            ) : step === 1 ? (
              <LuSmartphone className="w-6 h-6" />
            ) : (
              <LuShieldCheck className="w-6 h-6" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {pendingApproval
              ? "Account Pending"
              : isGoogleMode
              ? "Continue with Google"
              : step === 2
              ? "Verify OTP"
              : "Sign In"}
          </h2>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
              {successMsg}
            </div>
          )}

          {/* Pending Approval State */}
          {pendingApproval ? (
            <div className="mt-4 text-center space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-800 text-sm">
                  Your account has been registered and is awaiting administrator
                  approval. You will be notified once your account is approved.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                Return to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* ── GOOGLE-ONLY MODE ── */}
              {isGoogleMode && (
                <div className="space-y-4">
                  <p className="text-slate-500 mb-6">
                    {authMode === "Google + Approval"
                      ? "Sign in with Google to request access to the portal."
                      : "Sign in with your Google account to continue."}
                  </p>
                  <div className="flex justify-center">
                    {loading ? (
                      <LuLoader2 className="w-8 h-8 animate-spin text-sky-600" />
                    ) : (
                      renderGoogleButton()
                    )}
                  </div>
                </div>
              )}

              {/* ── OTP FLOW ── */}
              {isOTPMode && step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <p className="text-slate-500 mb-6">
                    Enter your mobile number to securely login or register.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileNo}
                        onChange={(e) =>
                          setMobileNo(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Enter 10 digit number"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || mobileNo.length !== 10}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all"
                  >
                    {loading ? (
                      <LuLoader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Send OTP"
                    )}
                    {!loading && <LuArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {isOTPMode && step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <p className="text-slate-500 mb-6">
                    We've sent a secure code to +91 {mobileNo}.
                  </p>
                  {isNewUser && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      One Time Password
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Enter 4 digit code"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium tracking-widest text-center text-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm shadow-sky-600/20"
                  >
                    {loading ? (
                      <LuLoader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Verify & Login"
                    )}
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtp("");
                        setFullName("");
                        setError("");
                      }}
                      className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Change mobile number
                    </button>
                  </div>
                </form>
              )}

              {/* ── EMAIL + PASSWORD FLOW ── */}
              {isEmailMode && (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="flex gap-4 mb-4 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEmailLogin(true)}
                      className={`pb-2 text-sm font-medium transition-colors ${
                        isEmailLogin
                          ? "text-sky-600 border-b-2 border-sky-600"
                          : "text-slate-500"
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEmailLogin(false)}
                      className={`pb-2 text-sm font-medium transition-colors ${
                        !isEmailLogin
                          ? "text-sky-600 border-b-2 border-sky-600"
                          : "text-slate-500"
                      }`}
                    >
                      Register
                    </button>
                  </div>

                  {!isEmailLogin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          required
                          value={mobileNo}
                          onChange={(e) =>
                            setMobileNo(e.target.value.replace(/\D/g, ""))
                          }
                          placeholder="10 Digit Mobile"
                          maxLength={10}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>

                  {!isEmailLogin && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  )}

                  {isEmailLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm shadow-sky-600/20"
                  >
                    {loading ? (
                      <LuLoader2 className="w-5 h-5 animate-spin" />
                    ) : isEmailLogin ? (
                      "Login"
                    ) : (
                      "Register"
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginModal;
