import axios from "axios";
import {
  VITE_PUBLIC_ITEM_URL,
  VITE_PUBLIC_PRICE_LIST_QTY_URL,
  VITE_PUBLIC_CART_URL,
  VITE_PUBLIC_CUSTOMER_BASE_API,
  VITE_PUBLIC_RETURN_QTY_URL,
  VITE_PUBLIC_AVAIL_ITEM,
  VITE_PUBLIC_BOOKING_ENTRY_DATA,
  VITE_PUBLIC_CANCEL_BOOKING,
  VITE_PUBLIC_EXTEND_BOOKING,
  VITE_PUBLIC_FINANCIAL_BOOKING_DATA,
  VITE_PUBLIC_RETURN_BOOKING,
  VITE_PUBLIC_ADDITONAL_DISCOUNT,
  VITE_PUBLIC_SINGLE_CART,
  VITE_PUBLIC_SEARCH_ITEM,
  VITE_PUBLIC_CREATE_PAYMENT_ENTRY,
  VITE_PUBLIC_ITEM_WAREHOUSE,
  VITE_AUTHENTICATION,
} from "../../../constants";

// API for fetching CameraList Items.
export const getRentalAssetList = async (params) => {
  try {
    const response = await axios.get(`${VITE_PUBLIC_ITEM_URL}.get_item_list`, {
      params,
    });

    if (response.data && response.data.message) {
      return response.data.message;
    }

    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch items from server"
    );
  }
};

export const getServiceItem = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_RETURN_BOOKING}.get_items_by_group`
    );

    if (response.data && response.data.message) {
      return response.data.message.data;
    }

    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch service item from server"
    );
  }
};

export const getWarehouseList = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_RETURN_BOOKING}.get_filtered_warehouses`
    );

    if (response.data && response.data.message) {
      return response.data.message.warehouses;
    }
    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch warehouses from server"
    );
  }
};

export const searchItems = async (query, priceList) => {
  try {
    const response = await axios.get(`${VITE_PUBLIC_SEARCH_ITEM}.search`, {
      params: { name: query, price_list: priceList },
    });

    if (response.data && response.data.message) {
      return response.data.message;
    }
    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to search item from server"
    );
  }
};

export const getItemAvailability = async (startDatetime, endDatetime) => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_AVAIL_ITEM}.get_item_availability`,
      {
        params: { start_datetime: startDatetime, end_datetime: endDatetime },
      }
    );

    if (response.data && response.data["total items"]) {
      return response.data;
    }
    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch item availability status from server"
    );
  }
};

export const getReservedBookingEntryData = async (
  itemName,
  fromDatetime,
  actualDatetime
) => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_BOOKING_ENTRY_DATA}.get_reserved_booking_entries_by_items`,
      {
        params: {
          item_names: JSON.stringify(itemName),
          rental_from_date: fromDatetime,
          actual_to_date: actualDatetime,
        },
      }
    );

    if (
      response.data &&
      response.data.message &&
      response.data.message.status === "success"
    ) {
      return response.data.message.data; // Return the correct nested data
    }
    throw new Error("Invalid API response");
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch booking entry status from server"
    );
  }
};

export const getBeWithFinancialDetails = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_FINANCIAL_BOOKING_DATA}.get_booking_entries_with_financial_details`
    );
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch booking entry from server"
    );
  }
};

export const getBookingEntryStatus = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_FINANCIAL_BOOKING_DATA}.get_booking_entry_status`
    );
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch booking entry status from server"
    );
  }
};


export const getCategories = async () => {
  try {
    const response = await axios.get(`${VITE_PUBLIC_ITEM_URL}.get_item_groups`);
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch categories from server"
    );
  }
};

export const getSalesPerson = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_CART_URL}.get_sales_persons`
    );
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch sales person from server"
    );
  }
};

// API for fetching Brands
export const getBrands = async () => {
  try {
    const response = await axios.get(`${VITE_PUBLIC_ITEM_URL}.get_item_brands`);
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch brands from server"
    );
  }
};

export const getPriceLists = async () => {
  try {
    const response = await axios.get(`${VITE_PUBLIC_ITEM_URL}.get_price_lists`);
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch price list from server"
    );
  }
};

export const getProductBundleList = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_ITEM_URL}.get_product_bundle_list`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch bundle list from server"
    );
  }
};

export const getCustomerLists = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_CUSTOMER_BASE_API}.customer_list`
    );
    return response.data.customers;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch customer list from server"
    );
  }
};

export const getItemWarehouse = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_ITEM_WAREHOUSE}.item_qty_in_warehouse`
    );
    return response.data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch warehouses from server"
    );
  }
};

