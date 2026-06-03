import frappe
from datetime import datetime


# def test():
#     items=frappe.get_all("Item",filters={'custom_show_in_rental_screen':1},fields=['name'])
#     frappe.local.response['item']=items

        
   
@frappe.whitelist(allow_guest=True)
def get_item_availability(start_datetime=None, end_datetime=None):
    from frappe.utils import now
    
    if not start_datetime:
        start_datetime = now()
    if not end_datetime:
        end_datetime = now()

    # Fetch all rental assets that are active
    assets = frappe.db.sql("""
        SELECT name as item_id, custom_stock_qty as stock_qty, asset_status
        FROM `tabRental Asset`
        WHERE asset_status != 'Inactive'
    """, as_dict=True)

    # Calculate active bookings for each asset
    # Active bookings exclude Draft, Cancelled, Completed, and Returned
    active_bookings = frappe.db.sql("""
        SELECT
            asset AS item_id,
            booking_status,
            SUM(quantity) AS total_booked
        FROM
            `tabRental Booking`
        WHERE
            booking_status NOT IN ('Returned', 'Completed', 'Cancelled', 'Draft')
            AND (
                start_date < %(end_datetime)s
                AND end_date > %(start_datetime)s
            )
        GROUP BY
            asset, booking_status
    """, {
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
    }, as_dict=True)

    booked_qty_map = {}
    booked_statuses_map = {}
    
    for b in active_bookings:
        booked_qty_map[b.item_id] = booked_qty_map.get(b.item_id, 0) + float(b.total_booked)
        if b.item_id not in booked_statuses_map:
            booked_statuses_map[b.item_id] = set()
        booked_statuses_map[b.item_id].add(b.booking_status)
    
    total_items_status = []
    
    # KPIs
    kpis = {
        "total": 0,
        "available": 0,
        "unavailable": 0,
        "reserved": 0,
        "onRide": 0,
        "maintenance": 0
    }
    
    for asset in assets:
        kpis["total"] += 1
        
        # Default to 1 if custom_stock_qty is not set or None
        stock = float(asset.stock_qty or 1)
        booked = float(booked_qty_map.get(asset.item_id, 0))
        available = max(0, stock - booked)
        
        # Priority Logic
        if asset.asset_status == "Maintenance":
            status = "Maintenance"
            available = 0 # Force available to 0 if maintenance
        elif available > 0:
            status = "Available"
        else:
            statuses = booked_statuses_map.get(asset.item_id, set())
            if "Picked Up" in statuses:
                status = "On Ride"
            elif "Reserved" in statuses:
                status = "Reserved"
            else:
                status = "Unavailable"
                
        # KPIs tracking based on determined status
        if status == "Maintenance":
            kpis["maintenance"] += 1
        elif status == "Available":
            kpis["available"] += 1
        elif status == "On Ride":
            kpis["onRide"] += 1
        elif status == "Reserved":
            kpis["reserved"] += 1
        elif status == "Unavailable":
            kpis["unavailable"] += 1
            
        total_items_status.append({
            "item_id": asset.item_id,
            "stock_quantity": stock,
            "booked_quantity": booked,
            "available_quantity": available,
            "status": status
        })

    frappe.local.response['total items'] = total_items_status
    frappe.local.response['kpis'] = kpis


