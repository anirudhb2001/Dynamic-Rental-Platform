import frappe
import json
from rental_platform.rental_platform.available_item import get_item_availability

def execute():
    get_item_availability()
    print("API RESPONSE SAMPLE: ")
    print(json.dumps(frappe.local.response, indent=2, default=str))
