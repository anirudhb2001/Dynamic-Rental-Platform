// Copyright (c) 2024, nakul@faircodetech.com and contributors
// For license information, please see license.txt

frappe.ui.form.on("Booking Entry", {
  refresh(frm) {

    //if (frm.doc.docstatus !== 1) return;




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
    //console.log("Booking Entry status:", frm.doc.status);
    if (frm.doc.custom_returned_early) {
            frm.dashboard.add_indicator(__("Returned Early"), "orange");
            return;
    }
    frm.add_custom_button(__("Mark Early Return"), () => {
            show_early_return_dialog(frm);
    }).addClass("btn-warning");

    // Show button only when the status is 'Reserved'
    if (frm.doc.status === "Reserved") {
      //console.log("Adding Cancel Booking button for status:", frm.doc.status);
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


function show_early_return_dialog(frm) {
    const d = new frappe.ui.Dialog({
        title: __("Mark Early Return"),
        fields: [
            {
                fieldname: "info_html",
                fieldtype: "HTML",
                options: `<div class="text-muted small" style="margin-bottom:10px;">
                    Current Rental To: <b>${frappe.datetime.str_to_user(frm.doc.rental_to_date)}</b><br>
                    This will cancel the linked Quotation, Sales Order, and Sales Invoice,
                    then re-amend them with the new return date.
                </div>`,
            },
            {
                fieldname: "custom_returned_early",
                label: __("Confirm: Product Returned Earlier"),
                fieldtype: "Check",
                default: 0,
                reqd: 1,
            },
            {
                fieldname: "early_return_date",
                label: __("Actual Return Date & Time"),
                fieldtype: "Datetime",
                reqd: 1,
                //default: frappe.datetime.now_datetime(),
                depends_on: "custom_returned_early",
                mandatory_depends_on: "custom_returned_early",
            },
        ],
        primary_action_label: __("Confirm Early Return"),
        primary_action(values) {
            if (!values.custom_returned_early) {
                frappe.msgprint(__("Please tick the confirmation checkbox."));
                return;
            }
            frappe.confirm(
                __("This will cancel and amend BE {0} along with its linked documents. Continue?", [frm.doc.name]),
                () => {
                    frappe.dom.freeze(__("Processing early return..."));
                    frappe.call({
                        method: "rental_platform.rental_platform.doctype.booking_entry.booking_entry.mark_early_return2",
                        args: {
                            booking_entry: frm.doc.name,
                            early_return_date: values.early_return_date,
                        },
                        callback: (r) => {
                            frappe.dom.unfreeze();
                            if (r.message) {
                                d.hide();
                                frappe.show_alert({
                                    message: __("Redirecting to amended Booking Entry {0}", [r.message]),
                                    indicator: "green",
                                });
                                frappe.set_route("Form", "Booking Entry", r.message);
                            }
                        },
                        error: () => frappe.dom.unfreeze(),
                    });
                }
            );
        },
    });
    d.show();
}

