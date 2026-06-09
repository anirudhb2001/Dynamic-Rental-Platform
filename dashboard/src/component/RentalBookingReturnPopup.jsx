import React, { useState } from "react";
import { processRentalReturn } from "../services/api";

const RentalBookingReturnPopup = ({
  show,
  onClose,
  bookingId,
  customer,
  itemName,
  addToast,
  fetchData,
}) => {
  const [returnDate, setReturnDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [damageFound, setDamageFound] = useState(false);
  const [damageCost, setDamageCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!show) return null;

  const handleSubmit = async () => {
    if (!returnDate) {
      addToast("Please select a return date.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const csrfToken = window.csrf_token || "";
      const res = await processRentalReturn(
        bookingId,
        returnDate,
        remarks,
        damageFound ? 1 : 0,
        damageCost,
        csrfToken
      );
      addToast("Return processed successfully!", "success");
      onClose();
      if (fetchData) fetchData();
    } catch (error) {
      addToast(error.message || "Failed to process return.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl font-barlow relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
        >
          &#10005;
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
          Process Return: {bookingId}
        </h2>

        <div className="space-y-4 mt-4 text-sm text-gray-700">
          <div>
            <p><span className="font-semibold">Customer:</span> {customer}</p>
            <p><span className="font-semibold">Asset:</span> {itemName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Return Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className="w-full border rounded-md p-2 focus:ring focus:ring-primary/20"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="damageFound"
              checked={damageFound}
              onChange={(e) => {
                setDamageFound(e.target.checked);
                if (!e.target.checked) setDamageCost(0);
              }}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="damageFound" className="font-semibold cursor-pointer">
              Damage Found?
            </label>
          </div>

          {damageFound && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Damage Cost
              </label>
              <input
                type="number"
                min="0"
                className="w-full border rounded-md p-2 focus:ring focus:ring-primary/20"
                value={damageCost}
                onChange={(e) => setDamageCost(e.target.value)}
                placeholder="Enter damage cost"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks
            </label>
            <textarea
              className="w-full border rounded-md p-2 focus:ring focus:ring-primary/20"
              rows="3"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-4 py-2 text-white font-medium rounded-md transition ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary-hover"
            }`}
          >
            {isSubmitting ? "Processing..." : "Submit Return"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RentalBookingReturnPopup;
