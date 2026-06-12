import axios from "axios";

// Configure axios instance to handle cookies
const api = axios.create({
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (window.csrf_token) {
    config.headers["X-Frappe-CSRF-Token"] = window.csrf_token;
  }
  return config;
});

let authState = {
  isAuthenticated: false,
  user: null,
  customerId: null,
  customerDetails: null,
};

let listeners = [];

const notifyListeners = () => {
  listeners.forEach((listener) => listener({ ...authState }));
};

export const customerAuth = {
  subscribeToAuthChanges: (listener) => {
    listeners.push(listener);
    listener({ ...authState }); // initial call
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getAuthState: () => ({ ...authState }),
  
  isCustomerAuthenticated: () => authState.isAuthenticated,
  getCurrentCustomer: () => authState.user,
  getCurrentCustomerId: () => authState.customerId,
  getCurrentCustomerDetails: () => authState.customerDetails,

  sendLoginOTP: async (mobileNo) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.send_login_otp", {
        mobile_no: mobileNo,
      });
      return response.data?.message || response.data;
    } catch (error) {
      console.error("Error sending OTP:", error);
      return { success: false, message: error.message || "Failed to send OTP" };
    }
  },

  verifyLoginOTP: async (mobileNo, otpValue, fullName = null) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.verify_login_otp", {
        mobile_no: mobileNo,
        otp_value: otpValue,
        full_name: fullName,
      });
      
      const data = response.data?.message || response.data;

      if (data?.success) {
        // Hydrate context after successful login
        await customerAuth.hydrateContext();
      }
      
      return data;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { success: false, message: error.message || "Failed to verify OTP" };
    }
  },

  registerWithEmail: async (fullName, email, mobileNo, password) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.register_with_email", {
        full_name: fullName,
        email: email,
        mobile_no: mobileNo,
        password: password,
      });
      return response.data?.message || response.data;
    } catch (error) {
      return { success: false, message: error.message || "Registration failed" };
    }
  },

  loginWithEmail: async (email, password) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.login_with_email", {
        email: email,
        password: password,
      });
      const data = response.data?.message || response.data;
      if (data?.success) await customerAuth.hydrateContext();
      return data;
    } catch (error) {
      return { success: false, message: error.message || "Login failed" };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.forgot_password", { email });
      return response.data?.message || response.data;
    } catch (error) {
      return { success: false, message: "Failed to send reset link" };
    }
  },

  googleLogin: async (idToken) => {
    try {
      const response = await api.post("/api/method/rental_platform.web_api.customer_portal_auth.google_login", {
        id_token: idToken,
      });
      const data = response.data?.message || response.data;
      if (data?.success) await customerAuth.hydrateContext();
      return data;
    } catch (error) {
      return { success: false, message: "Google Login failed" };
    }
  },

  logoutCustomer: async () => {
    try {
      await api.post("/api/method/logout");
      authState = {
        isAuthenticated: false,
        user: null,
        customerId: null,
        customerDetails: null,
      };
      notifyListeners();
      return { success: true };
    } catch (error) {
      console.error("Error logging out:", error);
      return { success: false, message: "Logout failed" };
    }
  },

  hydrateContext: async () => {
    console.log("[TRACE] customerAuth.hydrateContext called");
    try {
      const response = await api.get("/api/method/rental_platform.web_api.customer_portal_auth.get_customer_context");
      const data = response.data?.message || response.data;
      console.log("[TRACE] get_customer_context response:", data);

      if (data?.success) {
        authState = {
          isAuthenticated: true,
          user: data.user,
          customerId: data.customer_id,
          customerDetails: data.customer,
        };
      } else {
        authState = {
          isAuthenticated: false,
          user: null,
          customerId: null,
          customerDetails: null,
        };
      }
      console.log("[TRACE] customerAuth notifying listeners with state:", authState);
      notifyListeners();
      return authState;
    } catch (error) {
      console.error("Error hydrating context:", error);
      authState = {
        isAuthenticated: false,
        user: null,
        customerId: null,
        customerDetails: null,
      };
      notifyListeners();
      return authState;
    }
  },
};

// Auto hydrate on load
customerAuth.hydrateContext();
