frappe.ui.form.on('Sales Order', {
    validate: function (frm) {
        if (frm.doc.custom_rental_from_date) {
            if (frm.doc.custom_rental_to_date && frm.doc.custom_rental_from_date > frm.doc.custom_rental_to_date) {
                frappe.throw(__('Rental From Date must be before Rental To Date.'));
            }
            if (frm.doc.custom_actual_to_date && frm.doc.custom_rental_from_date > frm.doc.custom_actual_to_date) {
                frappe.throw(__('Rental From Date must be before Actual To Date.'));
            }
        }
        if (frm.doc.custom_actual_to_date) {
            if (frm.doc.custom_rental_to_date && frm.doc.custom_actual_to_date > frm.doc.custom_rental_to_date) {
                frappe.throw(__('Actual To Date must be before or the same as Rental To Date.'));
            }
        }

        let total_rental_amount = 0;
        frm.doc.custom_rental_items.forEach(function (row) {
            total_rental_amount += row.amount || 0;
        });
        frm.doc.items.forEach(function (item) {
            if (item.item_code === "Rental Services") {
                item.rate = total_rental_amount;
                item.amount = total_rental_amount;
            }
        });
        frm.refresh_field('items');
    }
});

frappe.ui.form.on('Booking Details', {
    custom_rental_items: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.price && row.quantity) {
            frappe.model.set_value(cdt, cdn, 'amount', row.price * row.quantity);
        } else if (row.price) {
            frappe.model.set_value(cdt, cdn, 'amount', row.price);
        }
    },
    rental_item_id: function (frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        if (child.rental_item_id) {
            frappe.db.get_value('Item', child.rental_item_id, 'item_name', function (r) {
                frappe.model.set_value(cdt, cdn, 'item_name', r?.item_name || '');
            });
        } else {
            frappe.model.set_value(cdt, cdn, 'item_name', '');
        }
        if (child.rental_item_id && frm.doc.pricelist_name) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Item Price',
                    filters: { item_code: child.rental_item_id, price_list: frm.doc.pricelist_name },
                    fields: ['price_list_rate']
                },
                callback: function (data) {
                    frappe.model.set_value(cdt, cdn, 'price', data.message?.price_list_rate || 0);
                }
            });
        }
    },
    pricelist_name: function (frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        if (child.rental_item_id && child.pricelist_name) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Item Price',
                    filters: { item_code: child.rental_item_id, price_list: child.pricelist_name },
                    fields: ['price_list_rate']
                },
                callback: function (data) {
                    frappe.model.set_value(cdt, cdn, 'price', data.message?.price_list_rate || 0);
                }
            });
        }
    },
    quantity: function (frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        if (child.price && child.quantity) {
            frappe.model.set_value(cdt, cdn, 'amount', child.price * child.quantity);
        } else if (child.price) {
            frappe.model.set_value(cdt, cdn, 'amount', child.price);
        } else {
            frappe.model.set_value(cdt, cdn, 'amount', 0);
        }
    },
    price: function (frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        if (child.price && child.quantity) {
            frappe.model.set_value(cdt, cdn, 'amount', child.price * child.quantity);
        } else if (child.price) {
            frappe.model.set_value(cdt, cdn, 'amount', child.price);
        } else {
            frappe.model.set_value(cdt, cdn, 'amount', 0);
        }
    },
    custom_rental_items_add: function (frm) {
        frm.trigger('validate');
    },
    custom_rental_items_remove: function (frm) {
        frm.trigger('validate');
    },
    amount: function (frm, cdt, cdn) {
        frm.trigger('validate');
    }
});
