app_name = "rental_platform"
app_title = "Rental Platform"
app_publisher = "Faircode Technologies Pvt Ltd"
app_description = "Rental Platform for managing rental operations."
app_email = "anirudhbelkm29@gmail.com"
app_license = "mit"

# Apps
# ------------------
api = [
    {"endpoint": "/api/price-list", "function": "rental_platform.web_api.items.get_price_lists"}
]
# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "rental_platform",
# 		"logo": "/assets/rental_platform/logo.png",
# 		"title": "Rental Platform",
# 		"route": "/rental_platform",
# 		"has_permission": "rental_platform.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/rental_platform/css/rental_platform.css"
# app_include_js = "/assets/rental_platform/js/rental_platform.js"

# include js, css files in header of web template
# web_include_css = "/assets/rental_platform/css/rental_platform.css"
# web_include_js = "/assets/rental_platform/js/rental_platform.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "rental_platform/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_list_js = {"Customer" : "public/js/customer_list.js",
                    "Sales Invoice":"public/js/custom_sales_invoice.js",
                    "Contact":"public/js/phoneno_edit.js"}
doctype_js = {
    "Quotation": "public/js/quotation.js",
    "Sales Order": "public/js/sales_order.js",
    "Sales Invoice":"public/js/Sales_invoice.js",
    "Product Bundle" : "public/js/custom_product_bundle.js",
    
}


# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "rental_platform/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "rental_platform.utils.jinja_methods",
# 	"filters": "rental_platform.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "rental_platform.install.before_install"
# after_install = "rental_platform.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "rental_platform.uninstall.before_uninstall"
# after_uninstall = "rental_platform.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "rental_platform.utils.before_app_install"
# after_app_install = "rental_platform.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "rental_platform.utils.before_app_uninstall"
# after_app_uninstall = "rental_platform.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "rental_platform.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }
doc_events = {
    

    "Contact": {
        "validate":"rental_platform.rental_platform.contact.validate_contact_name",
        "on_update": "rental_platform.rental_platform.contact.contact_sync",
    },

    # "Item": {
    #     "on_update": "rental_platform.web_api.items.get_item_list",  # Ensure correct method path here
    # },

    "Google Contacts":{
        "validate":"rental_platform.rental_platform.contact.validate_enable"
        },
    
    "Sales Invoice":{
        "on_submit":"rental_platform.web_api.Updatestatus.update_booking_entry_status",
        "before_submit":"rental_platform.web_api.Updatestatus.create_stock_entry_on_sales_invoice_submit",
        "validate":"rental_platform.web_api.validate.sales_invoice_validate",
        "before_save": "rental_platform.rental_platform.custom_sales_invoice.fetch_booking_details",
        "autoname": "rental_platform.web_api.naming.sales_invoice_naming",
        },
    "Warehouse": {
        "validate": "rental_platform.web_api.validate.warehouse_validate"
    },
    "Customer": {
        "validate": "rental_platform.web_api.validate.validate_customer_verification",
    },
    "Sales Order": {
        "on_submit": "rental_platform.email.order_confirmation",
    }
#         "Quotation": {
#         "on_submit": "rental_platform.rental_platform.doctype.booking_entry.booking_entry.create_booking_entry"
#     }
}

# Scheduled Tasks
# ---------------
scheduler_events = {
    "cron": {
        "0 10 * * *": [
            "rental_platform.rental_platform.overdue_msg.send_overdue_booking_notifications"
        ]
    }
}



# scheduler_events = {
# 	"all": [
# 		"rental_platform.tasks.all"
# 	],
# 	"daily": [
# 		"rental_platform.tasks.daily"
# 	],
# 	"hourly": [
# 		"rental_platform.tasks.hourly"
# 	],
# 	"weekly": [
# 		"rental_platform.tasks.weekly"
# 	],
# 	"monthly": [
# 		"rental_platform.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "rental_platform.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "rental_platform.event.get_events"
# }
override_whitelisted_methods = {
    "frappe.desk.reportview.delete_items": "rental_platform.rental_platform.customer_otp.custom_delete_items",
    
}

