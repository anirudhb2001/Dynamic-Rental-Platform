import React, { useState } from "react";
import { cancelBookingEntries } from "../../services/api";

const CancelBookingModal = ({
  isOpen,
  onClose,
  title,
  loadingReservedData,
  reservedData,
  addToast,
  fetchData,
  onRedirectToRentalAssetList,
  bookingModal
}) => {
  const [selectedRows, setSelectedRows] = useState([]);

  const getCSRFToken = () => {
    return window.csrf_token;
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedRows(reservedData.map((event) => event.booking_entry));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (event, bookingEntry) => {
    if (event.target.checked) {
      setSelectedRows((prev) => [...prev, bookingEntry]);
    } else {
      setSelectedRows((prev) => prev.filter((entry) => entry !== bookingEntry));
    }
  };

  const handleCancelBooking = async () => {
    try {
      const csrfToken = getCSRFToken();
      const message = await cancelBookingEntries(selectedRows, csrfToken);

      const isBookingWithPayment = selectedRows.some((bookingEntry) =>
        reservedData.find((entry) => entry.booking_entry === bookingEntry)?.payment_entry
      );
      
      const alertMessage = isBookingWithPayment
        ? "Successfully cancelled booking entry and unlinked the payment entry"
        : "Successfully cancelled booking entry";

        addToast(alertMessage, "success");
        
        // onRedirectToRentalAssetList();
        await fetchData();
    } catch (error) {
      addToast(error.message || "Error canceling booking entries.", "error");
    } finally {
      onClose();
    }
  };

  function formatDate(currentDate) {
    const date = new Date(currentDate);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    const amOrPm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} ${amOrPm}`;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white w-11/12 max-w-3xl rounded-lg shadow-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✖
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loadingReservedData ? (
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : reservedData.length > 0 ? (
            <table className="min-w-full border-collapse border border-gray-200">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      className="form-checkbox accent-rose-600"
                      onChange={handleSelectAll}
                      checked={
                        selectedRows.length === reservedData.length &&
                        reservedData.length > 0
                      }
                    />
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Booking Entry
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Customer
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Mobile No.
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    From Date
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    To Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...new Map(reservedData.map(entry => [entry.booking_entry, entry])).values()].map((entry) => {
                  // Format the date fields
                  const formattedRentalFromDate = formatDate(
                    entry.rental_from_date
                  );
                  const formattedActualToDate = formatDate(
                    entry.actual_to_date
                  );

                  return (
                    <tr key={entry.booking_entry} className="hover:bg-gray-100">
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          className="form-checkbox accent-rose-600"
                          checked={selectedRows.includes(entry.booking_entry)}
                          onChange={(e) =>
                            handleRowSelect(e, entry.booking_entry)
                          }
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {entry.booking_entry}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {entry.customer}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {entry.custom_mobile_number || "Not available"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formattedRentalFromDate}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formattedActualToDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600 text-center">
              No reserved entries found.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 mr-2"
          >
            Close
          </button>
          {/* <button
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 mr-2"
            disabled={selectedRows.length === 0}
            onClick={() =>
              console.log("Selected Rows for See Details:", selectedRows)
            }
          >
            See Details
          </button> */}
          <button
            className="bg-rose-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-rose-700 transition-colors"
            disabled={selectedRows.length === 0}
            onClick={handleCancelBooking}
          >
            Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
