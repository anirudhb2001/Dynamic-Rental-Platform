// Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("Rental Booking", {
    refresh(frm) {
        // Only show actions for submitted records
        if (frm.doc.docstatus === 1) {
            
            if (frm.doc.booking_status === "Reserved") {
                frm.add_custom_button(
                    "Mark Picked Up",
                    () => {
                        frappe.call({
                            method: "rental_platform.web_api.booking_actions_api.mark_as_picked_up",
                            args: {
                                booking_id: frm.doc.name
                            },
                            callback(r) {
                                if (!r.exc) {
                                    frm.reload_doc();
                                    frappe.show_alert({message: "Asset Picked Up", indicator: "green"});
                                }
                            }
                        });
                    },
                    "Actions"
                );
            }
            
            if (["Returned", "Picked Up", "Reserved"].includes(frm.doc.booking_status)) {
                frm.add_custom_button(
                    "Complete Rental",
                    () => {
                        frappe.confirm(
                            "Are you sure you want to mark this rental as completely settled and closed?",
                            () => {
                                frappe.call({
                                    method: "rental_platform.web_api.booking_actions_api.mark_as_completed",
                                    args: {
                                        booking_id: frm.doc.name
                                    },
                                    callback(r) {
                                        if (!r.exc) {
                                            frm.reload_doc();
                                            frappe.show_alert({message: "Rental Completed", indicator: "green"});
                                        }
                                    }
                                });
                            }
                        );
                    },
                    "Actions"
                );
            }
        }
    }
});