#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "rental_platform.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["rental_platform.utils.before_request"]
# after_request = ["rental_platform.utils.after_request"]

# Job Events
# ----------
# before_job = ["rental_platform.utils.before_job"]
# after_job = ["rental_platform.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"rental_platform.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

fixtures = [{
    "dt": "Custom Field",
    "filters": [
		["name", "in", [

            'Customer-custom_verify_otp',
            'Customer-custom_alternate_number',
            'OTP Verification-custom_alternate_phone',
            'OTP Verification-custom_alternate_otp',
            'Customer-custom_verify_alternate_otp',
            'Price List-custom_counter',
            'Item-custom_show_in_rental_screen',
            'Item-custom_custom_barcode',
            'Quotation-custom_rental_items',
            'Quotation-custom_actual_to_date',
            'Quotation-custom_rental_to_date',
            'Quotation-custom_rental_from_date',
            'Quotation-custom_booking_details',
            'Price List-custom_valid_hour',
            'Sales Order-custom_booking_entry',
            'Sales Order-custom_rental_items',
            'Sales Order-custom_actual_to_date',
            'Sales Order-custom_rental_to_date',
            'Sales Order-custom_rental_from_date',
            'Sales Invoice-custom_booking_entry',
            'Sales Invoice-custom_rental_from_date',
            'Sales Invoice-custom_rental_to_date',
            'Sales Invoice-custom_actual_to_date',
            'Sales Invoice-custom_section_break_vk25a',
            'Sales Invoice-custom_rental_items',
            'OTP Verification-custom_customer_name',
            'OTP Verification-custom_total_amount',
            'OTP Verification-custom_sms_type',
            'Booking Entry-custom_mobile_number',
            'Payment Entry-custom_booking_entry',
            'Customer-custom_remarks',
            'Customer-custom_yellow_list',
            'Customer-custom_black_list',
            'Sales Invoice-custom_is_extended',
            'Warehouse-custom_is_customer_warehouse',
            'Warehouse-custom_ecommerce_warehouse',
            'Stock Entry-custom_is_return',
            'Warehouse-custom_ecommerce_warehouse',
            'Stock Entry-custom_is_return',
            'Stock Entry-custom_booking_entry',
            'Customer-custom_customer_verified',
            'Booking Entry-custom_rental_security_documents',
            'Booking Entry-custom_rental_security',
            'Product Bundle Item-custom_is_main_item',
            'Customer-custom_email',
            'Sales Invoice-custom_rental_details',
            'Sales Invoice-custom_column_break_tx32a',
            'Item-custom_is_bulk_item',
            'Sales Invoice-custom_rental_security',
            'Sales Invoice-custom_rental_security_documents'

            
            
            

        ]]
	]
},
{
    "dt": "Property Setter",
    "filters":[
        ["name", "in",[
            'Booking Entry-main-links_order',
            'Sales Invoice-main-field_order',
            'Customer-mobile_no-fetch_from',
            'Customer-main-autoname',
            'Customer-mobile_no-reqd',
            'Customer-custom_alternate_number-reqd',
            'Payment Entry-paid_amount-label',
            'Customer-main-field_order',
            'Booking Entry-main-links_order',
            'Customer-mobile_no-in_standard_filter',
            'Booking Entry-rental_items-mandatory_depends_on',
            'Item-brand-mandatory_depends_on',
            'Item-gst_hsn_code-mandatory_depends_on',
            'Item Price-uom-default',
            'Item-gst_hsn_code-default',
            'Item Group-gst_hsn_code-default'
        ]]
    ]

}]

website_route_rules = [{'from_route': '/dashboard/<path:app_path>', 'to_route': 'dashboard'},]
