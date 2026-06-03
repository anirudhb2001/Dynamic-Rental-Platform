// Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Rental Booking", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("Rental Booking", {
    refresh(frm) {

        if(frm.doc.status === "Reserved") {

            frm.add_custom_button(
                "Hand Over Vehicle",
                () => {

                    frappe.call({
                        method:
                        "rental_platform.api.booking.hand_over",

                        args: {
                            booking: frm.doc.name
                        },

                        callback() {
                            frm.reload_doc();
                        }
                    })

                }
            )

        }

    }
})