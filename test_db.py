import frappe

def execute():
    frappe.init(site="rentcam.erp")
    frappe.connect()

    bookings = frappe.db.sql("""
        SELECT name, asset, booking_status, start_date, end_date, quantity, docstatus 
        FROM `tabRental Booking`
        ORDER BY creation DESC LIMIT 5
    """, as_dict=True)

    print("Recent Bookings:")
    for b in bookings:
        print(b)
        
    assets = frappe.db.sql("""
        SELECT name, asset_name, custom_stock_qty
        FROM `tabRental Asset`
        LIMIT 5
    """, as_dict=True)
    
    print("\nRecent Assets:")
    for a in assets:
        print(a)

execute()
