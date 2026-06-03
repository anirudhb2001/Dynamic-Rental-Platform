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
            asset
    """, {
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
    }, as_dict=True)

    booked_map = {b.item_id: b.total_booked for b in active_bookings}
    
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
        booked = float(booked_map.get(asset.item_id, 0))
        available = max(0, stock - booked)
        
        # Determine dynamic status based on availability
        if available > 0:
            status = "Available"
            kpis["available"] += 1
        else:
            status = "Unavailable"
            kpis["unavailable"] += 1
            
        if asset.asset_status == "Maintenance":
            kpis["maintenance"] += 1
            
        total_items_status.append({
            "item_id": asset.item_id,
            "stock_quantity": stock,
            "booked_quantity": booked,
            "available_quantity": available,
            "status": status
        })

    # Additional KPI for specific booking statuses in the timeframe
    status_counts = frappe.db.sql("""
        SELECT booking_status, COUNT(name) as count
        FROM `tabRental Booking`
        WHERE
            booking_status IN ('Reserved', 'Picked Up')
            AND (
                start_date < %(end_datetime)s
                AND end_date > %(start_datetime)s
            )
        GROUP BY booking_status
    """, {
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
    }, as_dict=True)

    for row in status_counts:
        if row.booking_status == 'Reserved':
            kpis["reserved"] = row.count
        elif row.booking_status == 'Picked Up':
            kpis["onRide"] = row.count

    frappe.local.response['total items'] = total_items_status
    frappe.local.response['kpis'] = kpis