export const getAllWarehouseList = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_BOOKING_ENTRY_DATA}.warehouse_filtering`
    );
    return response.data.message.warehouses;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch warehouse"
    );
  }
};

export const getUserWarehouse = async () => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_ITEM_WAREHOUSE}.get_user_default_warehouse`
    );
    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch user warehouse from server"
    );
  }
};

export const getPriceListQty = async (
  item_code,
  price_list,
  pickup_date,
  return_date
) => {
  const queryParams = new URLSearchParams({
    item_code,
    price_list,
    pickup_date,
    return_date,
  });

  const response = await axios.get(
    `${VITE_PUBLIC_PRICE_LIST_QTY_URL}?${queryParams.toString()}`
  );

  return response?.data?.message ?? null;
};


export const gettQtyReturn = async (
  item_code,
  price_list,
  pickup_date,
  actual_return_date
) => {
  try {
    const queryParams1 = new URLSearchParams({
      item_code,
      price_list,
      pickup_date,
      actual_return_date,
    });

    const response = await axios.get(
      `${VITE_PUBLIC_RETURN_QTY_URL}?${queryParams1.toString()}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch quantity from server"
    );
  }
};

export const createQuotation = async (
  customer,
  booking_details,
  quantity = 0,
  custom_rental_from_date,
  custom_rental_to_date,
  custom_actual_to_date,
  csrfToken
) => {
  try {
    const payload = {
      customer,
      booking_details: JSON.stringify(booking_details),
      quantity,
      custom_rental_from_date,
      custom_rental_to_date,
      custom_actual_to_date,
    };

    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.create_quotation`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    const message = response.data?.message;

    if (!message) {
      throw new Error("Quotation name not found in the API response.");
    }

    return message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message
    );
  }
};

export const extendBooking = async (
  quotationName,
  bookingEntryName,
  csrfToken
) => {
  try {
    const payload = {
      quotation_name: quotationName,
      booking_entry_id: bookingEntryName,
    };

    const response = await axios.post(
      `${VITE_PUBLIC_EXTEND_BOOKING}.process_quotation`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to extend booking"
    );
  }
};

export const cancelBookingEntries = async (selectedRows, csrfToken) => {
  try {
    const response = await axios.post(
      `${VITE_PUBLIC_CANCEL_BOOKING}.cancel_multiple_booking_entries`,
      { booking_entry_names: selectedRows },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    const message = response.data?.message;

    if (!message) {
      throw new Error("Cancel booking API did not return a valid message.");
    }

    return message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to cancel booking entries"
    );
  }
};

export const extendBookingAvailability = async (
  bookingId,
  newToDate,
  //isGST,
  csrfToken
) => {
  try {
    const response = await axios.post(
      `${VITE_PUBLIC_EXTEND_BOOKING}.extend_bookings_availability`,
      { booking_id: bookingId, new_to_date: newToDate },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    return response.data.availability;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch status of extend booking"
    );
  }
};

export const getCustomerDraftQuotations = async (customerName) => {
  const response = await fetch(
    `${VITE_PUBLIC_CART_URL}.get_customer_draft_quotations?customer_name=${customerName}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch quotations");
  }
  return await response.json();
};

export const deleteQuotation = async (customer, csrfToken) => {
  try {
    const delete_cart = {
      customer,
    };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.delete_quotation`,
      delete_cart,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to delete quotation"
    );
  }
};

export const submitQuotation = async (
  quotationName,
  salesPerson,
  csrfToken
) => {
  try {
    const payload = {
      quotation_name: quotationName,
      sales_person: salesPerson,
    };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.create_sales_order_and_booking_entry`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to submit quotation"
    );
  }
};

export const submitQuotationWithoutBooking = async (
  quotationName,
  csrfToken
) => {
  try {
    const payload = { quotation_name: quotationName };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.submit_quotation_without_booking`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to submit quotation"
    );
  }
};

export const CreateSaleOrder = async (
  quotationName,
  salesPerson,
  csrfToken,
  isInclusiveTax
) => {
  try {
    const payload = {
      quotation_name: quotationName,
      sales_person: salesPerson,
      is_inclusive_tax: isInclusiveTax,
    };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.submit_and_create_sales_order_booking`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    const apiError = error.response?.data;

    // 1. Prefer message.error if present
    const errorMessage =
      apiError?.message?.error ||
      // 2. Try parsing _server_messages if needed
      (() => {
        try {
          const messages = JSON.parse(apiError?._server_messages || "[]");
          if (messages.length > 0) {
            const parsed = JSON.parse(messages[0]);
            return parsed?.message || parsed?._error_message;
          }
        } catch (e) {
          return null;
        }
      })() ||
      // 3. Fallback
      "Failed to create sale order";

    throw new Error(errorMessage);
  }
};

export const createPaymentEntry = async (bookingEntryId, csrfToken) => {
  try {
    const response = await axios.post(
      `${VITE_PUBLIC_CREATE_PAYMENT_ENTRY}.create_payment_entry`,
      { booking_id: bookingEntryId },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to create payment entry"
    );
  }
};

export const generateOtp = async (customer, csrfToken) => {
  try {
    const payload = { customer };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.generate_otp`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to generate otp");
  }
};

