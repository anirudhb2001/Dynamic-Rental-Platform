frappe.ui.form.on('Rental Security Document Type', {
    document_attachment: function (frm, cdt, cdn) {
        const row = frappe.get_doc(cdt, cdn);

        
        if (row.document_attachment) {
            frappe.model.set_value(cdt, cdn, 'status', 'Open');
        } else {
            frappe.model.set_value(cdt, cdn, 'status', 'Not open');
        }

        
        frm.dirty = true;
    }
});


frappe.ui.form.on('Sales Invoice', {
    before_insert: function (frm) {
        if (frm.doc.items && frm.doc.items.length > 0) {
            const sales_order = frm.doc.items[0].sales_order;
            if (sales_order) {
                
                frappe.db.get_value(
                    'Sales Order', 
                    sales_order, 
                    [
                        'custom_booking_entry',
                        'custom_rental_items',
                        'custom_actual_to_date',
                        'custom_rental_to_date',
                        'custom_rental_from_date'
                    ], 
                    function (value) {
                        if (value) {
                            
                            if (value.custom_booking_entry) {
                                frm.set_value('custom_booking_entry', value.custom_booking_entry);
                            }
                            if (value.custom_rental_items) {
                                frm.set_value('custom_rental_items', value.custom_rental_items);
                            }
                            if (value.custom_actual_to_date) {
                                frm.set_value('custom_actual_to_date', value.custom_actual_to_date);
                            }
                            if (value.custom_rental_to_date) {
                                frm.set_value('custom_rental_to_date', value.custom_rental_to_date);
                            }
                            if (value.custom_rental_from_date) {
                                frm.set_value('custom_rental_from_date', value.custom_rental_from_date);
                            }
                        }
                    }
                );
            }
        }
    }
});

//Rental security document verification in sales invoice
frappe.ui.form.on("Rental Security Document Type", {
  status: function (frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (row.status === "Closed") {
      frappe.call({
        method:
          "rental_platform.web_api.si_rent_security.send_otp",
        args: { booking_entry_id: frm.doc.custom_booking_entry },
        callback: function (response) {
          if (response.message.status === "success") {
            frappe.show_alert(response.message.message);
            show_otp_dialog(frm, response.message.phone);
          } else {
            frappe.show_alert(__("Failed to send OTP."));
          }
        },
        error: function (err) {
          frappe.msgprint({
            title: __("Error"),
            indicator: "red",
            message: err.message,
          });
          frappe.model.set_value(row.doctype, row.name, "status", "Open");
        },
      });
    }
    if (row.status === "Open") {
      frappe.call({
        method: "rental_platform.web_api.si_rent_security.update_booking_security_status",
        args: {
          sales_invoice: frm.doc.name,
        },
        callback: function (r) {
          console.log("API Response:", r);
        },
      });
    }
  },
});

function show_otp_dialog(frm, phone) {
  let dialog = new frappe.ui.Dialog({
    title: __("OTP Verification"),
    fields: [
      {
        label: __("Phone"),
        fieldname: "phone",
        fieldtype: "Data",
        read_only: 1,
        default: phone,
      },
      { label: __("OTP"), fieldname: "otp", fieldtype: "Data", reqd: 1 },
    ],
    primary_action: function () {
      let otp_value = dialog.get_value("otp");
      if (!otp_value) {
        frappe.show_alert(__("Please enter the OTP."));
        return;
      }
      verify_otp(phone, otp_value, frm, dialog);
    },
    primary_action_label: __("Verify"),
  });
  dialog.show();
}

function verify_otp(phone, otp, frm, dialog) {
  frappe.call({
    method:
      "rental_platform.web_api.si_rent_security.verify_otp",
    args: { phone: phone, otp: otp, booking_entry_id: frm.doc.custom_booking_entry },
    callback: function (response) {
      if (response.message.verified) {
        frappe.show_alert(__("OTP Verified!"));
        dialog.hide();
        frappe.db.set_value("Booking Entry", frm.doc.custom_booking_entry, "security_document_status", "Document Returned");
      } else {
        frappe.show_alert(__("Invalid OTP. Try again."));
      }
    },
  });
}