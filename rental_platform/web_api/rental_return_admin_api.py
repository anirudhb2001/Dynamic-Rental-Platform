import frappe
from frappe.utils import getdate

@frappe.whitelist(allow_guest=False)
def get_return_dashboard_stats():
    # Only active, submitted bookings
    bookings = frappe.get_all(
        "Rental Booking",
        filters={"docstatus": 1},
        fields=["name", "booking_status", "end_date"]
    )
    
    today = getdate()
    stats = {
        "active_rentals": 0,
        "due_today": 0,
        "overdue": 0,
        "return_pending": 0,
        "completed_today": 0
    }
    
    for b in bookings:
        if b.booking_status in ["Reserved", "Picked Up"]:
            stats["active_rentals"] += 1
            
        if b.booking_status == "Picked Up":
            end_date = getdate(b.end_date)
            if end_date == today:
                stats["due_today"] += 1
            elif end_date < today:
                stats["overdue"] += 1
                
            # If it's Picked Up, it hasn't been returned yet, so Return Pending
            stats["return_pending"] += 1
            
        elif b.booking_status == "Returned":
            stats["return_pending"] += 1 # Needs to be Completed
            
        elif b.booking_status == "Completed":
            # Just an example logic for completed today. Ideally would check modified date
            pass

    # For completed today, let's query exactly
    stats["completed_today"] = frappe.db.count("Rental Booking", {
        "docstatus": 1,
        "booking_status": "Completed",
        "modified": ["Like", f"{today}%"]
    })
            
    return stats

@frappe.whitelist(allow_guest=False)
def get_admin_return_bookings(tab="All"):
    # Base filters
    filters = {"docstatus": 1}
    
    bookings = frappe.get_all(
        "Rental Booking",
        filters=filters,
        fields=[
            "name", "customer", "asset", "start_date", "end_date", 
            "booking_status", "rental_rate", "quantity", "deposit_amount", "creation"
        ],
        order_by="end_date asc"
    )
    
    today = getdate()
    result = []
    
    for b in bookings:
        b["asset_name"] = frappe.db.get_value("Rental Asset", b.asset, "asset_name") or b.asset
        b["warehouse"] = frappe.db.get_value("Rental Asset", b.asset, "location") or ""
        b["customer_name"] = b.customer
        
        start = getdate(b.start_date) if b.start_date else getdate(b.creation)
        end = getdate(b.end_date) if b.end_date else today
        b["rental_days"] = max(1, (end - start).days + 1)
        
        b["overdue_days"] = 0
        if b.booking_status not in ["Returned", "Completed"]:
            if end < today:
                b["overdue_days"] = (today - end).days
                
        # Financials
        b["agreement_amount"] = float(b.rental_rate or 0) * float(b.quantity or 1)
        b["advance_amount"] = float(b.deposit_amount or 0)
        b["balance_amount"] = b["agreement_amount"] - b["advance_amount"]
        
        # Derive specific statuses dynamically
        b["ui_status"] = b.booking_status
        if b.booking_status == "Picked Up" and b["overdue_days"] > 0:
            b["ui_status"] = "Overdue"
        elif b.booking_status == "Picked Up" and end == today:
            b["ui_status"] = "Due Today"
        
        # We also derive Inspection Pending / Invoice Pending for the dashboard
        b["invoice_status"] = ""
        if b.booking_status == "Returned":
            b["ui_status"] = "Inspection Pending"
            has_inspection = frappe.db.exists("Rental Inspection", {"booking": b.name})
            if has_inspection:
                b["ui_status"] = "Invoice Pending"
                
        # Always check for invoice to populate invoice_status filter
        invoice_name = frappe.db.get_value("Rental Return", {"booking": b.name}, "sales_invoice")
        if invoice_name:
            if b.booking_status == "Returned" and b["ui_status"] == "Invoice Pending":
                b["ui_status"] = "Settlement Pending"
            b["invoice_status"] = frappe.db.get_value("Sales Invoice", invoice_name, "status")
                    
        # Apply tab filtering
        if tab == "Active Rentals" and b.booking_status not in ["Reserved", "Picked Up"]:
            continue
        if tab == "Due Today" and b["ui_status"] != "Due Today":
            continue
        if tab == "Overdue" and b["ui_status"] != "Overdue":
            continue
        if tab == "Return Pending" and b.booking_status not in ["Picked Up", "Returned"]:
            continue
        if tab == "Completed" and b.booking_status != "Completed":
            continue
            
        result.append(b)
        
    return result

@frappe.whitelist(allow_guest=False)
def generate_return_invoice(booking_id):
    # This acts as a wrapper around the process if needed, or we just call complete
    return {"message": "Success"}
