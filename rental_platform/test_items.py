import frappe
import sys
sys.path.append('apps/rental_platform')
from rental_platform.web_api.items import get_item_list
from rental_platform.available_item import get_item_availability

def run():
    print("--- items.py ---")
    res = get_item_list()
    if res.get("items"):
        for i in res["items"]:
            print(i.get("item_name"), i.get("tracking_mode"), i.get("status"), i.get("stock_qty"))
            
    print("\n--- available_item.py ---")
    try:
        get_item_availability()
        res2 = frappe.local.response
        print(res2.get("kpis"))
        for i in res2.get("total items", []):
            print(i)
    except Exception as e:
        print("Error:", e)
