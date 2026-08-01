import frappe

def execute():
    doctypes_to_delete = [
        "Rental Asset",
        "Rental Asset Category",
        "Rental Category",
        "Rental Inspection",
        "Rental Item",
        "Rental Notification",
        "Rental Order",
        "Rental Order Item",
        "Rental Pricing Template",
        "Rental Return",
        "Rental Security Document Type",
        "Rental Settings",
        "Rental Type",
        "Rental Type Field",
        "Rental Vehicle",
        "Rental Booking"
    ]
    
    for dt in doctypes_to_delete:
        try:
            # Delete instances first
            instances = frappe.get_all(dt, pluck="name")
            for instance in instances:
                frappe.delete_doc(dt, instance, force=1)
                
            # Delete doctype
            frappe.delete_doc("DocType", dt, force=1)
            print(f"Deleted DocType: {dt}")
        except frappe.DoesNotExistError:
            print(f"DocType not found: {dt}")
        except Exception as e:
            print(f"Failed to delete {dt}: {str(e)}")
            
    frappe.db.commit()
