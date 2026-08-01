import frappe
from frappe.utils import getdate

@frappe.whitelist(allow_guest=False)
def get_return_dashboard_stats():
    # Only active, submitted bookings
    bookings = frappe.get_all(
        "Booking Entry",
        filters={"docstatus": 1},
        fields=["name", "status as booking_status", "return_status", "actual_to_date"]
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
        if b.booking_status in ["Reserved", "Rented"]:
            stats["active_rentals"] += 1
            
        if b.booking_status == "Rented":
            end_date = getdate(b.actual_to_date) if b.actual_to_date else getdate()
            if end_date == today:
                stats["due_today"] += 1
            elif end_date < today:
                stats["overdue"] += 1
                
            stats["return_pending"] += 1
            
        elif b.booking_status == "Returned" or b.return_status == "Returned":
            stats["return_pending"] += 1
            
        elif b.booking_status == "Completed":
            pass

    stats["completed_today"] = frappe.db.count("Booking Entry", {
        "docstatus": 1,
        "status": "Completed",
        "modified": ["Like", f"{today}%"]
    })
            
    return stats

@frappe.whitelist(allow_guest=False)
def get_admin_return_bookings(tab="All"):
    # Base filters
    filters = {"docstatus": 1}
    
    bookings = frappe.get_all(
        "Booking Entry",
        filters=filters,
        fields=[
            "name", "customer", "rental_from_date", "rental_to_date", "actual_to_date", 
            "status as booking_status", "return_status", "creation", "sales_order"
        ],
        order_by="actual_to_date asc"
    )
    
    today = getdate()
    result = []
    
    for b in bookings:
        b["asset_name"] = "Multiple Items"
        
        # Try to get first item name for asset_name
        first_item = frappe.db.get_value("Booking details Table", {"parent": b.name}, "item_name")
        if first_item:
            b["asset_name"] = first_item

        b["warehouse"] = ""
            
        b["customer_name"] = frappe.db.get_value("Customer", b.customer, "customer_name") or b.customer
        
        start = getdate(b.rental_from_date) if b.rental_from_date else getdate(b.creation)
        end = getdate(b.actual_to_date) if b.actual_to_date else getdate(b.rental_to_date) if b.rental_to_date else today
        b["rental_days"] = max(1, (end - start).days + 1)
        b["end_date"] = end
        
        b["overdue_days"] = 0
        if b.booking_status not in ["Returned", "Completed"]:
            if end < today:
                b["overdue_days"] = (today - end).days
                
        # Financials from Sales Order
        b["agreement_amount"] = 0.0
        b["advance_amount"] = 0.0
        
        if b.sales_order:
            so_data = frappe.db.get_value("Sales Order", b.sales_order, ["grand_total", "advance_paid"], as_dict=True)
            if so_data:
                b["agreement_amount"] = float(so_data.grand_total or 0)
                b["advance_amount"] = float(so_data.advance_paid or 0)
                
        b["balance_amount"] = b["agreement_amount"] - b["advance_amount"]
        
        # Derive specific statuses dynamically
        b["ui_status"] = b.booking_status
        if b.booking_status == "Rented" and b["overdue_days"] > 0:
            b["ui_status"] = "Overdue"
        elif b.booking_status == "Rented" and end == today:
            b["ui_status"] = "Due Today"
        
        b["invoice_status"] = ""
        
        # Apply tab filtering
        if tab == "Active Rentals" and b.booking_status not in ["Reserved", "Rented"]:
            continue
        if tab == "Due Today" and b["ui_status"] != "Due Today":
            continue
        if tab == "Overdue" and b["ui_status"] != "Overdue":
            continue
        if tab == "Return Pending" and b.booking_status not in ["Rented", "Returned"]:
            continue
        if tab == "Completed" and b.booking_status != "Completed":
            continue
            
        result.append(b)
        
    return result

@frappe.whitelist(allow_guest=False)
def generate_return_invoice(booking_id):
    # This acts as a wrapper around the process if needed, or we just call complete
    return {"message": "Success"}
