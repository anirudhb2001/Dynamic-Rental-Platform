// Copyright (c) 2024, nakul@faircodetech.com and contributors
// For license information, please see license.txt

frappe.ui.form.on("Booking Entry", {
  refresh(frm) {
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(__("Add Payment"), function () {
        frappe.call({
          method:
            "rental_platform.rental_platform.paymententry.create_payment_entry",
          args: {
            booking_id: frm.doc.name,
          },
          callback: function (response) {
            if (response.message) {
              frappe.msgprint(
                __("Payment Entry {0} has been created.", [response.message])
              );
              frappe.set_route("Form", "Payment Entry", response.message);
            } else {
              frappe.msgprint(__("Error creating Payment Entry."));
            }
          },
        });
      });
    }
  },
  refresh(frm) {
    // Show button only when the status is 'Reserved'
    if (frm.doc.status === "Reserved") {
      frm
        .add_custom_button(__("Cancel Booking"), function () {
          frappe.confirm(
            __("Are you sure you want to cancel this booking?"),
            function () {
              frappe.call({
                method:
                  "rental_platform.rental_platform.doctype.booking_entry.booking_entry.cancel_booking_entry",
                args: {
                  booking_id: frm.doc.name,
                },
                freeze: true,
                freeze_message: __("Cancelling booking..."),
                callback: function (response) {
                  if (response.message) {
                    frappe.msgprint(
                      __("Booking {0} has been cancelled successfully.", [
                        frm.doc.name,
                      ])
                    );
                    frm.reload_doc();
                  } else {
                    frappe.msgprint(__("Error cancelling booking."));
                  }
                },
              });
            }
          );
        })
        .addClass("btn-dark");
    }
  },
});

