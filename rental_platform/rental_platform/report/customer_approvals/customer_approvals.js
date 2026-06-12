frappe.query_reports["Customer Approvals"] = {
	"filters": [
		{
			"fieldname":"status",
			"label": __("Approval Status"),
			"fieldtype": "Select",
			"options": "\nPending\nApproved\nRejected",
			"default": "Pending"
		}
	],
	"formatter": function(value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		
		if (column.fieldname == "actions") {
		    if (data.portal_approval_status === "Pending") {
			    return `
			        <button class="btn btn-xs btn-success" onclick="frappe.custom_approve_customer('${data.customer}')">Approve</button>
			        <button class="btn btn-xs btn-danger" onclick="frappe.custom_reject_customer('${data.customer}')">Reject</button>
			    `;
			} else {
			    return `<span>${data.portal_approval_status}</span>`;
			}
		}
		
		if (column.fieldname == "portal_approval_status") {
		    if (data.portal_approval_status === "Pending") {
		        return `<span class="indicator-pill orange">${data.portal_approval_status}</span>`;
		    } else if (data.portal_approval_status === "Approved") {
		        return `<span class="indicator-pill green">${data.portal_approval_status}</span>`;
		    } else {
		        return `<span class="indicator-pill red">${data.portal_approval_status}</span>`;
		    }
		}
		return value;
	}
};

frappe.custom_approve_customer = function(customer_id) {
    frappe.confirm('Are you sure you want to approve this customer?', () => {
        frappe.call({
            method: 'rental_platform.web_api.customer_portal_auth.update_approval_status',
            args: {
                customer_id: customer_id,
                status: 'Approved'
            },
            callback: function(r) {
                if (r.message && r.message.success) {
                    frappe.show_alert({message:__('Customer Approved'), indicator:'green'});
                    frappe.query_report.refresh();
                } else {
                    frappe.msgprint(r.message ? r.message.message : 'Error approving customer');
                }
            }
        });
    });
};

frappe.custom_reject_customer = function(customer_id) {
    frappe.confirm('Are you sure you want to reject this customer?', () => {
        frappe.call({
            method: 'rental_platform.web_api.customer_portal_auth.update_approval_status',
            args: {
                customer_id: customer_id,
                status: 'Rejected'
            },
            callback: function(r) {
                if (r.message && r.message.success) {
                    frappe.show_alert({message:__('Customer Rejected'), indicator:'red'});
                    frappe.query_report.refresh();
                } else {
                    frappe.msgprint(r.message ? r.message.message : 'Error rejecting customer');
                }
            }
        });
    });
};
