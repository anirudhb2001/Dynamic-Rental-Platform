frappe.listview_settings['Customer'] = {refresh: function(listview) {
    listview.page.wrapper.find('.btn-primary').each(function() {
        if ($(this).text().trim() === "Add Customer") {
            $(this).hide();
        }
    });
    },

    onload: function(listview) {
        listview.page.add_inner_button(__('Create Customer'), function() {
            let otpTimerInterval, altOtpTimerInterval;

            function startOTPTimer(timerField, callback) {
                let secondsLeft = 120;
                timerField.$wrapper.html(`<span style="color: black;">OTP expires in ${secondsLeft} seconds</span>`);

                let interval = setInterval(() => {
                    if (secondsLeft <= 0) {
                        clearInterval(interval);
                        timerField.$wrapper.html('<span style="color: red;">OTP Expired</span>');
                        if (callback) callback();
                    } else {
                        timerField.$wrapper.html(`<span style="color: black;">OTP expires in ${secondsLeft--} seconds</span>`);
                    }
                }, 1000);
                return interval;
            }

            let dialog = new frappe.ui.Dialog({
                title: __('Customer Verification'),
                fields: [
                    { label: __('Customer Name'), fieldname: 'customer_name', fieldtype: 'Data', reqd: 1 },
                    { label: __('Mobile Number'), fieldname: 'mobile_no', fieldtype: 'Data', reqd: 1 },
                    { label: __('Send OTP'), fieldname: 'send_otp', fieldtype: 'Button', click: sendOTP },
                    { label: __('OTP'), fieldname: 'otp', fieldtype: 'Data', hidden: 1 },
                    { label: __('OTP Expiry Timer'), fieldname: 'otp_timer', fieldtype: 'HTML', hidden: 1 },
                    { label: __('Verify OTP'), fieldname: 'verify_otp', fieldtype: 'Button', hidden: 1, click: verifyOTP },

                    { label: __('Alternative Number'), fieldname: 'custom_alternate_number', fieldtype: 'Data', hidden: 1 },
                    { label: __('Send Alternative OTP'), fieldname: 'send_alt_otp', fieldtype: 'Button', hidden: 1, click: sendAltOTP },
                    { label: __('Alternative OTP'), fieldname: 'alt_otp', fieldtype: 'Data', hidden: 1 },
                    { label: __('Alternative OTP Expiry Timer'), fieldname: 'alt_otp_timer', fieldtype: 'HTML', hidden: 1 },
                    { label: __('Verify Alternative OTP'), fieldname: 'verify_alt_otp', fieldtype: 'Button', hidden: 1, click: verifyAltOTP },

                    { label: __('Save Customer'), fieldname: 'save_details', fieldtype: 'Button', hidden: 1, click: saveCustomer }
                ]
            });

            dialog.show();

            function validatePhoneNumbers() {
                let data = dialog.get_values();
                if (data.mobile_no && data.custom_alternate_number && data.mobile_no === data.custom_alternate_number) {
                    frappe.show_alert(__('Mobile Number and Alternative Mobile Number cannot be the same.'));
                    return false;
                }
                return true;
            }

            function sendOTP() {
                if (!validatePhoneNumbers()) return;

                let data = dialog.get_values();
                if (!data.mobile_no) {
                    frappe.show_alert(__('Please enter Mobile Number.'));
                    return;
                }
                frappe.call({
                    method: "rental_platform.rental_platform.customer_otp.handle_otp_and_customer",
                    args: { mobile_no: data.mobile_no, action: "send_otp" },
                    callback: function(r) {
                        if (r.message.success) {
                            frappe.show_alert(r.message.message);
                            dialog.set_df_property('otp', 'hidden', 0);
                            dialog.set_df_property('otp_timer', 'hidden', 0);
                            dialog.set_df_property('verify_otp', 'hidden', 0);
                            dialog.set_df_property('send_otp', 'label', 'Resend OTP');

                            let timerField = dialog.get_field('otp_timer');
                            clearInterval(otpTimerInterval);
                            otpTimerInterval = startOTPTimer(timerField);
                        } else {
                            frappe.show_alert(r.message.message);
                        }
                        dialog.refresh();
                    }
                });
            }

            function sendAltOTP() {
                if (!validatePhoneNumbers()) return;

                let data = dialog.get_values();
                if (!data.custom_alternate_number) {
                    frappe.show_alert(__('Please enter Alternative Mobile Number.'));
                    return;
                }
                frappe.call({
                    method: "rental_platform.rental_platform.customer_otp.handle_otp_and_customer",
                    args: { mobile_no: data.custom_alternate_number, action: "send_otp" },
                    callback: function(r) {
                        if (r.message.success) {
                            frappe.show_alert(r.message.message);
                            dialog.set_df_property('alt_otp', 'hidden', 0);
                            dialog.set_df_property('alt_otp_timer', 'hidden', 0);
                            dialog.set_df_property('verify_alt_otp', 'hidden', 0);
                            dialog.set_df_property('send_alt_otp', 'label', 'Resend Alternative OTP'); 

                            let timerField = dialog.get_field('alt_otp_timer');
                            clearInterval(altOtpTimerInterval);
                            altOtpTimerInterval = startOTPTimer(timerField);
                        } else {
                            frappe.show_alert(r.message.message);
                        }
                        dialog.refresh();
                    }
                });
            }

            function verifyOTP() {
                let otp = dialog.get_value('otp');
                let mobile_no = dialog.get_value('mobile_no');
            
                if (!otp) {
                    frappe.show_alert(__('OTP cannot be empty. Please enter the OTP.'));
                    return;
                }
            
                frappe.call({
                    method: "rental_platform.rental_platform.customer_otp.handle_otp_and_customer",
                    args: { mobile_no: mobile_no, otp_value: otp, action: "verify_otp" },
                    callback: function(r) {
                        if (!r.message.success) {
                            frappe.show_alert(r.message.message);
                        } else {
                            frappe.show_alert(__('OTP Verified Successfully!'));
                            dialog.set_df_property('custom_alternate_number', 'hidden', 0);
                            dialog.set_df_property('send_alt_otp', 'hidden', 0);
                            
                            clearInterval(otpTimerInterval);
                            let timerField = dialog.get_field('otp_timer');
                            timerField.$wrapper.html('<span style="color: green;">OTP Verified</span>');
                        }
                        dialog.refresh();
                    }
                });
            }

            function verifyAltOTP() {
                let alt_otp = dialog.get_value('alt_otp');
                let custom_alternate_number = dialog.get_value('custom_alternate_number');
            
                if (!alt_otp) {
                    frappe.show_alert(__('Alternative OTP cannot be empty. Please enter the OTP.'));
                    return;
                }
            
                frappe.call({
                    method: "rental_platform.rental_platform.customer_otp.handle_otp_and_customer",
                    args: { mobile_no: custom_alternate_number, otp_value: alt_otp, action: "verify_otp" },
                    callback: function(r) {
                        if (!r.message.success) {
                            frappe.show_alert(r.message.message);
                        } else {
                            frappe.show_alert(__('Alternative OTP Verified Successfully!'));
                            dialog.set_df_property('save_details', 'hidden', 0);
                            clearInterval(altOtpTimerInterval);
                            let timerField = dialog.get_field('alt_otp_timer');
                            timerField.$wrapper.html('<span style="color: green;">OTP Verified</span>');
                        }
                        dialog.refresh();
                    }
                });
            }

            function saveCustomer() {
                let data = dialog.get_values();
                if (!validatePhoneNumbers()) return;

                if (!data.otp) {
                    frappe.show_alert(__('Primary OTP must be verified to save customer.'));
                    return;
                }

                if (data.custom_alternate_number && !data.alt_otp) {
                    frappe.show_alert(__('Alternative OTP must be verified when an alternate number is provided.'));
                    return;
                }

                dialog.set_df_property('save_details', 'disabled', 1);
                dialog.set_df_property('save_details', 'label', __('Saving...'));

                frappe.call({
                    method: "rental_platform.rental_platform.customer_otp.handle_otp_and_customer",
                    args: {
                        mobile_no: data.mobile_no,
                        customer_name: data.customer_name,
                        otp_value: data.otp,
                        custom_alternate_number: data.custom_alternate_number,
                        alt_otp_value: data.alt_otp,
                        action: "save_customer"
                    },
                    callback: function(r) {
                        if (r.message.success) {
                            frappe.msgprint(r.message.message);
                            dialog.hide();
                        } else {
                            frappe.msgprint(r.message.message);
                            dialog.set_df_property('save_details', 'disabled', 0);
                            dialog.set_df_property('save_details', 'label', __('Save Customer'));
                        }
                        dialog.refresh();
                    }
                });
            }
        });
    }
};
