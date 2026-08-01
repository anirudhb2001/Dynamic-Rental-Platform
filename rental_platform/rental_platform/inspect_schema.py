import frappe

def execute():
    item_fields = [f.fieldname for f in frappe.get_meta("Item").fields]
    be_fields = [f.fieldname for f in frappe.get_meta("Booking Entry").fields]
    
    print("Item Fields:", [f for f in item_fields if 'venue' in f or 'hotel' in f])
    print("Booking Entry Fields:", [f for f in be_fields if 'venue' in f or 'hotel' in f or 'seating' in f])
