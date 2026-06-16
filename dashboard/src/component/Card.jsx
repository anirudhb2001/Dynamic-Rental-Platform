import React, { useState } from "react";
import { UserIcon, CalendarIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import ReturnOrderPopup from "./ReturnOrderPopup/ReturnOrderPopup";
import RentalBookingReturnPopup from "./RentalBookingReturnPopup";

const Card = ({
  id,
  customer,
  date,
  totalPrice,
  advanceAmount,
  balanceAmount,
  itemName,
  rentalItems,
  status,
  addToast,
  onRedirectToRentalAssetList,
  toDate,
  setToDate,
  bookingEntryStatus,
  formatDate,
  fetchData,
  securityDocumentStatus, // ✅ പുതിയ prop
  isRentalBooking,
  customerDetails,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("return");

  const closeReturnModal = () => {
    setModalOpen(false);
  };

  const isBookingReturned =
    bookingEntryStatus === "Returned" ||
    bookingEntryStatus === "Document pending to return";

  const isDocumentPending = securityDocumentStatus === "Document Pending To Return";

  return (
    <div className="border border-gray-100 w-full h-64 bg-white rounded-xl shadow-sm hover:shadow-md flex flex-col hover:border-primary/30 transition-all overflow-hidden">
      
      {/* Header Section */}
      <div className="flex justify-between items-center p-2">
        <div className="flex items-center gap-1.5">
          <p className="text-gray-800 font-bold text-sm bg-gray-50 px-2 py-1 rounded-md">{id}</p>
          {/* ✅ Document Pending icon */}
          {isDocumentPending && (
            <span title="Document Pending To Return">
              <DocumentTextIcon className="w-4 h-4 text-orange-500" />
            </span>
          )}
        </div>
        <button
          className={`px-3 py-0.25 text-white text-xs rounded-lg ${
            isBookingReturned
              ? "bg-green-700"
              : status === "Active"
              ? "bg-green-500"
              : status === "Overdue"
              ? "bg-rose-500"
              : status === "Due Today"
              ? "bg-orange-500"
              : status === "Due Tomorrow"
              ? "bg-blue-500"
              : bookingEntryStatus === "Partially Returned"
              ? "bg-gray-600"
              : "bg-gray-500"
          }`}
        >
          {isBookingReturned
            ? "Returned"
            : bookingEntryStatus === "Partially Returned"
            ? "Partially Returned"
            : status}
        </button>
      </div>

      <div className="flex-grow p-2 font-barlow overflow-hidden">
        <p className="font-semibold mt-1 mb-1 truncate">
          <span className="text-gray-400">{itemName}</span>
        </p>
        <div className="flex items-center">
          <UserIcon className="w-4 h-4 text-primary mr-3" />
          <h2 className="text-lg font-semibold">{customer}</h2>
        </div>
        <div className="flex items-center mb-2">
          <CalendarIcon className="w-4 h-4 text-primary mr-3" />
          <h3 className="text-lg">{date}</h3>
        </div>
        <div className="flex justify-between">
          <p className="font-semibold">Total Agreement</p>
          <p className="mr-3 text-gray-600">Rs {totalPrice}</p>
        </div>
        <div className="flex justify-between">
          <p className="font-semibold text-base">Advance Amount</p>
          <p className="mr-3 text-gray-600">  Rs { advanceAmount > 0 ? Number(advanceAmount || 0).toFixed(3) : 0 }</p>
        </div>
        <div className="flex justify-between mb-2">
          <p className="font-semibold">Balance Amount</p>
          <p className="mr-3 text-gray-600">Rs {balanceAmount}</p>
        </div>
      </div>

      <div>
        {isBookingReturned ? (
          <button className="w-full text-white font-semibold py-2 mt-auto bg-emerald-500 hover:bg-emerald-600 transition-colors">
            RETURNED
          </button>
        ) : customerDetails?.portal_approval_status === "Pending" ? (
          <button
            disabled
            className="w-full text-amber-800 font-semibold py-2 mt-auto bg-amber-100 cursor-not-allowed border-t border-amber-200 transition-colors"
          >
            PENDING ADMIN APPROVAL
          </button>
        ) : (
          <div className="flex">
            <button
              onClick={() => {
                setInitialTab("return");
                setModalOpen(true);
              }}
              className="w-1/2 text-white font-semibold py-2 mt-auto bg-primary hover:bg-primary-hover border-r border-white/20 transition-colors"
            >
              {bookingEntryStatus === "Partially Returned"
                ? "PARTIALLY RETURNED"
                : "RETURN PROCESS"}
            </button>
            <button
              onClick={() => {
                setInitialTab("extend");
                setModalOpen(true);
              }}
              className="w-1/2 text-gray-700 font-semibold py-2 mt-auto bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              EXTEND BOOKING
            </button>
          </div>
        )}

        
        {isRentalBooking ? (
          <RentalBookingReturnPopup
            show={modalOpen}
            onClose={() => setModalOpen(false)}
            bookingId={id}
            customer={customer}
            itemName={itemName}
            addToast={addToast}
            fetchData={fetchData}
          />
        ) : (
          <ReturnOrderPopup
            show={modalOpen}
            onClose={() => setModalOpen(false)}
            rentalItems={rentalItems}
            id={id}
            date={date}
            addToast={addToast}
            onRedirectToRentalAssetList={onRedirectToRentalAssetList}
            toDate={toDate}
            setToDate={setToDate}
            closeReturnModal={closeReturnModal}
            isBookingReturned={isBookingReturned}
            formatDate={formatDate}
            fetchData={fetchData}
            initialTab={initialTab}
          />
        )}

      </div>
    </div>
  );
};

export default Card;