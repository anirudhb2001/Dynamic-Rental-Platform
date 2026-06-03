# Copyright (c) 2026, Faircode Technologies Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class RentalReturn(Document):
	pass

def on_submit(self):

    booking = frappe.get_doc(
        "Rental Booking",
        self.booking
    )

    for item in booking.rental_items:

        asset = frappe.get_doc(
            "Rental Asset",
            item.rental_asset
        )

        asset.status = "Available"

        asset.save(
            ignore_permissions=True
        )

    booking.status = "Returned"

    booking.save()