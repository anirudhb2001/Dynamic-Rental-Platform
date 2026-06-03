frappe.ui.form.on('Contact', {
    setup: function(frm) {
        frm._previous_phone_nos = frm.doc.phone_nos ? frm.doc.phone_nos.map(row => ({ ...row })) : [];
    },

    validate: function(frm) {
        let changed_phone = get_changed_phone_number(frm);
        if (changed_phone) {
            frappe.validated = false; // Prevent form submission
            send_otp_and_show_dialog(frm, changed_phone.phone);
        }
    }
});

function get_changed_phone_number(frm) {
    if (!frm.doc.phone_nos || !frm._previous_phone_nos) {
        return null;
    }

    for (let i = 0; i < frm.doc.phone_nos.length; i++) {
        let current_row = frm.doc.phone_nos[i];
        let previous_row = frm._previous_phone_nos[i];

        if (!previous_row || current_row.phone !== previous_row.phone) {
            return { phone: current_row.phone };
        }
    }
    return null;
}

function send_otp_and_show_dialog(frm, new_mobile_no) {
    frappe.call({
        method: 'rental_platform.rental_platform.otp.phoneno_edit.otp_for_new_phoneno',
        args: { mobile_no: new_mobile_no, action: 'send_otp' },
        callback: function(response) {
            if (response.message.success) {
                frappe.show_alert(__('OTP sent successfully to ') + new_mobile_no);
                show_otp_dialog(frm, new_mobile_no);
            } else {
                frappe.msgprint(__('Failed to send OTP: ') + response.message.message);
            }
        }
    });
}

function show_otp_dialog(frm, new_mobile_no) {
    let dialog = new frappe.ui.Dialog({
        title: __('OTP Verification'),
        fields: [
            { label: __('OTP'), fieldname: 'otp', fieldtype: 'Data', reqd: 1 },
            { label: __('Verify OTP'), fieldname: 'verify_otp', fieldtype: 'Button', click: function() {
                let otp_value = dialog.get_value('otp');
                if (!otp_value) {
                    frappe.msgprint(__('Please enter the OTP.'));
                    return;
                }

                frappe.call({
                    method: 'rental_platform.rental_platform.otp.phoneno_edit.otp_verify_new_phoneno',
                    args: { mobile_no: new_mobile_no, otp_value: otp_value },
                    callback: function(response) {
                        if (response.message.success) {
                            frappe.show_alert(__('OTP Verified Successfully!'));
                            dialog.hide();
                            update_customer_contact(frm, new_mobile_no);
                        } else {
                            frappe.msgprint(__('OTP Verification Failed: ') + response.message.message);
                        }
                    }
                });
            }}
        ]
    });

    dialog.show();
}

function update_customer_contact(frm, new_mobile_no) {
    frappe.call({
        method: 'rental_platform.rental_platform.otp.phoneno_edit.update_customer_contact',
        args: { contact_name: frm.doc.name, new_mobile_no: new_mobile_no },
        callback: function(response) {
            if (response.message && response.message.success) {
                frappe.msgprint(__('Customer contact updated successfully.'));
                frm.reload_doc();
            } else {
                frappe.msgprint(__('Failed to update customer contact: ') + response.message.message);
            }
        }
    });
}
