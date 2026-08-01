import frappe

def create_seating_type(name):
    if not frappe.db.exists("Seating Type", name):
        frappe.get_doc({
            "doctype": "Seating Type",
            "type_name": name
        }).insert()

def create_hotel(name):
    if not frappe.db.exists("Hotel Property", name):
        frappe.get_doc({
            "doctype": "Hotel Property",
            "hotel_name": name
        }).insert(ignore_permissions=True)

def create_event_type(name):
    if not frappe.db.exists("Event Type", name):
        doc = frappe.get_doc({
            "doctype": "Event Type",
            "event_type": name
        })
        try:
            doc.insert(ignore_permissions=True)
        except Exception:
            pass # Just in case it fails or schema differs

def create_customer(name, type, group, territory):
    if not frappe.db.exists("Customer", name):
        # Create Customer Group if it doesn't exist
        if not frappe.db.exists("Customer Group", group):
            frappe.get_doc({"doctype": "Customer Group", "customer_group_name": group, "is_group": 0}).insert(ignore_permissions=True)
        # Create Territory if it doesn't exist
        if not frappe.db.exists("Territory", territory):
            frappe.get_doc({"doctype": "Territory", "territory_name": territory, "is_group": 0, "parent_territory": "All Territories"}).insert(ignore_permissions=True, ignore_mandatory=True)
            
        doc = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": name,
            "customer_type": type,
            "customer_group": group,
            "territory": territory
        })
        # Add custom fields if validation hook expects them
        doc.set("custom_customer_verified", 1)
        doc.insert(ignore_permissions=True, ignore_mandatory=True)

def create_venue(hotel, name, size, capacities):
    item_code = f"{hotel} - {name}"
    if not frappe.db.exists("Item", item_code):
        item = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": name,
            "item_group": "Services", # Assuming Services exists, fallback to standard if not
            "is_stock_item": 0,
            "is_venue": 1,
            "hotel_property": hotel,
            "venue_size": size,
            "venue_size_unit": "sq. ft.",
            "venue_status": "Available",
            "stock_uom": "Nos"
        })
        
        for stype, cap in capacities.items():
            item.append("seating_capacities", {
                "seating_type": stype,
                "capacity": cap
            })
            
        try:
            item.insert()
        except frappe.exceptions.DoesNotExistError:
            # If "Services" doesn't exist, we will use "All Item Groups"
            item.item_group = "All Item Groups"
            item.insert()

def execute():
    seating_types = ["Floating", "U Shape", "Classroom", "Round Table", "Theatre"]
    for st in seating_types:
        create_seating_type(st)
        
    event_types = [
        "Wedding", "Wedding Reception", "Engagement", "Birthday Party", "Anniversary", 
        "Corporate Meeting", "Corporate Event", "Conference", "Seminar", "Product Launch", 
        "Family Function", "Social Gathering"
    ]
    for et in event_types:
        create_event_type(et)

    customers = [
        {"name": "Rahul & Anjali Wedding", "type": "Individual", "group": "Individual", "territory": "India"},
        {"name": "ABC Technologies Pvt Ltd", "type": "Company", "group": "Commercial", "territory": "India"},
        {"name": "Kerala Events & Celebrations", "type": "Company", "group": "Commercial", "territory": "India"},
        {"name": "Arun Kumar", "type": "Individual", "group": "Individual", "territory": "India"},
        {"name": "Greenfield Foundation", "type": "Company", "group": "Commercial", "territory": "India"}
    ]
    for c in customers:
        create_customer(c["name"], c["type"], c["group"], c["territory"])
        
    hotels = ["Abad Plaza", "Abad Atrium", "Abad Copper Castle", "Abad Turtle Beach"]
    for h in hotels:
        create_hotel(h)
        
    # Abad Plaza
    create_venue("Abad Plaza", "Grand Ballroom", 4000, {"Floating": 350, "U Shape": 120, "Classroom": 120, "Round Table": 120})
    create_venue("Abad Plaza", "Vantage Point", 4000, {"Floating": 350, "U Shape": 120, "Classroom": 120, "Round Table": 120})
    create_venue("Abad Plaza", "Inner Circle", 1100, {"Floating": 50, "U Shape": 35, "Classroom": 30, "Round Table": 30})
    create_venue("Abad Plaza", "Imperial", 800, {"Floating": 40, "U Shape": 30, "Classroom": 25, "Round Table": 25})
    create_venue("Abad Plaza", "Garden Court 1", 400, {"Floating": 20, "U Shape": 18, "Classroom": 15, "Round Table": 15})
    create_venue("Abad Plaza", "Garden Court 2", 400, {"Floating": 20, "U Shape": 18, "Classroom": 15, "Round Table": 15})
    create_venue("Abad Plaza", "Rendezvous", 400, {"Floating": 20, "U Shape": 18, "Classroom": 15, "Round Table": 15})

    # Abad Atrium
    create_venue("Abad Atrium", "The Event", 800, {"Floating": 35, "U Shape": 25, "Classroom": 20, "Round Table": 20})
    create_venue("Abad Atrium", "Forum Banquet Hall", 400, {"Floating": 15, "U Shape": 10, "Classroom": 12, "Round Table": 12})
    
    # Abad Copper Castle
    create_venue("Abad Copper Castle", "Banquet Hall", 850, {"Floating": 125, "U Shape": 35, "Classroom": 40, "Theatre": 100})
    
    # Abad Turtle Beach
    create_venue("Abad Turtle Beach", "Banquet Hall", 1200, {"Floating": 100, "U Shape": 30, "Classroom": 100, "Theatre": 100})
    
    frappe.db.commit()
    print("Seeding completed successfully")
