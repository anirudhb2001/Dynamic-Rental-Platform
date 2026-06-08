import React, { useState } from "react";
import { LuX, LuArrowRight, LuSmartphone, LuShieldCheck, LuLoader2 } from "react-icons/lu";
import { customerAuth } from "../../services/customerAuth";

const CustomerLoginModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [mobileNo, setMobileNo] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [fullName, setFullName] = useState("");

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
    
    if (response.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setError(response.message || "Invalid OTP.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <LuX className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mb-6 text-sky-600">
            {step === 1 ? <LuSmartphone className="w-6 h-6" /> : <LuShieldCheck className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {step === 1 ? "Login or Sign Up" : "Verify OTP"}
          </h2>
          <p className="text-slate-500 mb-6">
            {step === 1 
              ? "Enter your mobile number to securely login to your account or create a new one."
              : `We've sent a secure code to +91 ${mobileNo}. Please enter it below.`}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    autoFocus
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, ""))}
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
                {loading ? <LuLoader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                {!loading && <LuArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {isNewUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name (Required for new registration)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
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
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4 digit code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all text-slate-900 font-medium tracking-widest text-center text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm shadow-sky-600/20"
              >
                {loading ? <LuLoader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
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
        </div>
      </div>
    </div>
  );
};

export default CustomerLoginModal;
