import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  getCustomerLists,
  getCategories,
  getWarehouseList,
  getUserWarehouse,
  getAllWarehouseList,
} from "../../services/api.jsx";
import { PiCaretUpDownLight } from "react-icons/pi";
import "react-datepicker/dist/react-datepicker.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { renderTimeViewClock } from "@mui/x-date-pickers/timeViewRenderers";
import { MdOutlineClear } from "react-icons/md";
import dayjs from "dayjs";
import { VITE_PUBLIC_ADD_CUSTOMER_URL } from "../../../../constants.js";
import {
  LuBike,
  LuCalendarClock,
  LuCheckCircle2,
  LuFilter,
  LuRotateCcw,
  LuSearch,
  LuUser,
  LuWarehouse,
} from "react-icons/lu";

const SideNav = ({
  companyName,
  onTabChange,
  selectedCategory,
  setSelectedCategory,
  onDateChange,
  pickupDate,
  returnDate,
  actualReturnDate,
  selectedCustomer,
  setSelectedCustomer,
  onClearFilter,
  activeTab,
  setActiveTab,
  isDateFieldDisabled,
  isDropdownOpen,
  setIsDropdownOpen,
  forceAvailable,
  filterCustomer,
  setFilterCustomer,
  allBookingData,
  setFinancialData,
  setFilterWarehouse,
  filterWarehouse,
  setCurrentPageBooking,
  setSelectedWarehouse,
  extendpickupDate,
  setExtendPickupDate,
  extendreturnDate,
  setExtendReturnDate,
  selectedWarehouse,
  setCurrentPage,
  isLoading,
  addToast,
  setIsUserWarehouse,
  isUserWarehouse,
  setMainCartItems,
  setFilterDateStatus,
  setIsDateDropdownOpen,
  filterDateStatus,
  isDateDropdownOpen,
  selectedItemAvailStatus,
  setSelectedItemAvailStatus,
  setIsItemStatusDropOpen,
  isItemStatusDropOpen,
}) => {
  const safeAllBookingData = Array.isArray(allBookingData)
    ? allBookingData
    : [];
  // state for storing the fetched items from the api.

  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allWarehouse, setAllWarehouse] = useState([]);
  const [customers, setCustomers] = useState([]);

  // fetches all the data from the api

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const userWarehouse = await getUserWarehouse();

        if (userWarehouse) {
          setIsUserWarehouse(true);
          if (Array.isArray(userWarehouse)) {
            setWarehouses(userWarehouse);
            setSelectedWarehouse(userWarehouse[0]?.warehouse || "");
          } else if (userWarehouse.warehouse_name) {
            const formattedData = [
              {
                id: userWarehouse.warehouse_name,
                warehouse_name: userWarehouse.warehouse_name,
              },
            ];
            setWarehouses(formattedData);
            setSelectedWarehouse(formattedData[0].warehouse_name);
          }
        } else {
          const response = await getWarehouseList();
          setIsUserWarehouse(false);
          const formattedData = response.map((warehouse_data) => ({
            id: warehouse_data.warehouse_id,
            warehouse_name: warehouse_data.warehouse,
          }));
          setWarehouses(formattedData);
        }
      } catch (error) {
        addToast(error.message || "Failed to fetch data", "error");
      }
    };

    const fetchCustomers = async () => {
      try {
        const response = await getCustomerLists();
        const formattedData = response.map((customer_data) => ({
          customer_id: customer_data.customer_id,
          customer_name: customer_data.customer_name,
          customer_phone: customer_data.mobile_no,
          bookings: customer_data.bookings || [], // <-- use 'bookings' here
        }));
        setCustomers(formattedData);
      } catch (error) {
        addToast(error.message || "Error fetching customer lists", "error");
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await getCategories();
        const formattedData = response.map((category_data) => ({
          id: category_data.category_id,
          name: category_data.category_name,
          item_count: category_data.item_count || 0,
        }));
        setCategories(formattedData);
      } catch (error) {
        addToast(error.message || "Error fetching categories", "error");
      }
    };

    const fetchAllWarehouse = async () => {
      try {
        const response = await getAllWarehouseList();
        const formattedData = response.map((warehouse_list) => ({
          warehouse_id: warehouse_list.warehouse,
        }));
        setAllWarehouse(formattedData);
      } catch (error) {
        addToast(error.message || "Error fetching warehouse", "error");
      }
    };

    fetchCustomers();
    fetchCustomers();
    fetchCategories();
    fetchWarehouses();
    fetchAllWarehouse();
  }, []);

  // customer functionality in rental screen
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const filterRentalCustomer = customers.filter(
    (customer) =>
      customer.customer_id
        .toLowerCase()
        .includes(customerSearchTerm.toLowerCase()) ||
      customer.customer_phone
        ?.toLowerCase()
        .includes(customerSearchTerm.toLowerCase())
  );

  const handleSelectCustomer = (customerId) => {
    const selected = customers.find((c) => c.customer_id === customerId);
    setSelectedCustomer(customerId);
    setIsDropdownOpen(false);

    const hasOverdue = selected?.bookings?.some(
      (booking) => booking.return_status === "Overdue"
    );

    if (hasOverdue) {
      addToast(
        `Warning: ${selected.customer_name} has overdue booking(s)!`,
        "warning"
      );
    }
  };

  const addCustomer = () => {
    const redirectUrl = `${VITE_PUBLIC_ADD_CUSTOMER_URL}`;
    window.location.href = redirectUrl;
  };

  const clearCustomer = (e) => {
    e.stopPropagation();
    setSelectedCustomer("");
    setCustomerSearchTerm("");
    setMainCartItems([]);
  };

  // Pickup date functionalities in rental screen

  const handleDateChange = (type, date) => {
    onDateChange(type, date);
  };

  // category functionalities in rental screen

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const handleSelectCategory = (categoryName) => {
    setSelectedCategory(categoryName);
    setIsCategoryDropdownOpen(false);
    setCurrentPage(1);
  };

  const clearCategoryFilter = (e) => {
    e.stopPropagation();
    setSelectedCategory("");
    setCategorySearchTerm("");
  };

  const [categorySearchTerm, setCategorySearchTerm] = useState("");

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );



  // warehouse functionalities in rental screen

  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const [warehouseSearchTerm, setWarehouseSearchTerm] = useState("");

  const handleSelectWarehouse = (warehouseName) => {
    setSelectedWarehouse(warehouseName);
    setIsWarehouseDropdownOpen(false);
    setCurrentPage(1);
  };

  const clearWarehouseFilter = (e) => {
    if (!isUserWarehouse) {
      e.stopPropagation();
      setSelectedWarehouse("");
      setWarehouseSearchTerm("");
    }
  };

  const filteredWarehouses = warehouses.filter((warehouse) =>
    warehouse.warehouse_name
      .toLowerCase()
      .includes(warehouseSearchTerm.toLowerCase())
  );

  // filter by item availability status

  const itemAvailStatusList = ["Available", "Reserved", "Rented"];

  const handleItemAvailStaus = (itemStatus) => {
    setSelectedItemAvailStatus(itemStatus);
    setIsItemStatusDropOpen(false);
    setCurrentPage(1);
  };

  const clearItemStatus = (e) => {
    e.stopPropagation();
    setSelectedItemAvailStatus("");
  };

  // RETURN SCREEN
  // filter by customer - booking entry

  const [customerSearchTermBooking, setCustomerSearchTermBooking] =
    useState("");

  const filterReturnCustomer = customers.filter(
    (customer) =>
      customer.customer_id
        .toLowerCase()
        .includes(customerSearchTermBooking.toLowerCase()) ||
      customer.customer_phone
        ?.toLowerCase()
        .includes(customerSearchTermBooking.toLowerCase())
  );

  const clearReturnCustomer = (e) => {
    e.stopPropagation();
    setFilterCustomer("");
    setCustomerSearchTermBooking("");
    applyFilters(
      "",
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      selectedSalesInvoiceStatus
    );
  };

  const handleFilterCustomer = (customerName) => {
    setFilterCustomer(customerName);
    setIsDropdownOpen(false);
    applyFilters(
      customerName,
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      selectedSalesInvoiceStatus
    );
  };

  // filter by warehouse - booking entry

  const [isFilterWarehouseDropdownOpen, setFilterWarehouseDropdownOpen] =
    useState(false);

  const [filterwarehouseSearchTerm, setfilterWarehouseSearchTerm] =
    useState("");

  const handleFilterWarehouse = (warehouseName) => {
    setFilterWarehouse(warehouseName);
    setFilterWarehouseDropdownOpen(false);
    applyFilters(
      filterCustomer,
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      warehouseName,
      selectedSalesInvoiceStatus
    );
  };

  const filteredAllWarehouses = allWarehouse.filter((warehouse) =>
    warehouse.warehouse_id
      .toLowerCase()
      .includes(filterwarehouseSearchTerm.toLowerCase())
  );

  const clearBookingWarehouseFilter = (e) => {
    e.stopPropagation();
    setFilterWarehouse("");
    setfilterWarehouseSearchTerm("");
    applyFilters(
      filterCustomer,
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      "",
      selectedSalesInvoiceStatus
    );
  };

  // Sales Invoice Status Filter
  const [isSalesInvoiceStatusDropdownOpen, setSalesInvoiceStatusDropdownOpen] =
    useState(false);
  const [salesInvoiceStatusSearchTerm, setSalesInvoiceStatusSearchTerm] =
    useState("");
  const [selectedSalesInvoiceStatus, setSelectedSalesInvoiceStatus] =
    useState("");

  const salesInvoiceStatusOptions = [
    "Paid",
    "Partly Paid",
    "Unpaid",
    "Overdue",
  ];

  const filteredSalesInvoiceStatuses = useMemo(() => {
    return salesInvoiceStatusOptions.filter((status) =>
      status.toLowerCase().includes(salesInvoiceStatusSearchTerm.toLowerCase())
    );
  }, [salesInvoiceStatusSearchTerm]);

  const handleFilterSalesInvoiceStatus = (status) => {
    setSelectedSalesInvoiceStatus(status);
    setSalesInvoiceStatusDropdownOpen(false);
    applyFilters(
      filterCustomer,
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      status
    );
  };

  const clearSalesInvoiceStatus = (e) => {
    e.stopPropagation();
    setSelectedSalesInvoiceStatus("");
    setSalesInvoiceStatusSearchTerm("");
    applyFilters(
      filterCustomer,
      filterDateStatus,
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      ""
    );
  };

  // filter by date status - booking entry

  const [dateStatusSearchTerm, setDateStatusSearchTerm] = useState("");

  const dateStatusOptions = [
    "Returned",
    "Partially Returned",
    "Due Today",
    "Due Tomorrow",
    "Active",
    "Upcoming",
    "Overdue",
  ];

  const handleFilterDateStatus = (dateStatus) => {
    setFilterDateStatus(dateStatus);
    setIsDateDropdownOpen(false); // assuming you track this separately
    applyFilters(
      filterCustomer,
      dateStatus,
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      selectedSalesInvoiceStatus
    );
  };

  const clearReturnStatus = (e) => {
    e.stopPropagation();
    setFilterDateStatus("");
    setDateStatusSearchTerm("");
    applyFilters(
      filterCustomer,
      "",
      extendpickupDate,
      extendreturnDate,
      filterWarehouse,
      selectedSalesInvoiceStatus
    );
  };

  const filteredDateStatus = useMemo(() => {
    return dateStatusOptions.filter((status) =>
      status.toLowerCase().includes(dateStatusSearchTerm.toLowerCase())
    );
  }, [dateStatusSearchTerm]);

  // filter by from date - booking entry
  const handlePickupDateChange = (date) => {
    setExtendPickupDate(date); // store the actual dayjs object

    if (extendreturnDate && date && extendreturnDate.isBefore(date)) {
      setExtendReturnDate(null);
    } else {
      applyFilters(
        filterCustomer,
        filterDateStatus,
        date,
        extendreturnDate,
        filterWarehouse,
        selectedSalesInvoiceStatus
      );
    }
  };

  const handleReturnDateChange = (date) => {
    if (extendpickupDate && date && date.isBefore(extendpickupDate)) {
      addToast("To Date cannot be earlier than From Date!", "error");
      return;
    }

    setExtendReturnDate(date);
    applyFilters(
      filterCustomer,
      filterDateStatus,
      extendpickupDate,
      date,
      filterWarehouse,
      selectedSalesInvoiceStatus
    );
  };

  // COMMON FUNCTIONS
  // main funct for filtering the booking entry

  const applyFilters = (
    customerName,
    dateStatus,
    fromDate,
    toDate,
    warehouseName,
    invoiceStatus
  ) => {
    let filtered = [...safeAllBookingData];

    if (customerName) {
      filtered = filtered.filter(
        (entry) => entry.customer_data === customerName
      );
    }

    if (dateStatus) {
      filtered = filtered.filter((entry) => entry.status === dateStatus);
    }

    if (fromDate && toDate) {
      filtered = filtered.filter((entry) => {
        const bookingDate = dayjs(entry.date);
        return bookingDate.isAfter(fromDate) && bookingDate.isBefore(toDate);
      });
    }

    if (warehouseName) {
      filtered = filtered.filter((entry) =>
        entry.rentalItems.some(
          (item) => item.warehouse && item.warehouse === warehouseName
        )
      );
    }

    if (invoiceStatus) {
      filtered = filtered.filter((entry) => {
        const invoices = entry.sales_invoices || [];
        if (!invoices.length) {
          return false;
        }

        const latestInvoice = invoices[invoices.length - 1];
        return latestInvoice.invoice_status === invoiceStatus;
      });
    }

    setCurrentPageBooking(1);
    setFinancialData(filtered);
  };

  // to close all the dropdown when click outside

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsCategoryDropdownOpen(false);
        setIsDateDropdownOpen(false);
      }
    };

    if (
      isDropdownOpen ||
      isCategoryDropdownOpen ||
      isDateDropdownOpen
    ) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    isDropdownOpen,
    isCategoryDropdownOpen,
    isDateDropdownOpen,
  ]);

  const selectedCustomerData = customers.find(
    (customer) => customer.customer_id === selectedCustomer
  );
  const hasSelectedCustomerOverdue = selectedCustomerData?.bookings?.some(
    (booking) => booking.return_status === "Overdue"
  );

  const returnSummary = safeAllBookingData.reduce(
    (summary, booking) => {
      if (booking.status === "Overdue") summary.overdue += 1;
      if (
        booking.status === "Returned" ||
        booking.status === "Partially Returned"
      ) {
        summary.returns += 1;
      }
      if (booking.sales_invoices?.length) summary.invoices += 1;
      return summary;
    },
    { overdue: 0, returns: 0, invoices: 0 }
  );

  const getStatusChipClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "reserved":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
      case "rented":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";
      case "maintenance":
      case "unavailable":
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
      default:
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-white/45 p-3 backdrop-blur-xl">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div ref={dropdownRef} className="flex flex-col gap-5">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-primary p-5 text-white shadow-lg transition-all duration-300 hover:shadow-xl">
            <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-white/15 blur-3xl"></div>
            <div className="absolute bottom-0 left-8 h-16 w-32 rounded-t-full bg-white/10 blur-2xl"></div>
            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 backdrop-blur">
                <LuBike className="h-6 w-6" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                Rental Platform
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight">
                {companyName || "Bike Rentals"}
              </h2>
              <p className="mt-2 text-sm font-medium text-white/70">
                Manage bookings and returns
              </p>
            </div>
          </section>

          <div className="relative flex rounded-3xl border border-white/50 bg-white/80 p-1.5 shadow-lg backdrop-blur transition-all duration-300">
            <div
              className={`absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-2xl bg-primary shadow-md shadow-primary/30 transition-all duration-300 ${
                activeTab === "return" ? "translate-x-full" : "translate-x-0"
              }`}
            ></div>
            <button
              className={`relative z-10 flex-1 px-4 py-3 cursor-pointer rounded-2xl text-center font-black text-sm tracking-wide transition-all duration-300 ${
                activeTab === "rental"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => {
                setActiveTab("rental");
                onTabChange("rental");
                setFilterCustomer("");
                setFilterWarehouse("");
              }}
            >
              Rental
            </button>
            <button
              className={`relative z-10 flex-1 px-4 py-3 cursor-pointer rounded-2xl text-center font-black text-sm tracking-wide transition-all duration-300 ${
                activeTab === "return"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => {
                setActiveTab("return");
                onTabChange("return");
                // setSelectedCustomer("")
              }}
            >
              Return
            </button>
          </div>

          {activeTab === "rental" && (
            <div className="flex flex-col gap-5">
              <section className="relative z-[60] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <LuUser className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Customer
                      </p>
                      <h3 className="text-sm font-black text-slate-950">
                        Select Rider
                      </h3>
                    </div>
                  </div>
                  {hasSelectedCustomerOverdue && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                      Overdue
                    </span>
                  )}
                </div>
                <div className="relative z-[60]">
                  <div
                    className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm cursor-pointer flex items-center justify-between hover:border-primary/30 hover:shadow-md transition-all duration-300"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className={selectedCustomer ? "font-bold text-slate-900" : ""}>
                      {selectedCustomer || "Search or select a customer"}
                    </span>
                    {selectedCustomer && !forceAvailable && (
                      <span
                        className="ml-2 p-1 rounded-full bg-slate-900 hover:bg-primary transition duration-200"
                        onClick={clearCustomer}
                      >
                        <MdOutlineClear className="text-white w-4 h-4 cursor-pointer" />
                      </span>
                    )}
                  </div>
                  {isDropdownOpen && !forceAvailable && (
                    <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl border border-white/70 z-20 overflow-hidden">
                      <div className="relative">
                        <LuSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                          className="w-full border-b border-slate-100 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:bg-white transition-colors"
                        placeholder="Search for a customer..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      />
                      </div>
                      <ul className="max-h-40 overflow-y-auto">
                        {filterRentalCustomer.map((customer) => {
                          const hasOverdue = customer.bookings?.some(
                            (b) => b.return_status === "Overdue"
                          );
                          return (
                            <li
                              key={customer.customer_id}
                              className="px-4 py-3 cursor-pointer text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                              onClick={() =>
                                handleSelectCustomer(customer.customer_id)
                              }
                            >
                              {customer.customer_id} (
                              {customer.customer_phone || "Not available"})
                              {hasOverdue && (
                                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 ring-1 ring-amber-200">
                                  Overdue
                                </span>
                              )}
                            </li>
                          );
                        })}
                        {filterRentalCustomer.length === 0 && (
                          <li className="px-3 py-2 text-gray-500">
                            No customers found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="mt-3 rounded-2xl bg-primary/10 px-3 py-2 text-xs font-black text-primary">
                    Selected: {selectedCustomer}
                  </div>
                )}
                {!forceAvailable && (
                  <button
                    className="mt-3 px-4 py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-full transition-all duration-300 w-full font-black text-sm"
                    onClick={addCustomer}
                  >
                    + Add New Customer
                  </button>
                )}
              </section>
              {!forceAvailable && (
                <button
                  onClick={onClearFilter}
                  className="px-4 w-full py-2.5 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100 font-black transition-all duration-300 text-sm"
                >
                  Clear Filters
                </button>
              )}

              <section className="relative z-[50] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <LuCalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Booking Schedule
                    </p>
                    <h3 className="text-sm font-black text-slate-950">
                      Pickup and return window
                    </h3>
                  </div>
                </div>
              <div className="mb-4 flex flex-col gap-1">
                <label
                  htmlFor="pickup"
                  className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1"
                >
                  Pickup Date
                </label>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden focus-within:border-primary/50 transition-all">
                  <DateTimePicker
                    value={pickupDate ? dayjs(pickupDate) : null}
                    onChange={(date) => handleDateChange("pickup", date)}
                    readOnly={isDateFieldDisabled}
                    format="DD/MM/YYYY hh:mm A"
                    placeholderText="DD/MM/YYYY hh:mm A"
                    disablePast
                    className="w-full"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{
                      textField: {
                        className: "border-none bg-transparent",
                        InputProps: {
                          style: {
                            height: "44px",
                            fontSize: "14px",
                            color: "#334155",
                            borderRadius: "9999px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                          },
                          disableUnderline: true,
                        },
                        sx: {
                          fieldset: { border: 'none' },
                        }
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-1">
                <label
                  htmlFor="return"
                  className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1"
                >
                  Return Date
                </label>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden focus-within:border-primary/50 transition-all">
                  <DateTimePicker
                    value={returnDate ? dayjs(returnDate) : null}
                    onChange={(date) => handleDateChange("return", date)}
                    readOnly={isDateFieldDisabled}
                    format="DD/MM/YYYY hh:mm A"
                    placeholderText="DD/MM/YYYY hh:mm A"
                    disablePast
                    minDate={
                      pickupDate ? dayjs(pickupDate).add(1, "minute") : null
                    }
                    className="w-full"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{
                      textField: {
                        className: "border-none bg-transparent",
                        InputProps: {
                          style: {
                            height: "44px",
                            fontSize: "14px",
                            color: "#334155",
                            borderRadius: "9999px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                          },
                          disableUnderline: true,
                        },
                        sx: {
                          fieldset: { border: 'none' },
                        }
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-1">
                <label
                  htmlFor="return"
                  className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1"
                >
                  Actual Return
                </label>
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden focus-within:border-primary/50 transition-all">
                  <DateTimePicker
                    value={actualReturnDate ? dayjs(actualReturnDate) : null}
                    onChange={(date) => handleDateChange("actual_return", date)}
                    readOnly={isDateFieldDisabled}
                    format="DD/MM/YYYY hh:mm A"
                    placeholderText="DD/MM/YYYY hh:mm A"
                    disablePast
                    minDate={returnDate ? dayjs(returnDate) : null}
                    className="w-full"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{
                      textField: {
                        className: "border-none bg-transparent",
                        InputProps: {
                          style: {
                            height: "44px",
                            fontSize: "14px",
                            color: "#334155",
                            borderRadius: "9999px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                          },
                          disableUnderline: true,
                        },
                        sx: {
                          fieldset: { border: 'none' },
                        }
                      },
                    }}
                  />
                </div>
              </div>
              </section>

                {!forceAvailable && (
                <section className="relative z-[40] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <LuFilter className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Category
                      </p>
                      <h3 className="text-sm font-black text-slate-950">
                        {selectedCategory || "All categories"}
                      </h3>
                    </div>
                  </div>
                  <div className="relative z-[50]">
                    <div
                      className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm cursor-pointer flex items-center justify-between hover:border-primary/30 hover:shadow-md transition-all duration-300"
                      onClick={() =>
                        setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                      }
                    >
                      <span>{selectedCategory || "Select a Category"}</span>
                      {selectedCategory && (
                        <span
                          className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                          onClick={clearCategoryFilter}
                        >
                          <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                        </span>
                      )}
                    </div>
                    {isCategoryDropdownOpen && (
                      <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                        <input
                          type="text"
                          className="w-full px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors"
                          placeholder="Search for a category..."
                          value={categorySearchTerm}
                          onChange={(e) =>
                            setCategorySearchTerm(e.target.value)
                          }
                        />
                        <ul className="max-h-40 overflow-y-auto">
                          {filteredCategories.map((category) => (
                            <li
                              key={category.id}
                              className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-slate-700"
                              onClick={() =>
                                handleSelectCategory(category.name)
                              }
                            >
                              {category.name}
                            </li>
                          ))}
                          {filteredCategories.length === 0 && (
                            <li className="px-3 py-2 text-gray-500">
                              No categories found
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}





              {!forceAvailable &&
                pickupDate &&
                returnDate &&
                actualReturnDate && (
                  <section className="relative z-[30] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <LuCheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Availability Status
                        </p>
                        <h3 className="text-sm font-black text-slate-950">
                          {selectedItemAvailStatus || "Any status"}
                        </h3>
                      </div>
                    </div>
                    <div className="relative z-[30]">
                      <div
                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm cursor-pointer flex items-center justify-between hover:border-primary/30 hover:shadow-md transition-all duration-300"
                        onClick={() =>
                          setIsItemStatusDropOpen(!isItemStatusDropOpen)
                        }
                      >
                        <span>
                          {selectedItemAvailStatus || "Filter by Status"}
                        </span>
                        {selectedItemAvailStatus && (
                          <span
                            className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                            onClick={clearItemStatus}
                          >
                            <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                          </span>
                        )}
                      </div>
                      {isItemStatusDropOpen && (
                        <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                          <ul className="max-h-40 overflow-y-auto py-2">
                            {itemAvailStatusList.map((status, index) => (
                              <li
                                key={index}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-slate-700"
                                onClick={() => handleItemAvailStaus(status)}
                              >
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getStatusChipClass(
                                    status
                                  )}`}
                                >
                                  {status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </section>
                )}
            </div>
          )}

          {activeTab === "return" && (
            <div className="flex flex-col gap-5">
              <section className="relative z-[20] rounded-3xl border border-white/50 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                    <LuRotateCcw className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
                      Rental Returns
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Track overdue bikes, returns and invoices.
                    </h3>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/10">
                    <p className="text-lg font-black">{returnSummary.overdue}</p>
                    <p className="text-[10px] font-bold uppercase text-white/50">
                      Overdue
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/10">
                    <p className="text-lg font-black">{returnSummary.returns}</p>
                    <p className="text-[10px] font-bold uppercase text-white/50">
                      Returns
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/10">
                    <p className="text-lg font-black">{returnSummary.invoices}</p>
                    <p className="text-[10px] font-bold uppercase text-white/50">
                      Invoices
                    </p>
                  </div>
                </div>
              </section>

              <section className="relative z-[60] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <LuUser className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Return Filters
                    </p>
                    <h3 className="text-sm font-black text-slate-950">
                      Customer, location and status
                    </h3>
                  </div>
                </div>
                <div className="relative z-[60]">
                  <div
                    className={`w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm flex items-center justify-between transition-all duration-300 ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary/30 hover:shadow-md"
                    }`}
                    onClick={() =>
                      !isLoading && setIsDropdownOpen(!isDropdownOpen)
                    }
                  >
                    <span>{filterCustomer || "Filter by Customer"}</span>
                    {filterCustomer ? (
                      <span
                        className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                        onClick={clearReturnCustomer}
                      >
                        <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                      </span>
                    ) : (
                      <PiCaretUpDownLight className="text-slate-500" />
                    )}
                  </div>
                  {isDropdownOpen && !forceAvailable && (
                    <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors"
                        placeholder="Search for a customer..."
                        value={customerSearchTermBooking}
                        onChange={(e) =>
                          setCustomerSearchTermBooking(e.target.value)
                        }
                      />
                      <ul className="max-h-40 overflow-y-auto">
                        {filterReturnCustomer.map((customer) => (
                          <li
                            key={customer.customer_id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-slate-700"
                            onClick={() =>
                              handleFilterCustomer(customer.customer_id)
                            }
                          >
                            {customer.customer_id} (
                            {customer.customer_phone || "Not available"})
                          </li>
                        ))}
                        {filterReturnCustomer.length === 0 && (
                          <li className="px-3 py-2 text-gray-500">
                            No customers found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="relative mt-1 z-[50]">
                  <div
                    className={`w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm flex items-center justify-between transition-all duration-300 ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary/30 hover:shadow-md"
                    }`}
                    onClick={() =>
                      !isLoading &&
                      setFilterWarehouseDropdownOpen(
                        !isFilterWarehouseDropdownOpen
                      )
                    }
                  >
                    <span>{filterWarehouse || "Filter by Warehouse"}</span>
                    {filterWarehouse ? (
                      <span
                        className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                        onClick={clearBookingWarehouseFilter}
                      >
                        <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                      </span>
                    ) : (
                      <PiCaretUpDownLight className="text-slate-500" />
                    )}
                  </div>
                  {isFilterWarehouseDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors"
                        placeholder="Search for a warehouse..."
                        value={filterwarehouseSearchTerm}
                        onChange={(e) =>
                          setfilterWarehouseSearchTerm(e.target.value)
                        }
                      />
                      <ul className="max-h-40 overflow-y-auto">
                        {filteredAllWarehouses.map((warehouse) => (
                          <li
                            key={warehouse.warehouse_id}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-slate-700"
                            onClick={() =>
                              handleFilterWarehouse(warehouse.warehouse_id)
                            }
                          >
                            {warehouse.warehouse_id}
                          </li>
                        ))}
                        {filteredAllWarehouses.length === 0 && (
                          <li className="px-3 py-2 text-gray-500">
                            No Warehouse found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="relative mt-2 z-[40]">
                  <div
                    className={`w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm flex items-center justify-between transition-all duration-300 ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary/30 hover:shadow-md"
                    }`}
                    onClick={() =>
                      !isLoading && setIsDateDropdownOpen(!isDateDropdownOpen)
                    }
                  >
                    <span>{filterDateStatus || "Filter by Status"}</span>
                    {filterDateStatus ? (
                      <span
                        className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                        onClick={clearReturnStatus}
                      >
                        <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                      </span>
                    ) : (
                      <PiCaretUpDownLight className="text-slate-500" />
                    )}
                  </div>

                  {isDateDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors"
                        placeholder="Search for status..."
                        value={dateStatusSearchTerm}
                        onChange={(e) =>
                          setDateStatusSearchTerm(e.target.value)
                        }
                      />
                      <ul className="max-h-40 overflow-y-auto">
                        {filteredDateStatus.map((status, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-slate-700"
                            onClick={() => handleFilterDateStatus(status)}
                          >
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                                status === "Overdue"
                                  ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                  : status === "Due Today" ||
                                    status === "Due Tomorrow"
                                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>



                <div className="relative mt-2 z-[30]">
                  <div
                    className={`w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-700 text-sm flex items-center justify-between transition-all duration-300 ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:border-primary/30 hover:shadow-md"
                    }`}
                    onClick={() =>
                      !isLoading &&
                      setSalesInvoiceStatusDropdownOpen(
                        !isSalesInvoiceStatusDropdownOpen
                      )
                    }
                  >
                    <span>{selectedSalesInvoiceStatus || "Filter by Invoice Status"}</span>
                    {selectedSalesInvoiceStatus ? (
                      <span
                        className="ml-2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition duration-200"
                        onClick={clearSalesInvoiceStatus}
                      >
                        <MdOutlineClear className="text-slate-500 w-4 h-4 cursor-pointer" />
                      </span>
                    ) : (
                      <PiCaretUpDownLight className="text-slate-500" />
                    )}
                  </div>
                  {isSalesInvoiceStatusDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-soft border border-white/60 z-20 overflow-hidden">
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-sm text-slate-800 focus:outline-none focus:bg-white transition-colors"
                        placeholder="Search invoice status..."
                        value={salesInvoiceStatusSearchTerm}
                        onChange={(e) =>
                          setSalesInvoiceStatusSearchTerm(e.target.value)
                        }
                      />
                      <ul className="max-h-40 overflow-y-auto">
                        {filteredSalesInvoiceStatuses.map((status, index) => (
                          <li
                            key={index}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-slate-700"
                            onClick={() => handleFilterSalesInvoiceStatus(status)}
                          >
                            {status}
                          </li>
                        ))}
                        {filteredSalesInvoiceStatuses.length === 0 && (
                          <li className="px-3 py-2 text-gray-500">
                            No invoice status found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                
                
              </section>
              <button
                onClick={onClearFilter}
                className="px-4 w-full py-2.5 bg-secondary/20 text-primary/90 rounded-full hover:bg-primary hover:text-white font-black shadow-sm transition-all duration-300 text-sm"
              >
                Clear Filters
              </button>

              <section className="relative z-[50] rounded-3xl border border-white/50 bg-white/85 p-4 shadow-lg backdrop-blur transition-all duration-300 hover:shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <LuCalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Return Window
                    </p>
                    <h3 className="text-sm font-black text-slate-950">
                      Filter booking dates
                    </h3>
                  </div>
                </div>
              <div className="mb-4 flex flex-col gap-1">
                <label
                  htmlFor="pickup"
                  className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1"
                >
                  From Date
                </label>
                <div className="bg-white/60 rounded-full border border-white/60 shadow-inner-soft overflow-hidden focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <DateTimePicker
                    value={extendpickupDate || null}
                    onChange={handlePickupDateChange}
                    format="DD/MM/YYYY hh:mm A"
                    placeholderText="DD/MM/YYYY hh:mm A"
                    disabled={isLoading}
                    className="w-full"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{
                      textField: {
                        className: "border-none bg-transparent",
                        InputProps: {
                          style: {
                            height: "44px",
                            fontSize: "14px",
                            color: "#334155",
                            borderRadius: "9999px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                          },
                          disableUnderline: true,
                        },
                        sx: {
                          fieldset: { border: 'none' },
                        }
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-1">
                <label
                  htmlFor="return"
                  className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-1"
                >
                  To Date
                </label>
                <div className="bg-white/60 rounded-full border border-white/60 shadow-inner-soft overflow-hidden focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <DateTimePicker
                    value={extendreturnDate || null}
                    onChange={handleReturnDateChange}
                    format="DD/MM/YYYY hh:mm A"
                    placeholderText="DD/MM/YYYY hh:mm A"
                    disabled={isLoading}
                    className="w-full"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{
                      textField: {
                        className: "border-none bg-transparent",
                        InputProps: {
                          style: {
                            height: "44px",
                            fontSize: "14px",
                            color: "#334155",
                            borderRadius: "9999px",
                            paddingLeft: "8px",
                            paddingRight: "8px",
                          },
                          disableUnderline: true,
                        },
                        sx: {
                          fieldset: { border: 'none' },
                        }
                      },
                    }}
                  />
                </div>
              </div>
              </section>
            </div>
          )}
        </div>
      </LocalizationProvider>
    </div>
  );
};

export default SideNav;
