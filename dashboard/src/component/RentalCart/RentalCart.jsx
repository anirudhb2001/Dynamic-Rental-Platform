import React, { useState, useEffect, useRef } from "react";
import { IoIosArrowDown, IoIosArrowUp, IoMdPerson } from "react-icons/io";
import { MdLocalPhone, MdDelete } from "react-icons/md";
import { TiDelete } from "react-icons/ti";
import axios from "axios";
import { PiCaretUpDownLight } from "react-icons/pi";
import { LuImage, LuShoppingCart } from "react-icons/lu";
import {
  deleteQuotation,
  submitQuotation,
  submitQuotationWithoutBooking,
  CreateSaleOrder,
  getSalesPerson,
  generateOtp,
  validateOtp,
  extendBooking,
  updateAdditionalDiscount,
} from "../../services/api.jsx";
import ConfirmCheckoutModal from "../ConfirmationModal/ConfirmCheckoutModal.jsx";
import QuotationSubmitModal from "../ConfirmationModal/QuotationSubmitModal.jsx";

import {
  VITE_PUBLIC_REDIRECT_URL,
  VITE_PUBLIC_SINGLE_CART,
  VITE_PUBLIC_SALE_INVOICE_URL,
} from "../../../../constants.js";

function RentalCart({
  mainCartItems,
  setMainCartItems,
  selectedCustomer,
  quotationNames,
  addToast,
  totalAmountCart,
  settotalAmountCart,
  exbookingEntryName,
  salesAvailable,
  setQuotationNames,
  portalMode,
  fetchData,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomDropdown, setShowCustomDropdown] = useState(false);
  const [isClearCartModalOpen, setClearCartModalOpen] = useState(false);
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isConfirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);
  const [salesPersons, setSalesPersons] = useState([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isOtpVerified, setOtpVerified] = useState(false);
  const [isOtpSent, setOtpSent] = useState(false);
  const [additionalDiscountPercentage, setadditionalDiscountPercentage] =
    useState("");
  const [additionalDiscountAmount, setadditionalDiscountAmount] = useState("");
  const [grandTotal, setGrandTotal] = useState(null);
  const [displayDiscount, setDisplayDiscount] = useState(0);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isAddDiscount, setAddDiscount] = useState(false);
  const [isAddPercentage, setAddPercentage] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [isCheckoutStarted, setIsCheckoutStarted] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);
  const [isInclusiveTax, setIsInclusiveTax] = useState(false);


  // API Functionalities.

  const getCSRFToken = () => {
    return window.csrf_token;
  };

  const toggleSubitems = (index) => {
    if (expandedItemId === index) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(index);
    }
  };

  const deleteClearCart = async () => {
    try {
      setClearCartModalOpen(false);
      const csrfToken = getCSRFToken();
      const deleteResponse = await deleteQuotation(selectedCustomer, csrfToken);
      if (deleteResponse.message?.success) {
        setQuotationNames([]);
        setMainCartItems([]);
        addToast("Cart Cleared successfully", "success");
        settotalAmountCart([]);
        setadditionalDiscountAmount("");
        setadditionalDiscountPercentage("");
      } else {
        addToast(
          deleteResponse.message?.error || "Failed to delete quotation.",
          "error"
        );
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while deleting the cart.",
        "error"
      );
    }
  };

  const proceedCheckout = async () => {
    try {
      setCheckoutModalOpen(false);

      const csrfToken = getCSRFToken();
      const quotationName = quotationNames[0];
      if (!quotationName) {
        addToast("Quotation name not found.", "error");
        return;
      }

      const submitResponse = await submitQuotation(
        quotationName,
        selectedSalesPerson,
        csrfToken
      );
      if (submitResponse.message?.message) {
        addToast(
          "Sales Order and Booking Entry created successfully",
          "success"
        );
        setMainCartItems([]);

        const salesOrderName = submitResponse.message.sales_order_name;
        if (salesOrderName) {
          if (portalMode === "customer") {
            addToast(`Booking placed successfully! Your order ID is: ${salesOrderName}`, "success");
          } else {
            const redirectUrl = `${VITE_PUBLIC_REDIRECT_URL}/${salesOrderName}`;
            window.location.href = redirectUrl;
          }
        } else {
          addToast("Sales order name not found in the response.", "error");
        }
      } else {
        addToast("Please submit the Quotation first", "error");
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while processing the checkout.",
        "error"
      );
    }
  };

  const confirmClearCart = async () => {
    try {
      setClearCartModalOpen(false);

      const csrfToken = getCSRFToken();
      if (!csrfToken) {
        addToast("CSRF token not found", "error");
        return;
      }

      const quotationName = quotationNames[0];
      if (!quotationName) {
        addToast("Quotation name not found.", "error");
        return;
      }

      const submitResponse = await submitQuotationWithoutBooking(
        quotationName,
        csrfToken
      );
      if (submitResponse.message?.message) {
        addToast("Quotation saved successfully", "success");
        setMainCartItems([]);
        settotalAmountCart([]);
        setQuotationNames([]);
        setadditionalDiscountAmount("");
        setadditionalDiscountPercentage("");
      } else {
        addToast(
          submitResponse.message?.error || "Failed to submit quotation.",
          "error"
        );
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while clearing the cart.",
        "error"
      );
    }
  };

  const clearCart = async () => {
    if (!selectedCustomer) {
      addToast("Please select a customer before clearing the cart.", "error");
      return;
    }
    // setIsDisabled(true);
    setClearCartModalOpen(true);
  };

  const confirmCheckout = async () => {
    try {
      const csrfToken = getCSRFToken();
      const quotationName = quotationNames[0];
      if (!quotationName) {
        addToast("Quotation name not found.", "error");
        return;
      }

      if (salesAvailable) {
        const bookingEntryName = exbookingEntryName;
        if (!bookingEntryName) {
          addToast("Missing required data for extending the booking.", "error");
          return;
        }

        try {
          setConfirmCheckoutOpen(false);

          const extendResponse = await extendBooking(
            quotationName,
            bookingEntryName,
            csrfToken
          );

          if (extendResponse) {
            addToast("Booking extended successfully", "success");
          }
          setMainCartItems([]);

          // const salesOrderName = extendResponse.message.sales_order_name;
          const salesInvoiceName = extendResponse.message.sales_invoice_name; //redirect to sales invoice
          if (salesInvoiceName) {
            if (portalMode === "customer") {
              addToast(`Booking extended successfully! Invoice ID is: ${salesInvoiceName}`, "success");
              if (fetchData) fetchData();
            } else {
              const redirectUrl = `${VITE_PUBLIC_SALE_INVOICE_URL}/${salesInvoiceName}`;
              window.location.href = redirectUrl;
            }
          } else {
            addToast("Sales invoice name not found in the response.", "error");
          }
        } catch (error) {
          addToast(
            error.message || "An error occurred while extending the booking.",
            "error"
          );
        }
      } else {
        try {
          setConfirmCheckoutOpen(false);

          const submitResponse = await CreateSaleOrder(
            quotationName,
            selectedSalesPerson,
            csrfToken,
            isInclusiveTax
          );

          if (submitResponse.message?.message) {
            addToast(
              "Sales Order and Booking Entry created successfully",
              "success"
            );
            setMainCartItems([]);

            const salesOrderName = submitResponse.message.sales_order_name;
            // const salesInvoiceName = submitResponse.message.sales_invoice_name;
            if (salesOrderName) {
              if (portalMode === "customer") {
                addToast(`Booking placed successfully! Your order ID is: ${salesOrderName}`, "success");
                if (fetchData) fetchData();
              } else {
                const redirectUrl = `${VITE_PUBLIC_REDIRECT_URL}/${salesOrderName}`;
                window.location.href = redirectUrl;
              }
            } else {
              addToast("Sales order name not found in the response.", "error");
            }
          } else {
            addToast(
              "An error occurred while processing the checkout.",
              "error"
            );
          }
        } catch (error) {
          addToast(
            error.message || "An error occurred while processing the checkout.",
            "error"
          );
        }
      }
    } catch (error) {
      addToast("An unexpected error occurred.", "error");
    }
  };

  const confirmToCheckout = async () => {
    if (!selectedCustomer) {
      addToast(
        "Please select a customer before confirming the checkout.",
        "error"
      );
      return;
    }
    setConfirmCheckoutOpen(true);
  };

  useEffect(() => {
    const fetchSalesPersons = async () => {
      try {
        const data = await getSalesPerson();
        setSalesPersons(data.sales_persons || []);
        setLoading(false);
      } catch (err) {
        addToast(err.message || "Error fetching sales persons:", "error");
        setError("Failed to load sales persons.");
        setLoading(false);
      }
    };

    fetchSalesPersons();
  }, []);

  const continueToCheckout = async () => {
    try {
      const csrfToken = getCSRFToken();
      const response = await generateOtp(selectedCustomer, csrfToken);
      if (response.message) {
        addToast("OTP sent successfully", "success");
        setOtpSent(true);
        setIsCheckoutStarted(true);
        setTimer(120);

        timerRef.current = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsCheckoutStarted(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while generating OTP.",
        "error"
      );
    }
  };

  const verifyOtp = async () => {
    if (!selectedCustomer) {
      addToast("Please select a customer before verifying OTP.", "error");
      return;
    }
    if (!enteredOtp.trim()) {
      addToast("Please enter the OTP.", "error");
      return;
    }

    try {
      const csrfToken = getCSRFToken();
      const response = await validateOtp(
        selectedCustomer,
        enteredOtp,
        csrfToken
      );
      if (response) {
        const msg = response.message?.message || response.message || "OTP verified successfully.";
        addToast(typeof msg === 'string' ? msg : "OTP verified successfully.", "success");
        setOtpVerified(true);
      }
    } catch {
      addToast("Invalid OTP.", "error");
      setOtpVerified(false);
    }
  };

  const handleOtpChange = (e) => {
    setEnteredOtp(e.target.value);
  };

  const handleDelete = async (item, isSubitem = false) => {
    let itemsToDelete = [];
    if (isSubitem) {
      itemsToDelete = [
        {
          rental_item_id: item.bundle_item_code || item.rental_item_id,
          isSubitem: true,
        },
      ];
    } else {
      // const bundleItemCodes = item.bundleItems?.map(subItem => subItem.bundle_item_code || item.rental_item_id) || [];
      // itemsToDelete = [
      //     { rental_item_id: item.id || item.rental_item_id, isSubitem: false },
      //     ...bundleItemCodes.map(code => ({ rental_item_id: code, isSubitem: true }))
      // ];
      itemsToDelete = [
        { rental_item_id: item.id || item.rental_item_id, isSubitem: false },
      ];

      // Collect subitems from `subitems` array if it exists
      if (item.subitems && Array.isArray(item.subitems)) {
        item.subitems.forEach((subitem) => {
          itemsToDelete.push({
            rental_item_id: subitem.rental_item_id,
            isSubitem: true,
          });
        });
      }

      // Collect bundle item codes from `bundleItems` array if it exists
      const bundleItemCodes =
        item.bundleItems?.map(
          (subItem) => subItem.bundle_item_code || item.rental_item_id
        ) || [];
      bundleItemCodes.forEach((code) => {
        itemsToDelete.push({ rental_item_id: code, isSubitem: true });
      });
    }

    if (itemsToDelete.length > 0) {
      try {
        const csrfToken = getCSRFToken();
        const response = await axios.post(
          VITE_PUBLIC_SINGLE_CART,
          { customer: selectedCustomer, itemsToDelete },
          {
            headers: {
              "X-Frappe-CSRF-Token": csrfToken,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (response.status === 200) {
          let updatedCart;

          if (isSubitem) {
            updatedCart = mainCartItems.map((cartItem) => {
              const hasBundleItems =
                cartItem.bundleItems && Array.isArray(cartItem.bundleItems);
              const hasSubitems =
                cartItem.subitems && Array.isArray(cartItem.subitems);

              if (hasBundleItems || hasSubitems) {
                const updatedItem = { ...cartItem };
                if (hasBundleItems) {
                  updatedItem.bundleItems = cartItem.bundleItems.filter(
                    (subItem) => {
                      return !(
                        (subItem.bundle_item_code &&
                          subItem.bundle_item_code === item.bundle_item_code) ||
                        (subItem.rental_item_id &&
                          subItem.rental_item_id === item.rental_item_id) ||
                        (subItem.id && subItem.id === item.id)
                      );
                    }
                  );
                }
                if (hasSubitems) {
                  updatedItem.subitems = cartItem.subitems.filter((subItem) => {
                    return !(
                      (subItem.bundle_item_code &&
                        subItem.bundle_item_code === item.bundle_item_code) ||
                      (subItem.rental_item_id &&
                        subItem.rental_item_id === item.rental_item_id) ||
                      (subItem.id && subItem.id === item.id)
                    );
                  });
                }

                return updatedItem;
              }
              return cartItem;
            });
          } else {
            updatedCart = mainCartItems.filter(
              (cartItem) =>
                !itemsToDelete.some(
                  (deletedItem) =>
                    deletedItem.rental_item_id === cartItem.id ||
                    deletedItem.rental_item_id === cartItem.rental_item_id
                )
            );
          }

          setMainCartItems(updatedCart);
          // console.log(mainCartItems, ": updated cart items");
        } else {
          addToast(
            response.data.message || "Backend deletion failed:",
            "error"
          );
        }
      } catch (error) {
        addToast(error.message || "Error sending delete request:", "error");
      }
    } else {
      addToast("No matching item found for deletion!");
    }
  };

  useEffect(() => {}, [mainCartItems]);

  useEffect(() => {}, [displayDiscount]);

  const [initialTotal, setInitialTotal] = useState(0);

  useEffect(() => {
    const calculatedTotal = totalAmountCart?.length
      ? totalAmountCart.reduce((acc, item) => item.total || item.price || 0)
      : mainCartItems?.length
      ? mainCartItems.reduce((acc, item) => item.total || item.price || 0)
      : 0;
    setInitialTotal(calculatedTotal); // this holds the correct total from API
    setGrandTotal(calculatedTotal);
    setDisplayDiscount(calculatedTotal);
  }, [totalAmountCart, mainCartItems]);

  useEffect(() => {
    const initialTotal = mainCartItems.reduce(
      (acc, item) => acc + (item.amount || item.price || 0),
      0
    );
    setDisplayDiscount(initialTotal);
  }, [mainCartItems]);

  const [useAmount, setUseAmount] = useState(false);
  const [usePercentage, setUsePercentage] = useState(false);

  const handleAmountCheckboxChange = () => {
    setUseAmount((prev) => {
      const newVal = !prev;
      if (newVal) {
        if (additionalDiscountPercentage) {
          addToast("Switched to amount discount. Resetting total.", "info");
        }
        setUsePercentage(false);
        setadditionalDiscountPercentage("");
        setGrandTotal(initialTotal);
        setDisplayDiscount(initialTotal);
      } else {
        setadditionalDiscountAmount("");
        setDisplayDiscount(initialTotal);
        setGrandTotal(initialTotal);
      }
      return newVal;
    });
  };

  const handlePercentageCheckboxChange = () => {
    setUsePercentage((prev) => {
      const newVal = !prev;
      if (newVal) {
        if (additionalDiscountAmount) {
          addToast("Switched to percentage discount. Resetting total.", "info");
        }
        setUseAmount(false);
        setadditionalDiscountAmount("");
        setGrandTotal(initialTotal);
        setDisplayDiscount(initialTotal);
      } else {
        setadditionalDiscountPercentage("");
        setDisplayDiscount(initialTotal);
        setGrandTotal(initialTotal);
      }
      return newVal;
    });
  };

  const handleApplyDiscount = async () => {
    if (!useAmount && !usePercentage) {
      addToast("Please select a discount method.", "error");
      return;
    }
    if (useAmount && !additionalDiscountAmount) {
      addToast("Please enter discount amount.", "error");
      return;
    }

    if (usePercentage && !additionalDiscountPercentage) {
      addToast("Please enter discount percentage.", "error");
      return;
    }

    // const quotationName = quotationNames[0];
    const quotationName =
      quotationNames.length > 1
        ? quotationNames[quotationNames.length - 1]
        : quotationNames[0];

    const csrfToken = getCSRFToken();
    setIsDisabled(true);

    try {
      const response = await updateAdditionalDiscount(
        quotationName,
        usePercentage ? additionalDiscountPercentage : null,
        useAmount ? additionalDiscountAmount : null,
        csrfToken
      );

      const message = response?.message || {};
      const grandTotal = message?.grand_total;

      if (grandTotal === undefined || isNaN(grandTotal)) {
        addToast("Invalid grand total value.", "error");
      } else {
        setGrandTotal(grandTotal);
        setDisplayDiscount(grandTotal); // Update the displayed total
        addToast(
          message?.message || "Discount applied successfully.",
          "success"
        );
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while applying discount.",
        "error"
      );
    } finally {
      setIsDisabled(false);
    }
  };

  useEffect(() => {
    if (isOtpVerified) {
      clearInterval(timerRef.current);
      setTimer(0);
      setIsCheckoutStarted(true);
    }
  }, [isOtpVerified]);

  return (
    <div className="max-w-full mx-auto relative w-full px-2">
      <div className="flex items-center justify-center mb-3 px-2">
        <div className="flex items-center w-full gap-4">
          <div className="flex items-center gap-2 w-full">
            <LuShoppingCart className="text-primary w-6 h-6" />
            <span className="text-gray-900 font-bold text-xl">CART</span>
          </div>

          {mainCartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="bg-[#4B5150] text-white p-1.5 rounded-md shadow-md hover:bg-gray-800 transition-all duration-300"
            >
              <MdDelete className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex-grow overflow-y-auto scrollbar-thin scrollbar-track-red-600 ${
          mainCartItems.length === 0 ? "h-[150px]" : "h-[250px]"
        } border border-gray-300 rounded-md`}
      >
        {mainCartItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <ul className="space-y-2 p-2">
            {mainCartItems.map((item, index) => (
              <li
                key={index}
                className="flex flex-col items-center w-full border-b p // ? mainCartItems.reduce((acc, item) => item.total || 0, 0)
            //   // : 0
            // }`}b-2 last:border-none"
              >
                <div className="flex items-center p-0 border border-gray-100 rounded-xl mb-2 w-full h-[70px] shadow-sm bg-white overflow-hidden">
                  <div className="bg-gray-50 flex items-center justify-center max-w-[100px] w-full h-full border-r border-gray-100 mr-2.5">
                    <img
                      src={item.image || item.item_image || ""}
                      className="w-auto max-h-[60px]"
                      alt={item.item_name || item.name || "Cart item"}
                    />
                  </div>
                  <div className="flex flex-col items-start text-[11px] text-[#333] pl-0 w-full">
                    <div className="flex justify-between w-full items-start">
                      <div>
                        <div className="flex items-baseline gap-1.5 text-[12px] font-normal">
                          <strong>{item.brand}</strong>
                          <span
                            className="max-w-[140px] h-[20px] overflow-hidden text-ellipsis whitespace-nowrap inline-block align-middle"
                            title={item.item_name}
                          >
                            {item.item_name}
                          </span>
                        </div>
                        <p className="mt-[5px]">
                          Quantity:{" "}
                          <strong>
                            {item.quantity} x {item.price}
                          </strong>
                        </p>
                        <p>
                          Amount: <strong>Rs {item.amount}</strong>
                        </p>
                      </div>

                      {item.bundleItems &&
                        Array.isArray(item.bundleItems) &&
                        item.bundleItems.length > 0 && (
                          // <button
                          //   onMouseEnter={() => handleMouseEnter(index)}
                          //   onMouseLeave={() => handleMouseLeave(index)}
                          //   className="text-sm text-[#333]"
                          // >
                          //   {hoveredItemId === index ? (
                          //     <IoIosArrowUp />
                          //   ) : (
                          //     <IoIosArrowDown />
                          //   )}
                          // </button>

                          <button
                            onClick={() => toggleSubitems(index)}
                            className="text-sm text-[#333]"
                          >
                            {expandedItemId === index ? (
                              <IoIosArrowUp />
                            ) : (
                              <IoIosArrowDown />
                            )}
                          </button>
                        )}

                      {item.subitems &&
                        Array.isArray(item.subitems) &&
                        item.subitems.length > 0 && (
                          // <button
                          //   onMouseEnter={() => handleMouseEnter(index)}
                          //   onMouseLeave={() => handleMouseLeave(index)}
                          //   className="text-sm text-[#333]"
                          // >
                          //   {hoveredItemId === index ? (
                          //     <IoIosArrowUp />
                          //   ) : (
                          //     <IoIosArrowDown />
                          //   )}
                          // </button>

                          <button
                            onClick={() => toggleSubitems(index)}
                            className="text-sm text-[#333]"
                          >
                            {expandedItemId === index ? (
                              <IoIosArrowUp />
                            ) : (
                              <IoIosArrowDown />
                            )}
                          </button>
                        )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item)}
                    className="
                            text-red-500 
                            text-lg md:text-xl lg:text-2xl"
                  >
                    <TiDelete />
                  </button>
                </div>
                {item.bundleItems &&
                  Array.isArray(item.bundleItems) &&
                  item.bundleItems.length > 0 &&
                  // hoveredItemId ===
                  expandedItemId === index && (
                    <div>
                      {item.bundleItems.map((bundleItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between border border-gray-100 bg-white rounded-lg mb-1 h-auto w-full shadow-sm overflow-hidden"
                        >
                          <div className="bg-gray-50 flex items-center justify-center w-[80px] h-[35px] border-r border-gray-100 mr-2.5">
                            <i>
                              <LuImage />
                            </i>
                          </div>
                          <span className="flex-grow text-[12px] text-[#333] pl-0 text-left font-semibold">
                            {bundleItem.bundle_item_name}
                          </span>
                          <button
                            onClick={() =>
                              handleDelete(bundleItem, true, index)
                            }
                            className="text-red-500 text-lg md:text-xl lg:text-2xl"
                          >
                            <TiDelete />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                {item.subitems &&
                  Array.isArray(item.subitems) &&
                  item.subitems.length > 0 &&
                  // hoveredItemId ===
                  expandedItemId === index && (
                    <div>
                      {item.subitems.map((bundleItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between border border-gray-100 bg-white rounded-lg mb-1 h-auto w-full min-w-[300px] shadow-sm overflow-hidden"
                        >
                          <div className="bg-gray-50 flex items-center justify-center w-[80px] h-[35px] border-r border-gray-100 mr-2.5">
                            <i>
                              <LuImage />
                            </i>
                          </div>
                          <span className="flex-grow text-[12px] text-[#333] pl-0 text-left font-semibold">
                            {bundleItem.item_name}
                          </span>
                          <button
                            onClick={() =>
                              handleDelete(bundleItem, true, index)
                            }
                            className="text-red-500 text-lg md:text-xl lg:text-2xl"
                          >
                            <TiDelete />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 border border-gray-200 shadow-sm p-4 rounded-xl bg-white max-h-96 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3">
          {portalMode !== "customer" && (
            <>
              <h5 className="text-black text-sm md:text-base">Discount Amount</h5>
              <div className="flex relative">
                <input
                  type="number"
                  min="0"
                  className={`bg-white border border-gray-200 shadow-sm h-10 py-2 px-7 rounded-lg w-full text-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                    !useAmount || !quotationNames[0]
                      ? "bg-gray-50 opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder="0.00"
                  value={additionalDiscountAmount}
                  disabled={!useAmount || !quotationNames[0]}
                  onFocus={() => setAddPercentage(true)}
                  onBlur={() => setAddPercentage(false)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (Number(value) >= 0) {
                      setadditionalDiscountAmount(value);
                    }
                  }}
                />

                <input
                  type="checkbox"
                  checked={useAmount}
                  onClick={handleAmountCheckboxChange}
                  disabled={!quotationNames[0]}
                  className="absolute accent-primary left-3 top-3 w-4 h-4 cursor-pointer"
                />
              </div>

              <h5 className="text-black text-sm md:text-base">
                Discount Percentage
              </h5>

              <div className="flex relative">
                <input
                  type="number"
                  className={`bg-white border border-gray-200 shadow-sm h-10 py-2 px-7 rounded-lg w-full text-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${
                    !usePercentage || !quotationNames[0]
                      ? "bg-gray-50 opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder="0.00"
                  min="0"
                  value={additionalDiscountPercentage}
                  disabled={!usePercentage || !quotationNames[0]}
                  onFocus={() => setAddDiscount(true)}
                  onBlur={() => setAddDiscount(false)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (Number(value) >= 0) {
                      setadditionalDiscountPercentage(value);
                    }
                  }}
                />
                <input
                  type="checkbox"
                  disabled={!quotationNames[0]}
                  checked={usePercentage}
                  onChange={handlePercentageCheckboxChange}
                  className="absolute accent-primary left-3 top-3 w-4 h-4 cursor-pointer"
                />
              </div>

              <button
                onClick={handleApplyDiscount}
                className={`mt-2 px-2 w-full py-2.5 font-medium rounded-lg transition-colors ${
                  !quotationNames[0]
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-primary text-white cursor-pointer hover:bg-primary-hover shadow-md"
                }`}
                disabled={!quotationNames[0]}
              >
                Apply Discount
              </button>
            </>
          )}
          <div
            className={`bg-gray-50 border border-gray-200 h-10 p-2 rounded-lg w-full flex items-center`}
          >
            <span className="text-gray-500 font-medium">Total:</span>
            <span className="ml-2 font-bold text-gray-900 text-base">
              Rs{" "}
              {typeof displayDiscount === "number"
                ? displayDiscount.toFixed(2)
                : typeof displayDiscount === "object" && displayDiscount?.total
                ? displayDiscount.total.toFixed(2)
                : 0}
            </span>
          </div>

          {portalMode !== "customer" && (
            <>
              <h5 className="text-black text-sm md:text-base">Delivery Boy</h5>
              <div className="relative">
                <button
                  onClick={() => setShowCustomDropdown(!showCustomDropdown)}
                  className="bg-white border border-gray-200 shadow-sm px-3 h-10 rounded-lg w-full flex items-center justify-between hover:border-primary/50 transition-colors"
                  placeholder="Select a delivery boy"
                >
                  <span className="text-gray-700 text-sm">
                    {selectedSalesPerson || "Select a delivery boy"}
                  </span>
                  <PiCaretUpDownLight className="text-gray-400" />
                </button>

                {showCustomDropdown && (
                  <div className="mt-2 space-y-2">
                    {loading ? (
                      <div className="text-gray-400 text-sm">Loading...</div>
                    ) : error ? (
                      <div className="text-red-500 text-sm">{error}</div>
                    ) : salesPersons.length > 0 ? (
                      salesPersons.map((person, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white border border-gray-100 hover:bg-gray-50 rounded-lg shadow-sm p-3 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedSalesPerson(person.sales_person_name);
                            setShowCustomDropdown(false);
                          }}
                        >
                          <IoMdPerson className="text-gray-500 text-lg" />
                          <span className="text-gray-800 font-medium text-sm">
                            {person.sales_person_name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 text-sm">
                        No sales persons found.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input
                type="text"
                className="bg-white border border-gray-200 shadow-sm px-3 h-10 rounded-lg w-full text-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Delivery Charges"
              />
              <input
                type="text"
                className="bg-white border border-gray-200 shadow-sm px-3 h-10 rounded-lg w-full text-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Tax"
              />
              {!salesAvailable && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="inclusiveTax"
                    checked={isInclusiveTax}
                    onChange={(e) => setIsInclusiveTax(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />

                  <label
                    htmlFor="inclusiveTax"
                    className="text-sm text-gray-700 font-medium"
                  >
                    Inclusive Tax
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            disabled={!quotationNames[0] || isCheckoutStarted}
            onClick={continueToCheckout}
            className={`p-3 rounded-lg w-full mt-2
              ${
                !quotationNames[0] || isCheckoutStarted
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-primary font-bold text-white hover:bg-primary-hover shadow-md transition-colors"
              }
            `}
          >
            Continue to Checkout
          </button>
          {isCheckoutStarted && !isOtpVerified && (
            <p className="text-sm text-gray-600">
              Resend after {Math.floor(timer / 60)}:
              {String(timer % 60).padStart(2, "0")} minutes
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex w-full">
              <input
                type="text"
                className="bg-white border border-gray-200 shadow-sm px-3 h-10 rounded-lg w-full pr-24 text-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Enter OTP"
                value={enteredOtp}
                onChange={handleOtpChange}
                disabled={isOtpVerified}
              />
              <button
                onClick={verifyOtp}
                disabled={!isOtpSent || isOtpVerified}
                className={`h-10 px-4 rounded-r-lg absolute right-0 top-0 font-medium transition-colors ${
                  isOtpVerified
                    ? "bg-green-500 text-white cursor-not-allowed"
                    : isOtpSent
                    ? "bg-primary text-white hover:bg-primary-hover"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isOtpVerified ? "Verified" : "Verify"}
              </button>
            </div>
          </div>

          <button
            onClick={confirmToCheckout}
            className={`mt-4 px-4 py-3 w-full rounded-lg text-sm transition-colors ${
              isOtpVerified
                ? "bg-primary font-bold text-white hover:bg-primary-hover shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed font-medium"
            }`}
            disabled={!isOtpVerified}
          >
            Confirm to Checkout
          </button>

          <QuotationSubmitModal
            isOpen={isClearCartModalOpen}
            onClose={() => setClearCartModalOpen(false)}
            onConfirm={confirmClearCart}
            onDelete={deleteClearCart}
            title="Clear Cart"
            message="Do you want to save this inquiry?"
          />

          <ConfirmCheckoutModal
            isOpen={isCheckoutModalOpen}
            onClose={() => setCheckoutModalOpen(false)}
            onConfirm={proceedCheckout}
            title="Confirm Checkout"
            message="Do you want to proceed with the checkout?"
            cancelMessage="Cancel"
            confirmMessage="Confirm"
          />

          <ConfirmCheckoutModal
            isOpen={isConfirmCheckoutOpen}
            onClose={() => setConfirmCheckoutOpen(false)}
            onConfirm={confirmCheckout}
            title="Confirm Checkout"
            message="Do you want to proceed with the checkout?"
            cancelMessage="Cancel"
            confirmMessage="Confirm"
          />
        </div>
      </div>
    </div>
  );
}

export default RentalCart;