export const validateOtp = async (customer, enteredOtp, csrfToken) => {
  try {
    const payload = { customer, entered_otp: enteredOtp };
    const response = await axios.post(
      `${VITE_PUBLIC_CART_URL}.validate_otp`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to validate otp");
  }
};

export const updateAdditionalDiscount = async (
  quotationName,
  additionalDiscountPercentage,
  additionalDiscountAmount,
  csrfToken
) => {
  const data = {
    quotation_name: quotationName,
    additional_discount_percentage: additionalDiscountPercentage,
    additional_discount_amount: additionalDiscountAmount,
  };

  try {
    const response = await axios.post(
      VITE_PUBLIC_ADDITONAL_DISCOUNT, // Use the imported endpoint here
      data,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken, // Pass CSRF token if required
        },
      }
    );

    if (response.status === 200) {
      return response.data; // Return the API response data (e.g., updated grand total)
    } else {
      throw new Error(response.data.message || "Error applying discount.");
    }
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to appy discount");
  }
};

export const removeCartItem = async (
  quotationName,
  rentalItemId,
  csrfToken
) => {
  try {
    const response = await axios.get(
      `${VITE_PUBLIC_SINGLE_CART}?quotation_name=${encodeURIComponent(
        quotationName
      )}&rental_item_id=${encodeURIComponent(rentalItemId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    if (response.data?.message?.status === "success") {
      return response.data?.message;
    } else {
      throw new Error(response.data?.message || "Failed to remove item.");
    }
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data || "Request failed.");
    } else {
      throw new Error(error.message || "Request failed.");
    }
  }
};

export const rentalReturnBooking = async (
  bookingEntryId,
  additionalCharges = [],
  itemWarehouses = [],
  blackList = false,
  yellowList = false,
  remarks = "",
  itemRemarks = [],
  csrfToken
) => {
  try {
    const payload = {
      booking_entry_id: bookingEntryId,
      additional_charges: additionalCharges,
      item_warehouses: itemWarehouses,
      black_list: blackList ? 1 : 0,
      yellow_list: yellowList ? 1 : 0,
      remarks: remarks,
      item_remarks: itemRemarks,
    };

    const response = await axios.post(
      `${VITE_PUBLIC_RETURN_BOOKING}.rental_return_booking`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );

    return response.data.message;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Error processing rental return booking"
    );
  }
};

export const getBrandingSettings = async () => {
  try {
    const response = await axios.get(`${VITE_AUTHENTICATION}/api/method/rental_platform.web_api.branding.get_branding_settings?_=${new Date().getTime()}`, {
      withCredentials: true,
    });
    return response.data.message; // Whitelisted methods return data under 'message' key
  } catch (error) {
    console.error("Failed to fetch branding settings:", error);
    return null;
  }
};

export const getReturnableBookings = async (
  customer = null,
  fromDate = null,
  toDate = null
) => {
  try {
    const params = {};
    if (customer) params.customer = customer;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    const response = await axiosInstance.get(
      `${VITE_AUTHENTICATION}/api/method/rental_platform.web_api.rental_return_api.get_returnable_bookings`,
      { params }
    );
    return response.data.message || [];
  } catch (error) {
    throw error;
  }
};

export const processRentalReturn = async (
  bookingId,
  returnDate,
  remarks = "",
  damageFound = 0,
  damageCost = 0,
  csrfToken
) => {
  try {
    const response = await axiosInstance.post(
      `${VITE_AUTHENTICATION}/api/method/rental_platform.web_api.rental_return_api.process_rental_return`,
      {
        booking_id: bookingId,
        return_date: returnDate,
        remarks,
        damage_found: damageFound,
        damage_cost: damageCost
      },
      {
        headers: {
          "X-Frappe-CSRF-Token": csrfToken,
        },
      }
    );
    if (response.data.message && response.data.message.error) {
      throw new Error(response.data.message.error);
    }
    return response.data.message;
  } catch (error) {
    throw error;
  }
};
