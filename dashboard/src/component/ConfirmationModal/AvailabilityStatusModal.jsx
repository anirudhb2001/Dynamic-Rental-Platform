import React, { useState, useEffect } from "react";
import { extendBookingAvailability } from "../../services/api";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { renderTimeViewClock } from "@mui/x-date-pickers/timeViewRenderers";
import dayjs from "dayjs";
import ConfirmCheckoutModal from "./ConfirmCheckoutModal";
import CancelBookingModal from "./CancelBookingModal.jsx";
import { getReservedBookingEntryData } from "../../services/api.jsx";

const AvailabilityStatusModal = ({
  isOpen,
  onClose,
  bookingId,
  actualToDate,
  addToast,
  onRedirectToRentalAssetList,
  toDate,
  setToDate,
  formatDate,
  itemNames,
  fetchData,
}) => {
  const [loadingBookingData, setLoadingBookingData] = useState(false);
  const [bookingItemsModal, setBookingItemsModal] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingEntryData, setBookingEntryData] = useState([]);
  const [isGST, setIsGST] = useState(true); // ✅ default checked

  const getCSRFToken = () => {
    return window.csrf_token;
  };

  const handleConfirm = async () => {
    setLoadingBookingData(true);
    setBookingItemsModal(true);
    setBookingModal(false);

    const formattedPickupDate = formatDate(actualToDate);
    const formattedReturnDate = formatDate(toDate);

    try {
      const bookingEntryData = await getReservedBookingEntryData(
        itemNames,
        formattedPickupDate,
        formattedReturnDate
      );

      if (bookingEntryData) {
        setBookingEntryData(bookingEntryData);
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while fetching reserved data.",
        "error"
      );
    } finally {
      setLoadingBookingData(false);
    }
  };

  const handleExtendBooking = async () => {
    if (!toDate) {
      addToast("Please select a 'To Date'", "error");
      return;
    }

    const from = dayjs(actualToDate, "DD/MM/YYYY hh:mm A");
    const to = dayjs(toDate, "DD/MM/YYYY hh:mm A");

    console.log("to..",to )
    console.log("toDate..",toDate )

    if (to.isBefore(from)) {
      addToast("'To Date' cannot be earlier than 'From Date'", "error");
      return;
    }

    try {
      const csrfToken = getCSRFToken();
      const formattedToDate = dayjs(toDate).format("YYYY-MM-DD HH:mm:ss");
      const response = await extendBookingAvailability(
        bookingId,
        formattedToDate,
        //isGST,
        csrfToken
      );

      

      if (response.unavailable_items.length > 0) {
        addToast(
          `This Item ${response.unavailable_items.join(
            ", "
          )} already reserved by another customer`,
          "error"
        );
        setBookingModal(true);
      } else {
        addToast("All items are available for the selected period.", "success");
        onRedirectToRentalAssetList();
        onClose();
      }
    } catch (error) {
      addToast(error.message || "Error checking availability", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50 flex justify-center items-center px-4">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-lg font-bold mb-4">Extend Booking</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium">From Date</label>
            <input
              type="text"
              value={actualToDate}
              disabled
              className="w-full px-2 py-2 text-gray-600 bg-gray-200 rounded-lg border border-gray-300"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">To Date</label>
            <DateTimePicker
              value={toDate ? dayjs(toDate) : null}
              onChange={setToDate}
              className="w-full px-2 py-2 text-gray-600 bg-gray-200 rounded-lg border border-gray-300"
              format="DD/MM/YYYY hh:mm A"
              placeholderText="DD/MM/YYYY hh:mm A"
              viewRenderers={{
                hours: renderTimeViewClock,
                minutes: renderTimeViewClock,
                seconds: renderTimeViewClock,
              }}
              slotProps={{
                textField: {
                  className: "bg-[#4B5150] border-none",
                  InputProps: {
                    style: {
                      height: "40px",
                      fontSize: "13px",
                      color: "#757575",
                    },
                  },
                },
              }}
            />

            {/* <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="gstCheckbox"
                checked={isGST}
                onChange={(e) => setIsGST(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <label htmlFor="gstCheckbox" className="text-sm font-medium text-gray-700">
                Apply GST
              </label>
            </div> */}

          </div>
          <div className="flex justify-end space-x-4">
            <button
              className="bg-gray-600 text-white text-sm font-bold px-4 py-2 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-primary-hover transition-colors"
              onClick={handleExtendBooking}
            >
              Check Availability
            </button>
          </div>
        </div>
      </LocalizationProvider>
      <ConfirmCheckoutModal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
        title="Confirm"
        message="This item is already reserved. Do you want see details?"
        cancelMessage="No"
        confirmMessage="Yes"
        onConfirm={handleConfirm}
      />
      <CancelBookingModal
        isOpen={bookingItemsModal}
        onClose={() => setBookingItemsModal(false)}
        title="Reserved Booking Details"
        loadingReservedData={loadingBookingData}
        reservedData={bookingEntryData}
        addToast={addToast}
        fetchData={fetchData}
        onRedirectToRentalAssetList={onRedirectToRentalAssetList}
        bookingModal={bookingModal}
      />
    </div>
  );
};

export default AvailabilityStatusModal;
