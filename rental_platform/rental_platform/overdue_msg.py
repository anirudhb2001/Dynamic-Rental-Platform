# import frappe
# from frappe.utils import nowdate
# import requests
# import json


# def send_overdue_booking_notifications():
#     today = nowdate()
#     overdue_entries = frappe.get_all(
#         "Booking Entry",
#         filters={
#             "rental_to_date": ["<", today]
#         },
#         fields=["name", "customer", "custom_mobile_number"]
#     )

#     for entry in overdue_entries:
#         if entry.custom_mobile_number:
#             send_sms(entry.custom_mobile_number, f"Your booking {entry.name} is overdue. Please take necessary action.")



# def send_sms(custom_mobile_number, customer):
#     import requests
#     url = "https://thesmsbuddy.com/api/v1/sms/send/"
#     headers = {
#         "Content-Type": "application/json"
#     }
#     payload = {
#         "key": "deeL0CVfHImUUI4pFNnm3jDNr7faQ1AN",
#         "type": 1,
#         "sender": "RNTCAM",
#         "to": custom_mobile_number,
#         "message": f"Dear {customer}, your booking is overdue. Please take necessary action.",
#         "template_id": "1007794837639987"
#     }

#     try:
#         response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=5)
#         response.raise_for_status()
#     except requests.exceptions.RequestException as e:
#         frappe.log_error(f"SMS sending failed: {str(e)}")

import frappe
from frappe.utils import nowdate
import requests
from frappe.utils import nowdate, add_days
import json
from datetime import datetime

def send_overdue_booking_notifications():
    rental_settings = frappe.get_single("Rental Settings")
    if not rental_settings.overdue_check:
        return

    # Convert nowdate and add_days result to datetime.date
    today = datetime.strptime(nowdate(), "%Y-%m-%d").date()
    tomorrow = datetime.strptime(add_days(nowdate(), 1), "%Y-%m-%d").date()

    overdue_entries = frappe.get_all(
        "Booking Entry",
        filters={
            "status": ["in", ["Rented", "Partially Returned"]]
        },
        fields=[
            "name", "customer", "custom_mobile_number",
            "status", "rental_from_date", "rental_to_date", "actual_to_date"
        ]
    )

    for entry in overdue_entries:
        rental_from = entry.rental_from_date
        actual_to = entry.actual_to_date
        date_status = ""

        # Normalize to date if they are datetime objects
        if isinstance(rental_from, datetime):
            rental_from = rental_from.date()
        if isinstance(actual_to, datetime):
            actual_to = actual_to.date()

        if rental_from and actual_to:
            if actual_to == today:
                date_status = "Due Today"
            elif actual_to == tomorrow:
                date_status = "Due Tomorrow"
            elif rental_from <= today <= actual_to:
                date_status = "Active"
            elif today < rental_from:
                date_status = "Upcoming"
            elif today > actual_to:
                date_status = "Overdue"
        elif not rental_from:
            date_status = "No Rental From Date"
        elif not actual_to:
            date_status = "No Actual To Date"

        # Update return_status in the document
        frappe.db.set_value("Booking Entry", entry.name, "return_status", date_status)
        frappe.db.commit()

        # if entry.custom_mobile_number:
        #     send_sms(entry.custom_mobile_number, entry.customer, entry.name)

def send_sms(mobile, customer_name, booking_name):
    url = "https://thesmsbuddy.com/api/v1/sms/send/"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "key": "deeL0CVfHImUUI4pFNnm3jDNr7faQ1AN",
        "type": 1,
        "sender": "RNTCAM",
        "to": mobile,
        "message": f"Dear {customer_name}, your booking is overdue. Please take necessary action.",
        "template_id": "1007794837639987"
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=5)
        response.raise_for_status()

        # Log success message
        frappe.log_error(
            title="SMS Sent Successfully",
            message=f"SMS sent to {mobile} for Booking {booking_name}. Response: {response.text}"
        )
    except requests.exceptions.RequestException as e:
        # Log full error including response (if available)
        error_msg = f"Failed to send SMS to {mobile} for Booking {booking_name}. Error: {str(e)}"
        if e.response:
            error_msg += f"\nResponse content: {e.response.text}"
        frappe.log_error(
            title="SMS Sending Failed",
            message=error_msg
        )
