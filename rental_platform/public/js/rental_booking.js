frappe.ui.form.on(
"Rental Booking",
{

return_date(frm){

if(
frm.doc.pickup_date &&
frm.doc.return_date
){

let start =
new Date(frm.doc.pickup_date);

let end =
new Date(frm.doc.return_date);

let days =
(end-start)/(1000*60*60*24);

frm.set_value(
"rental_days",
days
);

}

}

}
)