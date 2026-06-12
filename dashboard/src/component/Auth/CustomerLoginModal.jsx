import React, { useState, useEffect } from "react";
import { LuX, LuArrowRight, LuSmartphone, LuShieldCheck, LuLoader2, LuMail, LuLock, LuKey } from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";
import { customerAuth } from "../../services/customerAuth";
import { getBrandingSettings } from "../../services/api";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const CustomerLoginModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState("OTP Login");
  const [googleClientId, setGoogleClientId] = useState("");
  const [enableGoogleLogin, setEnableGoogleLogin] = useState(false);
  const [requireAdminApproval, setRequireAdminApproval] = useState(false);
  
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

  useEffect(() => {
    const fetchBranding = async () => {
      const data = await getBrandingSettings();
      if (data) {
        if (data.authentication_mode) {
          setAuthMode(data.authentication_mode);
        }
        setGoogleClientId(data.google_client_id || "");
        setEnableGoogleLogin(data.enable_google_login === 1);
        setRequireAdminApproval(data.require_admin_approval === 1 || data.is_admin_approval_required === 1);
      }
    };
    fetchBranding();
  }, []);

  const handlePostLogin = (success, message) => {
    if (success) {
      const isApprovalReq = requireAdminApproval || authMode.includes("Approval");
      if (isApprovalReq && isNewUser) {
         setPendingApproval(true);
         setSuccessMsg("Registration successful! Your account is awaiting administrator approval.");
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } else {
      setError(message || "Authentication failed.");
    }
  };

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
    
    const response = await customerAuth.verifyLoginOTP(mobileNo, otp, fullName.trim() || null);
    setLoading(false);
    
    handlePostLogin(response.success, response.message);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (isEmailLogin) {
      const response = await customerAuth.loginWithEmail(email, password);
      setLoading(false);
      handlePostLogin(response.success, response.message);
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      setIsNewUser(true);
      const response = await customerAuth.registerWithEmail(fullName, email, mobileNo, password);
      setLoading(false);
      if (response.success) {
        setSuccessMsg(response.message || "Registration successful! Please verify your email.");
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    setIsNewUser(true); // Technically could be new or existing, assume new for approval msg check
    const response = await customerAuth.googleLogin(credentialResponse.credential);
    setLoading(false);
    handlePostLogin(response.success, response.message);
  };

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
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-6 text-sky-600">
            {step === 1 ? <LuSmartphone className="w-6 h-6" /> : <LuShieldCheck className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {step === 1 ? "Authentication" : "Verify OTP"}
          </h2>
          
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

          {pendingApproval ? (
             <div className="mt-4 text-center">
                 <button onClick={onClose} className="text-sky-600 hover:text-sky-700 font-medium">Return to Dashboard</button>
             </div>
          ) : (
            <>
              {/* --- OTP FLOW --- */}
              {authMode.includes("OTP") && step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <p className="text-slate-500 mb-6">Enter your mobile number to securely login or register.</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileNo}
                        onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 10 digit number"
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || mobileNo.length !== 10} className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all">
                    {loading ? <LuLoader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                    {!loading && <LuArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {authMode.includes("OTP") && step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <p className="text-slate-500 mb-6">We've sent a secure code to +91 {mobileNo}.</p>
                  {isNewUser && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">One Time Password</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 4 digit code"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium tracking-widest text-center text-lg"
                    />
                  </div>
                  <button type="submit" disabled={loading || otp.length < 4} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm shadow-sky-600/20">
                    {loading ? <LuLoader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
                  </button>
                  <div className="text-center mt-4">
                    <button type="button" onClick={() => { setStep(1); setOtp(""); setFullName(""); setError(""); }} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                      Change mobile number
                    </button>
                  </div>
                </form>
              )}

              {/* --- EMAIL + PASSWORD FLOW --- */}
              {authMode === "Email + Password" && (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="flex gap-4 mb-4 border-b border-slate-200">
                    <button type="button" onClick={() => setIsEmailLogin(true)} className={`pb-2 text-sm font-medium transition-colors ${isEmailLogin ? "text-sky-600 border-b-2 border-sky-600" : "text-slate-500"}`}>Login</button>
                    <button type="button" onClick={() => setIsEmailLogin(false)} className={`pb-2 text-sm font-medium transition-colors ${!isEmailLogin ? "text-sky-600 border-b-2 border-sky-600" : "text-slate-500"}`}>Register</button>
                  </div>
                  
                  {!isEmailLogin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                        <input type="text" required value={mobileNo} onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))} placeholder="10 Digit Mobile" maxLength={10} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium" />
                  </div>

                  {!isEmailLogin && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                      <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium" />
                    </div>
                  )}

                  {isEmailLogin && (
                    <div className="text-right">
                      <button type="button" onClick={handleForgotPassword} className="text-sm text-sky-600 hover:text-sky-700 font-medium">Forgot Password?</button>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm shadow-sky-600/20">
                    {loading ? <LuLoader2 className="w-5 h-5 animate-spin" /> : (isEmailLogin ? "Login" : "Register")}
                  </button>
                </form>
              )}

              {/* --- GOOGLE FLOW --- */}
              {authMode.includes("Google") && enableGoogleLogin && googleClientId && (
                <div className="mt-6 flex flex-col items-center">
                  <p className="text-sm text-slate-500 mb-4 text-center">
                    {authMode.includes("Approval") ? "Register or Login with Google to request access." : "Continue with Google to access your account."}
                  </p>
                  <GoogleOAuthProvider clientId={googleClientId}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError("Google Login Failed")}
                      useOneTap={false}
                      shape="rectangular"
                      theme="outline"
                      size="large"
                    />
                  </GoogleOAuthProvider>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginModal;
