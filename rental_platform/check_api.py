import frappe
from rental_platform.web_api.rental_return_api import get_returnable_bookings
def execute():
    res = get_returnable_bookings()
    print("Found {} bookings from API".format(len(res)))
    for r in res:
        print(r)
    return res
