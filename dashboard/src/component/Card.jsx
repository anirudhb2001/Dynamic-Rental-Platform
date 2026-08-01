import React, { useState } from "react";
import { UserIcon, CalendarIcon, DocumentTextIcon, MapPinIcon, CurrencyRupeeIcon, TagIcon } from "@heroicons/react/24/outline";
import { LuCalendarCheck, LuClock, LuUser } from "react-icons/lu";
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
  securityDocumentStatus,
  isRentalBooking,
  isVenueReservation,
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

  // Status Badge Styling
  const getStatusStyle = (currentStatus) => {
    if (isBookingReturned) return "bg-slate-100 text-slate-700 border-slate-200";
    if (currentStatus === "Active" || currentStatus === "Confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (currentStatus === "Overdue") return "bg-rose-50 text-rose-700 border-rose-200";
    if (currentStatus === "Due Today" || currentStatus === "Event Today") return "bg-orange-50 text-orange-700 border-orange-200";
    if (currentStatus === "Due Tomorrow" || currentStatus === "Event Tomorrow") return "bg-sky-50 text-sky-700 border-sky-200";
    if (bookingEntryStatus === "Partially Returned") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  };

  const displayStatus = isBookingReturned 
    ? "Completed" 
    : bookingEntryStatus === "Partially Returned" 
      ? "Partially Returned" 
      : status;

  return (
    <div className="group w-full bg-white rounded-3xl shadow-sm hover:shadow-xl flex flex-col border border-slate-100 transition-all duration-300 overflow-hidden relative">
      {/* Decorative gradient blur */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* Header Section */}
      <div className="flex justify-between items-center p-5 pb-4 border-b border-slate-50 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-bold text-xs tracking-wider uppercase bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{id}</span>
          {isDocumentPending && (
            <span title="Document Pending To Return" className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
              <DocumentTextIcon className="w-3.5 h-3.5" />
              Doc Pending
            </span>
          )}
        </div>
        <div className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusStyle(status)} shadow-sm`}>
          {displayStatus}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow px-5 py-4 font-barlow relative z-10 flex flex-col gap-4">
        {/* Title */}
        <div>
          <h2 className="font-black text-slate-900 text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {itemName}
          </h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center text-slate-600 bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100 mr-3 shrink-0">
              <LuUser className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold truncate flex-1">{customer}</p>
          </div>
          
          <div className="flex items-center text-slate-600 bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-100 mr-3 shrink-0">
              <LuCalendarCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold truncate flex-1">{date}</p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mt-2 pt-4 border-t border-slate-100/60 grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-sm font-black text-slate-800">₹{Number(totalPrice).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex flex-col gap-1 p-2 rounded-xl bg-emerald-50/30">
            <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider">Advance</span>
            <span className="text-sm font-black text-emerald-600">₹{Number(advanceAmount || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex flex-col gap-1 p-2 rounded-xl bg-rose-50/30">
            <span className="text-[10px] font-bold text-rose-600/70 uppercase tracking-wider">Balance</span>
            <span className="text-sm font-black text-rose-600">₹{Number(balanceAmount || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 pt-0 mt-auto relative z-10">
        {isBookingReturned ? (
          <button className="w-full text-slate-500 font-bold text-sm tracking-wide py-3.5 rounded-2xl bg-slate-100 border border-slate-200 cursor-default">
            COMPLETED
          </button>
        ) : customerDetails?.portal_approval_status === "Pending" ? (
          <button
            disabled
            className="w-full text-amber-700 font-bold text-sm tracking-wide py-3.5 rounded-2xl bg-amber-50 border border-amber-200 cursor-not-allowed"
          >
            PENDING APPROVAL
          </button>
        ) : (
          <div className="flex gap-2">
            {!isVenueReservation && (
              <button
                onClick={() => {
                  setInitialTab("return");
                  setModalOpen(true);
                }}
                className="flex-1 text-slate-700 font-bold text-sm tracking-wide py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                RETURN
              </button>
            )}
            <button
              onClick={() => {
                setInitialTab("extend");
                setModalOpen(true);
              }}
              className="flex-[2] text-white font-bold text-sm tracking-wide py-3.5 rounded-2xl bg-slate-900 hover:bg-primary transition-all shadow-md hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
            >
              {isVenueReservation ? 'EXTEND / MANAGE' : 'EXTEND'}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
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
  );
};

export default Card;