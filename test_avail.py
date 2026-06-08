import frappe
frappe.init(site="rental.local")
frappe.connect()

from rental_platform.rental_platform.available_item import get_item_availability

start_datetime = "2026-06-05 10:00:00"
end_datetime = "2026-06-10 10:00:00"

get_item_availability(start_datetime, end_datetime)
print("total items:", frappe.local.response.get('total items'))
