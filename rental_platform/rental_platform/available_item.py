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

    branding_tracking = frappe.db.get_single_value("Branding Settings", "default_asset_tracking_mode") or "Mixed"

    # Fetch all items to get tracking mode
    items = frappe.db.sql("""
        SELECT name as item_code, custom_asset_tracking_mode
        FROM `tabItem`
        WHERE custom_is_rental_asset = 1 AND disabled = 0
    """, as_dict=True)

    tracking_modes = {}
    for item in items:
        tracking_modes[item.item_code] = item.custom_asset_tracking_mode or branding_tracking
        if tracking_modes[item.item_code] == "Mixed":
            tracking_modes[item.item_code] = "Individual"

    # Fetch base assets (Items and Rental Assets)
    assets = frappe.db.sql("""
        SELECT name as item_id, name as item_code, 0 as stock_qty, 'Available' as asset_status
        FROM `tabItem`
        WHERE custom_is_rental_asset = 1 AND disabled = 0
        UNION
        SELECT name as item_id, item as item_code, custom_stock_qty as stock_qty, asset_status
        FROM `tabRental Asset`
        WHERE asset_status != 'Inactive'
    """, as_dict=True)

    # Calculate active bookings (Grouped by item_code AND serial_no if exists)
    active_bookings = frappe.db.sql("""
        SELECT
            IFNULL(item, asset) AS item_code,
            serial_no,
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
            IFNULL(item, asset), serial_no, booking_status
    """, {
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
    }, as_dict=True)

    # For individual items, map bookings by serial_no. For quantity items, map by item_code.
    booked_qty_map_qty = {}
    booked_statuses_map_qty = {}
    
    booked_qty_map_sn = {}
    booked_statuses_map_sn = {}

    for b in active_bookings:
        # Aggregate by item_code
        booked_qty_map_qty[b.item_code] = booked_qty_map_qty.get(b.item_code, 0) + float(b.total_booked)
        if b.item_code not in booked_statuses_map_qty:
            booked_statuses_map_qty[b.item_code] = set()
        booked_statuses_map_qty[b.item_code].add(b.booking_status)
        
        # Aggregate by serial_no if exists
        if b.serial_no:
            booked_qty_map_sn[b.serial_no] = booked_qty_map_sn.get(b.serial_no, 0) + float(b.total_booked)
            if b.serial_no not in booked_statuses_map_sn:
                booked_statuses_map_sn[b.serial_no] = set()
            booked_statuses_map_sn[b.serial_no].add(b.booking_status)

    total_items_status = []
    
    kpis = {
        "total": 0,
        "available": 0,
        "unavailable": 0,
        "reserved": 0,
        "onRide": 0,
        "maintenance": 0
    }
    
    for asset in assets:
        item_code = asset.item_code
        t_mode = tracking_modes.get(item_code, "Individual")
        
        if t_mode == "Individual":
            # If it's a Rental Asset natively (legacy), treat it as an individual
            if asset.item_id != asset.item_code:
                # Legacy rental asset
                stock = float(asset.stock_qty or 1)
                booked = float(booked_qty_map_qty.get(asset.item_id, 0))  # Assuming legacy books by asset
                available = max(0, stock - booked)
                status = asset.asset_status
                
                if status == "Maintenance":
                    available = 0
                    statuses = set()
                elif available > 0:
                    status = "Available"
                    statuses = booked_statuses_map_qty.get(asset.item_id, set())
                else:
                    statuses = booked_statuses_map_qty.get(asset.item_id, set())
                    status = "On Ride" if "Picked Up" in statuses else ("Reserved" if "Reserved" in statuses else "Unavailable")

                kpis["total"] += 1
                if available > 0: kpis["available"] += 1
                if "Reserved" in statuses: kpis["reserved"] += 1
                if "Picked Up" in statuses or "On Ride" in statuses: kpis["onRide"] += 1
                if asset.asset_status == "Maintenance": kpis["maintenance"] += 1
                
                total_items_status.append({
                    "item_id": asset.item_id,
                    "stock_quantity": stock,
                    "booked_quantity": booked,
                    "available_quantity": available,
                    "status": status
                })
            else:
                # Standard Item -> Fetch Serial Numbers
                serial_nos = frappe.get_all("Serial No", filters={"item_code": item_code, "status": "Active"}, fields=["name", "status", "maintenance_status"])
                for sn in serial_nos:
                    kpis["total"] += 1
                    sn_name = sn["name"]
                    
                    booked = float(booked_qty_map_sn.get(sn_name, 0))
                    stock = 1
                    available = max(0, stock - booked)
                    
                    if sn.get("maintenance_status") == "Under Maintenance":
                        status = "Maintenance"
                        available = 0
                        statuses = set()
                    elif available > 0:
                        status = "Available"
                        statuses = booked_statuses_map_sn.get(sn_name, set())
                    else:
                        statuses = booked_statuses_map_sn.get(sn_name, set())
                        status = "On Ride" if "Picked Up" in statuses else ("Reserved" if "Reserved" in statuses else "Unavailable")
                    
                    if available > 0: kpis["available"] += 1
                    if "Reserved" in statuses: kpis["reserved"] += 1
                    if "Picked Up" in statuses or "On Ride" in statuses: kpis["onRide"] += 1
                    if sn.get("maintenance_status") == "Under Maintenance": kpis["maintenance"] += 1
                    
                    total_items_status.append({
                        "item_id": sn_name,
                        "stock_quantity": stock,
                        "booked_quantity": booked,
                        "available_quantity": available,
                        "status": status
                    })
        else:
            # Quantity tracking mode
            if asset.item_id == asset.item_code:
                stock = float(frappe.db.sql("SELECT SUM(actual_qty) FROM `tabBin` WHERE item_code = %s", item_code)[0][0] or 0)
                booked = float(booked_qty_map_qty.get(item_code, 0))
                available = max(0, stock - booked)
                
                if available > 0:
                    status = "Available"
                else:
                    status = "Unavailable"
                
                kpis["total"] += stock
                kpis["available"] += available
                kpis["reserved"] += booked
                
                total_items_status.append({
                    "item_id": item_code,
                    "stock_quantity": stock,
                    "booked_quantity": booked,
                    "available_quantity": available,
                    "status": status
                })

    frappe.local.response['total items'] = total_items_status
    frappe.local.response['kpis'] = kpis


