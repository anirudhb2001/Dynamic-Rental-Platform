frappe.listview_settings["Vehicle"] = {

onload(listview){

frappe.call({

method:
"rental.api.get_client",

callback(r){

listview.filter_area.add(

[
"Vehicle",
"vehicle_type",
"=",
r.message
]

);

}

});

}

};