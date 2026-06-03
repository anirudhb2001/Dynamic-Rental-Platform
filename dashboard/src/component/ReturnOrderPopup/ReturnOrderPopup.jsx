import React, { useState, useEffect } from "react";
import "react-datepicker/dist/react-datepicker.css";
import {
  VITE_PUBLIC_SALE_INVOICE_LINK,
  VITE_PUBLIC_BOOKING_ENTRY_LINK,
  VITE_PUBLIC_PAYMENT_ENTRY_LINK,
} from "../../../../constants";
import InventoryItem from "./InventoryItem";
import AvailabilityStatusModal from "../ConfirmationModal/AvailabilityStatusModal";
import {
  getWarehouseList,
  getServiceItem,
  rentalReturnBooking,
  getProductBundleList,
  createPaymentEntry,
} from "../../services/api";
import { IoMdClose } from "react-icons/io";
import ExtendBookingItem from "./ExtendBookingItem";

function ReturnOrderPopup({
  show,
  onClose,
  rentalItems,
  id,
  date,
  addToast,
  onRedirectToRentalAssetList,
  toDate,
  setToDate,
  closeReturnModal,
  isBookingReturned,
  formatDate,
  fetchData,
  initialTab = "return",
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isExtendModalOpen, setExtendModalOpen] = useState(false);
  const [serviceItem, setServiceItem] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [acceptedItems, setAcceptedItems] = useState({});
  const [selectedWarehouses, setSelectedWarehouses] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [itemNames, setItemNames] = useState([]);
  const [bundleIds, setBundleIds] = useState(new Set());

  const handleOpenExtendModal = () => setExtendModalOpen(true);
  const handleCloseExtendModal = () => setExtendModalOpen(false);

  useEffect(() => {
    const fetchBundleList = async () => {
      try {
        const data = await getProductBundleList();
        const ids = new Set(data.message.map((bundle) => bundle.bundle_id));
        setBundleIds(ids);
      } catch (error) {
        console.error("Error fetching product bundle list:", error);
      }
    };

    fetchBundleList();
  }, []);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await getWarehouseList();
        const formattedDate = response.map((warehouse_data) => ({
          id: warehouse_data.warehouse_id,
          warehouse_name: warehouse_data.warehouse,
        }));
        setWarehouses(formattedDate);
      } catch (error) {
        addToast(error.message || "Failed to fetch warehouses:", "error");
      }
    };

    const fetchServiceItem = async () => {
      try {
        const data = await getServiceItem();
        setServiceItem(data);
      } catch (error) {
        addToast(error.message || "Failed to fetch service item", "error");
      }
    };

    fetchWarehouses();
    fetchServiceItem();
  }, []);

  const handleRemarkChange = (itemName, remark) => {
    setRemarks((prevRemarks) => ({
      ...prevRemarks,
      [itemName]: remark,
    }));
  };

  const handleInputChange = (index, field, value) => {
    const updatedItems = [...selectedItems];
    updatedItems[index][field] = value;
    setSelectedItems(updatedItems);
  };

  const addNewRow = () => {
    setSelectedItems([...selectedItems, { item_code: "", rate: 0 }]);
  };

  const handleRowSelect = (index) => {
    let updatedSelectedRows = [...selectedRows];
    if (updatedSelectedRows.includes(index)) {
      updatedSelectedRows = updatedSelectedRows.filter((i) => i !== index);
    } else {
      updatedSelectedRows.push(index);
    }
    setSelectedRows(updatedSelectedRows);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === selectedItems.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectedItems.map((_, index) => index));
    }
  };

  const deleteSelectedRows = () => {
    const updatedItems = selectedItems.filter(
      (_, index) => !selectedRows.includes(index)
    );
    setSelectedItems(updatedItems);
    setSelectedRows([]);
  };

  const getCSRFToken = () => {
    return window.csrf_token;
  };

  const handleAccept = (index) => {
    setAcceptedItems((prev) => {
      const updatedItems = { ...prev };
      if (updatedItems[index]) {
        delete updatedItems[index];
        setSelectedWarehouses((prev) => {
          const updatedWarehouses = { ...prev };
          delete updatedWarehouses[index];
          return updatedWarehouses;
        });
      } else {
        updatedItems[index] = true;
        setSelectedWarehouses((prev) => ({
          ...prev,
          [index]: "Stores - RAC",
        }));
      }
      return updatedItems;
    });
  };

  const handleWarehouseChange = (index, value) => {
    setSelectedWarehouses((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  useEffect(() => {
    const names = rentalItems.map(item => item.item_name);
    setItemNames(names);
  }, [rentalItems]);

  useEffect(() => {
    if (show) {
      setActiveTab(initialTab);
    }
  }, [show, initialTab]);


  const handleReturnBooking = async () => {
    try {
      if (selectedItems.some((item) => !item.item_code || !item.rate)) {
        addToast(
          "Please fill out all fields in Additional charges before proceeding.",
          "error"
        );
        return;
      }

      if (selectedItems.some((item) => item.rate < 0)) {
        addToast(
          "Amount cannot be negative. Please enter a valid amount.",
          "error"
        );
        return;
      }

      if (acceptedItems === false) {
        addToast("Please choose any item before Returning", "error");
        return;
      }

      const bookingEntryId = id;
      const additionalCharges = selectedItems;
      const itemWarehouses = Object.entries(selectedWarehouses).map(
        ([index, warehouse]) => ({
          rental_item_id: rentalItems[index].item_name,
          warehouse: warehouse,
          quantity: rentalItems[index].stock_quantity,
        })
      );

      const itemRemarks = Object.entries(acceptedItems || {}).map(
        ([index]) => ({
          item_name: rentalItems?.[index]?.item_name,
          remark: remarks?.[rentalItems?.[index]?.item_name] || "",
        })
      );

      const blackList =
        document.querySelector("#blacklist-checkbox")?.checked || false;
      const yellowList =
        document.querySelector("#yellowlist-checkbox")?.checked || false;
      const addRemarks =
        document.querySelector("#remarks-textarea")?.value || "";
      const csrfToken = getCSRFToken();

      const response = await rentalReturnBooking(
        bookingEntryId,
        additionalCharges,
        itemWarehouses,
        blackList,
        yellowList,
        addRemarks,
        itemRemarks,
        csrfToken
      );

      if (response.error) {
        addToast(response.error, "error");
      }
      else {
        bookingEntryRedirect();
        closeReturnModal();
        addToast("Return Booking Successful!", "success");
      }
    } catch (error) {
      console.error("Return Booking Failed:", error);
    }
  };

  const handleCreatePaymentEntry = async () => {
    try {
      const bookingEntryId = id;
      const csrfToken = getCSRFToken();

      const response = await createPaymentEntry(bookingEntryId, csrfToken);
      closeReturnModal();
      addToast("Payment Entry created successfully", "success");

      const paymentEntryData = response.message;
      console.log("paymentEntryData", paymentEntryData);
      const redirectUrl = `${VITE_PUBLIC_PAYMENT_ENTRY_LINK}/${paymentEntryData}`;
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Return Booking Failed:", error);
      addToast("All invoices are already paid for this booking entry", "error");
    }
  };

  const bookingEntryRedirect = () => {
    const redirectUrl = `${VITE_PUBLIC_BOOKING_ENTRY_LINK}/${id}`;
    window.location.href = redirectUrl;
  };

  const saleInvoiceRedirect = () => {
    const redirectUrl = `${VITE_PUBLIC_SALE_INVOICE_LINK}${id}`;
    window.open(redirectUrl, "_blank");
    closeReturnModal();
    addToast("Redirect to Sale Invoice");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 flex justify-center items-center px-4">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-4xl max-h-full overflow-auto relative">
        <button
          className="absolute top-4 right-4 bg-transparent border-none text-md cursor-pointer p-1 rounded-full flex items-center justify-center hover:bg-gray-200"
          onClick={onClose}
        >
          <IoMdClose />
        </button>
        <div className="border border-[#E53E3E] p-6 rounded-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <h1 className="text-lg sm:text-xl font-bold mb-4 sm:mb-0">
              Process {activeTab === "return" ? "Return" : "Extend"} for Order{" "}
              <span className="text-gray-600">{id}</span>
            </h1>
            <div className="flex space-x-2">
              <button
                className={`${
                  activeTab === "return"
                    ? "bg-[#E53E3E] text-black border border-[#E53E3E]"
                    : "bg-white text-gray-700"
                } px-2 py-1 rounded text-sm border hover:bg-[#E53E3E] border-gray-800 hover:border-[#E53E3E]`}
                onClick={() => setActiveTab("return")}
              >
                Return Booking
              </button>
              {!isBookingReturned && (
                <button
                  className={`${
                    activeTab === "extend"
                      ? "bg-[#E53E3E] text-black border border-[#E53E3E]"
                      : "bg-white text-gray-700"
                  } px-2 py-1 rounded text-sm border hover:bg-[#E53E3E] border-gray-800 hover:border-[#E53E3E]`}
                  onClick={() => setActiveTab("extend")}
                >
                  Extend Booking
                </button>
              )}
            </div>
          </div>

          {activeTab === "return" && (
            <>
              <div className="bg-[#E53E3E] text-black px-4 py-2 rounded-t-md mb-4 mt-5 w-full">
                Items
              </div>
              <div className="flex flex-col sm:space-y-2">
                {rentalItems.length > 0 ? (
                  rentalItems.map((item, index) => {
                    const isBundleItem = bundleIds.has(item.item_name);

                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:space-x-4 items-center"
                      >
                        <div className="flex-1">
                          <InventoryItem
                            name={item.item_name}
                            remark={remarks[item.item_name] || ""}
                            onRemarkChange={handleRemarkChange}
                            isBundleItem={isBundleItem}
                            isReturned={item.isReturned}
                          />
                        </div>

                        {!isBundleItem && (
                          <div className="flex space-x-4 mt-2 sm:mt-0">
                            {item.isReturned ? (
                              <span className="text-green-700 font-bold pr-10">
                                Item Returned
                              </span>
                            ) : (
                              <>
                                <button
                                  className={`px-3 py-1 text-sm rounded-lg border ${
                                    acceptedItems[index]
                                      ? "bg-green-500 text-white"
                                      : "border-black text-gray-700"
                                  }`}
                                  onClick={() => handleAccept(index)}
                                >
                                  {acceptedItems[index] ? "Accepted" : "Accept"}
                                </button>

                                <select
                                  id={`warehouse-${index}`}
                                  className={`text-gray-700 text-sm px-2 py-1 rounded-lg border ${
                                    acceptedItems[index]
                                      ? "bg-yellow-300"
                                      : "bg-white border-black"
                                  } focus:outline-none cursor-pointer`}
                                  value={selectedWarehouses[index] || ""}
                                  onChange={(e) =>
                                    handleWarehouseChange(index, e.target.value)
                                  }
                                  disabled={!acceptedItems[index]}
                                >
                                  <option value="" disabled>
                                    Select a Warehouse
                                  </option>
                                  {warehouses.map((warehouse, wIndex) => (
                                    <option
                                      key={wIndex}
                                      value={warehouse.warehouse_name}
                                    >
                                      {warehouse.warehouse_name}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 font-bold text-lg mt-5">
                    No Items found.
                  </p>
                )}
              </div>
              {!isBookingReturned && (
                <div>
                  <div className="flex flex-col space-y-4 mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox accent-[#E53E3E]"
                        id="blacklist-checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            document.querySelector(
                              "#yellowlist-checkbox"
                            ).checked = false;
                          }
                        }}
                      />
                      <span className="ml-2 text-gray-700 text-sm">
                        Black List the Customer
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox accent-[#E53E3E]"
                        id="yellowlist-checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            document.querySelector(
                              "#blacklist-checkbox"
                            ).checked = false;
                          }
                        }}
                      />
                      <span className="ml-2 text-gray-700 text-sm">
                        Yellow List the Customer
                      </span>
                    </label>
                  </div>

                  <textarea
                    placeholder="Add remarks (Optional)"
                    id="remarks-textarea"
                    className="w-full border rounded-lg p-2 mt-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-[#4B5150] text-white"
                  ></textarea>

                  <div className="flex justify-between mt-4">
                    <button
                      className="text-gray-500 px-1 py-1 text-sm"
                      // onClick={() => setShowAdditionalCharge(!showAdditionalCharge)}
                    >
                      Additional Charges Items
                    </button>
                  </div>
                </div>
              )}
              {!isBookingReturned && (
                <div className="mt-2">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-slate-50 text-gray-700 text-sm font-semibold border-b border-gray-200">
                        <th className="border border-gray-300 px-3 py-1">
                          <input
                            type="checkbox"
                            checked={
                              selectedRows.length === selectedItems.length &&
                              selectedItems.length > 0
                            }
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="border border-gray-300 px-3 py-1">
                          S.No
                        </th>
                        <th className="border border-gray-300 px-3 py-1">
                          Items
                        </th>
                        <th className="border border-gray-300 px-3 py-1">
                          Amount (INR)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center text-gray-500 py-2"
                          >
                            No data available
                          </td>
                        </tr>
                      ) : (
                        selectedItems.map((item, index) => (
                          <tr
                            key={index}
                            className="bg-gray-100 text-black text-sm"
                          >
                            <td className="border border-gray-300 px-3 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(index)}
                                onChange={() => handleRowSelect(index)}
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-1 text-center">
                              {index + 1}
                            </td>
                            <td className="border border-gray-300 px-3 py-1">
                              <select
                                className="bg-transparent border p-1 text-black"
                                value={item.item_code}
                                onChange={(e) =>
                                  handleInputChange(
                                    index,
                                    "item_code",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="" disabled>
                                  Select Item
                                </option>
                                {serviceItem.map((data, i) => (
                                  <option
                                    key={i}
                                    value={data.item_code}
                                    className="text-black"
                                  >
                                    {data.item_code}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border border-gray-300 px-3 py-1">
                              <input
                                type="number"
                                className="w-full bg-transparent border p-1 text-black"
                                value={item.rate}
                                onChange={(e) =>
                                  handleInputChange(
                                    index,
                                    "rate",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <button
                    onClick={addNewRow}
                    className="mt-1 bg-primary px-3 py-1.5 w-auto text-sm text-white font-medium rounded-lg shadow-sm hover:bg-primary-hover transition-colors"
                  >
                    Add Items
                  </button>
                  {selectedRows.length > 0 && (
                    <button
                      onClick={deleteSelectedRows}
                      className="bg-primary px-3 py-1.5 w-auto text-sm text-white font-medium rounded-lg shadow-sm hover:bg-primary-hover ml-2 transition-colors"
                    >
                      Delete Items
                    </button>
                  )}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  className="text-black px-4 py-2 rounded-lg border bg-gray-300 border-gray-200 text-sm font-bold cursor-pointer"
                  onClick={bookingEntryRedirect}
                >
                  Document Return
                </button>
                <button
                  className="ml-2 text-black px-4 py-2 rounded-lg border bg-gray-300 border-gray-200 text-sm font-bold cursor-pointer"
                  onClick={handleCreatePaymentEntry}
                >
                  Settle Payment
                </button>
                <button
                  className="ml-2 text-black px-4 py-2 rounded-lg border bg-gray-300 border-gray-200 text-sm font-bold cursor-pointer"
                  onClick={saleInvoiceRedirect}
                >
                  View Sales Invoice
                </button>
                {!isBookingReturned && (
                  <button
                    className="ml-2 text-white px-4 py-2 rounded-lg bg-primary text-sm font-bold cursor-pointer shadow-sm hover:bg-primary-hover transition-colors"
                    onClick={handleReturnBooking}
                  >
                    Return Booking
                  </button>
                )}
              </div>
            </>
          )}

          {activeTab === "extend" && (
            <>
              <div className="bg-slate-50 border border-gray-200 text-gray-800 font-semibold px-4 py-3 rounded-t-lg mb-4 mt-5 w-full">
                Items
              </div>

              <div className="flex flex-col sm:flex-row sm:space-x-4">
                <div className="flex-1">
                  {rentalItems.map((item, index) => (
                    <ExtendBookingItem key={index} name={item.item_name} />
                  ))}
                </div>

                {/* <div className="flex space-x-4 mt-4 sm:mt-0">
                  <div className="flex flex-col space-y-2">
                    <button className="text-gray-700 px-3 py-1 text-sm rounded-lg border border-black text-left">
                      Accept
                    </button>
                    <button className="text-gray-700 px-3 py-1 text-sm rounded-lg border border-black text-left">
                      Accept
                    </button>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <button className="bg-white hover:bg-gray-50 text-gray-800 px-4 py-1.5 text-sm rounded-lg border border-gray-300 transition-colors">
                      Service
                    </button>
                    <button className="bg-white hover:bg-gray-50 text-gray-500 px-4 py-1.5 text-sm rounded-lg border border-gray-300 transition-colors">
                      Warehouse
                    </button>
                  </div>
                </div> */}
              </div>

              {/* <div className="relative w-full sm:w-64 mt-10">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="w-full pr-20 px-2 py-2 text-gray-300 bg-gray-800 rounded-lg border border-gray-600 placeholder-gray-400"
                  placeholderText="day/month/year"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <FaCalendarMinus className="text-red-600" />
                </div>
              </div> */}

              <div className="flex justify-end mt-4">
                <button
                  className="text-white px-4 py-2.5 rounded-lg bg-primary text-sm font-bold shadow-sm hover:bg-primary-hover transition-colors"
                  onClick={handleOpenExtendModal}
                >
                  Extend Booking
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <AvailabilityStatusModal
        isOpen={isExtendModalOpen}
        onClose={handleCloseExtendModal}
        bookingId={id}
        actualToDate={date}
        addToast={addToast}
        onRedirectToRentalAssetList={onRedirectToRentalAssetList}
        toDate={toDate}
        setToDate={setToDate}
        formatDate={formatDate}
        itemNames={itemNames}
        fetchData={fetchData}
      />
    </div>
  );
}

export default ReturnOrderPopup;
