import React, { useEffect, useState, useMemo, useCallback } from "react";
import Card from "./Card";
import {
  getBeWithFinancialDetails,
  getBookingEntryStatus
} from "../services/api";
import Pagination from "./Pagination/Pagination.jsx";
import dayjs from "dayjs";
import { BsArrowDownUp } from "react-icons/bs";
import { IoIosArrowDown, IoMdAdd } from "react-icons/io";
import ReservationModal from "./AvailabilityCalendar/ReservationModal";

const ReservationList = ({
  addToast,
  onRedirectToRentalAssetList,
  financialData,
  setFinancialData,
  setAllBookingData,
  currentPage,
  setCurrentPage,
  isLoading,
  setIsLoading,
  allBookingData,
  formatDate,
  fetchData,
  customerDetails,
}) => {

  const returnViewType = "booking_entry"; // "booking_entry"
  const [toDate, setToDate] = useState(null);
  const itemsPerPage = 12;
  const [sortOrder, setSortOrder] = useState("newest");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const sortBookingData = useCallback((data, order) => {
    return [...data].sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return order === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, []);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setIsLoading(true);

        if (returnViewType === "booking_entry") {
          const [BookingData, bookingStatusData] = await Promise.all([
            getBeWithFinancialDetails(),
            getBookingEntryStatus(),
          ]);

          const bookingStatusMap = new Map(
            bookingStatusData.booking_entries.map((entry) => [
              entry.name,
              entry.status,
            ])
          );

          const formattedBookingData = (BookingData || [])
            .map((booking_detail) => {
              const rentalItems = booking_detail.rental_items.map((item) => ({
                ...item,
                isReturned: item.returned_item === 1,
              }));

              return {
                id: booking_detail.booking_entry,
                status: ["Returned", "Partially Returned"].includes(
                  booking_detail.booking_status
                )
                  ? booking_detail.booking_status
                  : booking_detail.date_status,
                customer_data: booking_detail.customer,
                date: new Date(booking_detail.event_date || booking_detail.actual_to_date),
                totalPrice: booking_detail.total_agreement_amount,
                advanceAmount: booking_detail.amount_received,
                balanceAmount: booking_detail.pending_amount,
                itemName: booking_detail.venue || booking_detail.rental_items[0]?.item_name,
                hotelProperty: booking_detail.hotel_property,
                eventType: booking_detail.event_type,
                timeSlot: booking_detail.time_slot,
                rentalItems,
                sales_invoices: booking_detail.sales_invoices || [],
                securityDocumentStatus: booking_detail.security_document_status || "",
                bookingEntryStatus:
                  bookingStatusMap.get(booking_detail.booking_entry) || "Unknown",
                isVenueReservation: !!booking_detail.venue
              };
            })
            .filter(
              (booking) =>
                booking.bookingEntryStatus !== "Cancelled"
            );

          const sortedData = sortBookingData(formattedBookingData, sortOrder);
          setFinancialData(sortedData);
          setAllBookingData(sortedData);
        } else {
          // Fetch Rental Booking data
          const bookings = await getReturnableBookings();

          const formattedBookingData = (bookings || []).map((booking) => {
            return {
              id: booking.name,
              status: booking.booking_status,
              customer_data: booking.customer,
              date: new Date(booking.end_date),
              totalPrice: booking.rental_rate * booking.quantity,
              advanceAmount: 0,
              balanceAmount: 0,
              itemName: booking.asset_name || booking.asset,
              rentalItems: [{
                rental_item_id: booking.asset,
                item_name: booking.asset_name || booking.asset,
                quantity: booking.quantity,
                isReturned: false
              }],
              sales_invoices: [],
              securityDocumentStatus: "",
              bookingEntryStatus: booking.booking_status,
              isRentalBooking: true, // Flag to identify new workflow
              rawBooking: booking
            };
          });

          const sortedData = sortBookingData(formattedBookingData, sortOrder);
          setFinancialData(sortedData);
          setAllBookingData(sortedData);
        }
      } catch (error) {
        addToast(
          error.message || "Failed to fetch data from the server",
          "error"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingData();
  }, [returnViewType]);
  useEffect(() => {
    if (allBookingData.length > 0) {
      const sortedData = sortBookingData(allBookingData, sortOrder);
      setFinancialData(sortedData);
    }
  }, [sortOrder, allBookingData, sortBookingData]);

  const { filteredData, paginatedData, totalPages } = useMemo(() => {
    const filtered = financialData.filter(
      (data) =>
        data.status !== "No Rental From Date" &&
        data.status !== "No Actual To Date"
    );

    const pages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return {
      filteredData: filtered,
      paginatedData: paginated,
      totalPages: pages,
    };
  }, [financialData, currentPage, itemsPerPage]);

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
      }
    },
    [totalPages, setCurrentPage]
  );

  const toggleSortDropdown = useCallback(() => {
    setIsSortDropdownOpen((prev) => !prev);
  }, []);

  const handleSortChange = useCallback((order) => {
    setSortOrder(order);
    setIsSortDropdownOpen(false);
  }, []);

  return (
    <div>

      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex gap-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reservations</h1>
        </div>

        {!isLoading && (
          <div className="relative inline-block text-left z-20">
            <button
              className="flex items-center justify-center bg-white text-slate-700 font-bold border border-slate-200 px-4 py-2.5 text-sm rounded-xl gap-2 transition-all hover:bg-slate-50 hover:shadow-sm"
              onClick={toggleSortDropdown}
            >
              <BsArrowDownUp className="text-slate-400" />
              Sort by Date
              <IoIosArrowDown
                className={`text-slate-400 transition-transform ${isSortDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg shadow-slate-200/50 bg-white ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div className="py-1">
                  <button
                    className={`block px-4 py-2.5 w-full text-left text-sm font-semibold transition-colors ${sortOrder === "newest"
                        ? "bg-slate-50 text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                    onClick={() => handleSortChange("newest")}
                  >
                    Newest First
                  </button>
                  <button
                    className={`block px-4 py-2.5 w-full text-left text-sm font-semibold transition-colors ${sortOrder === "oldest"
                        ? "bg-slate-50 text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                    onClick={() => handleSortChange("oldest")}
                  >
                    Oldest First
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 pt-0 scroll-smooth">
        {isLoading ? (
          <div className="col-span-full flex flex-col justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 text-sm font-bold">
              Loading Reservations...
            </p>
          </div>
        ) : paginatedData.length > 0 ? (
          paginatedData.map((data) => (
            <Card
              key={data.id}
              id={data.id}
              status={data.status}
              customer={data.customer_data}
              date={data.isVenueReservation 
                ? `${dayjs(data.date).format("DD/MM/YYYY")} | ${data.timeSlot}`
                : dayjs(data.date).format("DD/MM/YYYY hh:mm A")}
              totalPrice={data.totalPrice}
              advanceAmount={data.advanceAmount}
              balanceAmount={data.balanceAmount}
              itemName={data.isVenueReservation ? `${data.itemName} - ${data.eventType}` : data.itemName}
              rentalItems={data.rentalItems}
              bookingEntryStatus={data.bookingEntryStatus}
              securityDocumentStatus={data.securityDocumentStatus}
              isRentalBooking={data.isRentalBooking}
              isVenueReservation={data.isVenueReservation}
              addToast={addToast}
              toDate={toDate}
              formatDate={formatDate}
              fetchData={fetchData}
              setToDate={setToDate}
              customerDetails={customerDetails}
              onRedirectToRentalAssetList={() =>
                onRedirectToRentalAssetList(
                  data.id,
                  data.rentalItems,
                  data.customer_data,
                  dayjs(data.date).format("DD/MM/YYYY hh:mm A"),
                  toDate
                )
              }
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500">
            No reservations available.
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          selectedPriceList={null}
        />
      )}

      <ReservationModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        addToast={addToast}
        onReservationCreated={fetchData}
      />
    </div>
  );
};

export default ReservationList;