import VITE_PUBLIC_DASHBOARD from "../../../../constants.js";

frappe.ready(function () {
  frappe.web_form.after_save = function () {
    const dashboardUrl = `${VITE_PUBLIC_DASHBOARD}`;
    window.location.href = dashboardUrl;
  };
});
