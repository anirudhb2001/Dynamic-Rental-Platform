import React, { useState, useEffect } from "react";
import { FrappeProvider } from "frappe-react-sdk";
import SideNav from "./component/Sidenav/SideNav";
import RentalAssetList from "./component/RentalAssetList/RentalAssetList";
import CardList from "./component/CardList";
import Header from "./component/Header/Header";
import RentalCart from "./component/RentalCart/RentalCart";
import Toast from "./component/ToastAlerts/Toast.jsx";
import dayjs from "dayjs";
import { VITE_AUTHENTICATION } from "../../constants.js";
import axios from "axios";
import { customerAuth } from "./services/customerAuth";

import {
  getCustomerDraftQuotations,
  createQuotation,
  getRentalAssetList,
  getItemAvailability,
  searchItems,
  getItemWarehouse,
  getProductBundleList,
  getBrandingSettings,
} from "./services/api.jsx";

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const portalMode = searchParams.get("mode") === "customer" ? "customer" : "admin";

  const [selectedBrands, setSelectedBrands] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedItemAvailStatus, setSelectedItemAvailStatus] = useState("");
  const [globalKpis, setGlobalKpis] = useState(null);
  const [activeComponent, setActiveComponent] = useState("rentalAssetList");
  const [isComponentSidenavVisible, setIsComponentSidenavVisible] =
    useState(true);
  const [totalAmountCart, settotalAmountCart] = useState([]);
  const [mainCartItems, setMainCartItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [pickupDate, setPickupDate] = useState(null);
  const [returnDate, setReturnDate] = useState(null);
  const [actual_returnDate, setActual_ReturnDate] = useState(null);
  const [adminSelectedCustomer, setAdminSelectedCustomer] = useState("");
  const [quantities, setQuantities] = useState({});
  const [quotationNames, setQuotationNames] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumbers, setPageNumbers] = useState({});
  const [activeTab, setActiveTab] = useState("rental");
  const [rentalItemsForRentalAssetList, setRentalItemsForRentalAssetList] = useState([]);
  const [isDateFieldDisabled, setDateFieldDisabled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isItemStatusDropOpen, setIsItemStatusDropOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rentalAssets, setCameras] = useState([]);
  const [error, setError] = useState(null);
  const [forceAvailable, setForceAvailable] = useState(false);
  const [financialData, setFinancialData] = useState([]);
  const [bookingEntryName, setBookingEntryName] = useState([]);
  const [salesAvailable, setSalesAvailable] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterDateStatus, setFilterDateStatus] = useState(null);
  const [allBookingData, setAllBookingData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPageBooking, setCurrentPageBooking] = useState(1);
  const [itemsState, setItemsState] = useState([]);
  const [extendpickupDate, setExtendPickupDate] = useState(null);
  const [extendreturnDate, setExtendReturnDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultPriceList, setDefaultPriceList] = useState(null);
  const [isUserWarehouse, setIsUserWarehouse] = useState(false);
  const [isSortActive, setIsSortActive] = useState(false);
  const [sortOption, setSortOption] = useState(null);
  const [user, setUser] = useState(null);
  const [userImage, setUserImage] = useState(null);
  const [stockQuantities, setStockQuantities] = useState({});
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState("");
  const [brandingData, setBrandingData] = useState({});

  const [authCustomerId, setAuthCustomerId] = useState(customerAuth.getCurrentCustomerId());
  const [isAuthenticated, setIsAuthenticated] = useState(customerAuth.isCustomerAuthenticated());
  const [customerDetails, setCustomerDetails] = useState(customerAuth.getCurrentCustomerDetails());

  useEffect(() => {
    const unsubscribe = customerAuth.subscribeToAuthChanges((state) => {
      setAuthCustomerId(state.customerId);
      setIsAuthenticated(state.isAuthenticated);
      setCustomerDetails(state.customerDetails);
    });
    return () => unsubscribe();
  }, []);

  const selectedCustomer = portalMode === "customer" ? authCustomerId : adminSelectedCustomer;
  const setSelectedCustomer = setAdminSelectedCustomer;

  const handleCustomerLogout = async () => {
    await customerAuth.logoutCustomer();
    sessionStorage.clear();
    setMainCartItems([]);
    setCartItems([]);
    setPickupDate(null);
    setReturnDate(null);
    setActual_ReturnDate(null);
    setQuantities({});
    setQuotationNames([]);
    settotalAmountCart(0);
    window.location.href = "/dashboard?mode=customer";
  };

  const hexToRgb = (hex) => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
      : null;
  };

  useEffect(() => {
    const fetchBranding = async () => {
      const data = await getBrandingSettings();
      if (data) {
        setBrandingData(data);
        if (data.company_name) setCompanyName(data.company_name);
        if (data.logo) setLogo(data.logo);
        
        if (data.primary_color) {
          const rgb = hexToRgb(data.primary_color);
          if (rgb) {
            document.documentElement.style.setProperty('--color-primary', rgb);
            document.documentElement.style.setProperty('--color-primary-hover', rgb);
          }
        }
        if (data.secondary_color) {
          const rgb = hexToRgb(data.secondary_color);
          if (rgb) {
            document.documentElement.style.setProperty('--color-secondary', rgb);
            document.documentElement.style.setProperty('--color-secondary-hover', rgb);
          }
        }
      }
    };
    fetchBranding();
  }, []);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await axios.get(
          `${VITE_AUTHENTICATION}/api/method/frappe.auth.get_logged_user`,
          {
            withCredentials: true,
          }
        );

        if (res.data.message && res.data.message !== "Guest") {
          const userId = res.data.message;

          const userInfo = await axios.get(
            `${VITE_AUTHENTICATION}/api/resource/User/${userId}`,
            {
              withCredentials: true,
            }
          );

          setUser(userInfo.data.data);
          setUserImage(userInfo.data.data?.user_image || null);
        } else if (portalMode !== "customer") {
          window.location.href = `${VITE_AUTHENTICATION}/login`;
        }
      } catch (error) {
        console.error("Error checking login:", error);
        if (portalMode !== "customer") {
          window.location.href = `${VITE_AUTHENTICATION}/login`;
        }
      }
    };

    checkLogin();
  }, []);

  const addToast = (text, type) => {
    setToasts((prev) => [...prev, { text, type }]);
    setTimeout(() => removeToast(0), 3000);
  };

  const removeToast = (index) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  };

  const getCSRFToken = () => {
    return window.csrf_token;
  };

  const formatDate = (date) => {
    if (!date) return null;
    const nativeDate = dayjs.isDayjs(date) ? date.toDate() : new Date(date);

    const year = nativeDate.getFullYear();
    const month = String(nativeDate.getMonth() + 1).padStart(2, "0");
    const day = String(nativeDate.getDate()).padStart(2, "0");
    const hours = String(nativeDate.getHours()).padStart(2, "0");
    const minutes = String(nativeDate.getMinutes()).padStart(2, "0");
    const seconds = String(nativeDate.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const findMatchingQuantity = (itemId, quantities) => {
    const matchingKey = Object.keys(quantities).find(
      (key) => key.toLowerCase() === itemId.toLowerCase()
    );
    return matchingKey
      ? quantities[matchingKey]
      : { quantity: 0, totalRate: 0 };
  };

  const getCartItemKey = (item) => {
    const itemId = item.id || item.item_name || item.rental_item_id || item.name || "";
    const priceList =
      item.price_list || item.pricelist_name || item.price_list_name || "";

    return `${itemId}::${priceList}`;
  };

  const mergeCartItemImages = (items, fallbackItems = []) => {
    const cartImageMap = new Map(
      [...mainCartItems, ...fallbackItems].map((cartItem) => [
        getCartItemKey(cartItem),
        cartItem.image || cartItem.item_image || "",
      ])
    );

    return items.map((item) => {
      const itemKey = getCartItemKey(item);

      return {
        ...item,
        image:
          item.image || item.item_image || cartImageMap.get(itemKey) || "",
      };
    });
  };

  const createQuotationHandler = async (items) => {
    const bookingDetails = items.map((item) => {
      const assetData = findMatchingQuantity(item.id, quantities);
      const { quantity, totalRate } = assetData;

      const stockQuantity =
        item.custom_is_bulk_item === 1
          ? stockQuantities[item.id] !== undefined
            ? stockQuantities[item.id]
            : item.stock_quantity || 1
          : 1;

      return {
        rental_item_id: item.id,
        item_name: item.id,
        pricelist_name: item.price_list,
        price: item.price,
        quantity: quantity,
        stock_quantity: stockQuantity,
        amount: totalRate,
        selected_subitems:
          item.bundleItems?.map((bundleItem) => ({
            item_code: bundleItem.bundle_item_code,
            quantity: quantity,
            stock_quantity: bundleItem.stock_quantity || 1,
          })) || [],
      };
    });

    const customPickupDate = formatDate(pickupDate);
    const customToDate = formatDate(returnDate);
    const customActualReturnDate = formatDate(actual_returnDate);

    const totalQuantity = items.reduce((acc, item) => {
      const assetData = findMatchingQuantity(item.id, quantities);
      return acc + (assetData.quantity || 0);
    }, 0);

    try {
      const csrfToken = getCSRFToken();
      const quotationResponse = await createQuotation(
        selectedCustomer,
        bookingDetails,
        totalQuantity,
        customPickupDate,
        customToDate,
        customActualReturnDate,
        csrfToken
      );

      if (quotationResponse) {
        // Update quotation names
        console.log("Quotation Response", quotationResponse);

setMainCartItems((prev) => [...prev, ...items]);
        setQuotationNames((prevQuotationNames) => [
          ...prevQuotationNames,
          quotationResponse.quotation_name,
        ]);

        // Fetch the updated draft quotations to get the real data
        const response = await getCustomerDraftQuotations(selectedCustomer);
        console.log("Draft Quotations", response);
        if (response.message && response.message.quotations) {
          const quotations = response.message.quotations;

          const quotationNames = quotations.map((quotation) => quotation.name);
          setQuotationNames(quotationNames);

          const formattedData = quotations.flatMap((quotation) =>
            quotation.custom_rental_items.map((item) => ({
              ...item,
              total: quotation.total,
              transaction_date: quotation.transaction_date,
            }))
          );
          setMainCartItems(mergeCartItemImages(formattedData, items));

          if (formattedData.length > 0) {
            setPickupDate(quotations[0].custom_rental_from_date);
            setReturnDate(quotations[0].custom_rental_to_date);
            setActual_ReturnDate(quotations[0].custom_actual_to_date);
          }
        }

        addToast("Item added to cart successfully", "success");
      }
    } catch (error) {
      console.error("Error creating quotation:", error);

      let errorMessage = "Failed to add item to cart";

      if (error.response) {
        const backendError = error.response.data;
        if (typeof backendError === "object" && backendError.message) {
          errorMessage = backendError.message;
        } else if (typeof backendError === "string") {
          errorMessage = backendError;
        }
      } else if (error.request) {
        errorMessage =
          "No response received from the server. Please check your network connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      addToast(errorMessage, "error");
    }
  };

  const handlePageChange = (newPage, priceListId) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPageNumbers((prev) => ({
        ...prev,
        [priceListId]: newPage,
      }));
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    if (mainCartItems.length > 0 || forceAvailable) {
      setDateFieldDisabled(true);
    } else if (mainCartItems.length === 0) {
      setDateFieldDisabled(false);
    }
  }, [mainCartItems, forceAvailable]);

  const toggleComponentSidenav = () => {
    setIsComponentSidenavVisible((prevState) => !prevState);
  };

  useEffect(() => {
    const savedTab = localStorage.getItem("activeTab");
    if (savedTab) {
      setActiveTab(savedTab);
      setActiveComponent(savedTab === "return" ? "cardList" : "rentalAssetList");
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveComponent(tab === "return" ? "cardList" : "rentalAssetList");
    localStorage.setItem("activeTab", tab);
  };

  const handleRedirectToRentalAssetList = (
    bookingEntryId,
    rentalItems,
    customerData,
    actualToDate,
    toDate
  ) => {
    setActiveComponent("rentalAssetList");
    setActiveTab("rental");
    setRentalItemsForRentalAssetList(rentalItems);

    const pickup = actualToDate
      ? dayjs(actualToDate, "DD/MM/YYYY hh:mm A")
      : null;

    const validatedToDate =
      toDate && dayjs(toDate)
        ? dayjs(toDate).format("MM/DD/YYYY hh:mm A")
        : null;

    setBookingEntryName(bookingEntryId);
    setPickupDate(pickup);
    setReturnDate(validatedToDate);
    setActual_ReturnDate(validatedToDate);
    setSelectedCustomer(customerData);
    setDateFieldDisabled(true);
    setForceAvailable(true);
    setSalesAvailable(true);
  };

  const fetchData = async (query = searchQuery) => {
    setLoading(true);
    try {
      const filters = {};

      if (selectedCategory) {
        filters.category_id = selectedCategory;
      }
      if (selectedBrands) {
        filters.brand_id = selectedBrands;
      }

      if (selectedWarehouse) {
        filters.warehouse = selectedWarehouse;
      }

      if (selectedPriceList) filters.price_list_id = selectedPriceList;

      if (query) {
        filters.item_name = query;
      }

      if (sortOption) {
        filters.sort_price = sortOption;
      }

      if (pickupDate) {
        filters.start_datetime = formatDate(pickupDate);
      }

      if (returnDate) {
        filters.end_datetime = formatDate(returnDate);
      } else if (actual_returnDate) {
        filters.end_datetime = formatDate(actual_returnDate);
      }

      if (selectedItemAvailStatus) {
        filters.status = selectedItemAvailStatus;
      }

      let rentalAssetListData = { items: [] };

      if (forceAvailable) {
        const response = await searchItems(query, selectedPriceList);
        rentalAssetListData.items = response;
      } else {
        rentalAssetListData = await getRentalAssetList({
          ...filters,
          page: currentPage,
          page_size: pageSize,
        });
      }

      const filteredItems = rentalItemsForRentalAssetList.length
        ? rentalAssetListData.items.filter((item) =>
            rentalItemsForRentalAssetList.some(
              (rentalItem) => rentalItem.rental_item_id === item.item_id
            )
          )
        : rentalAssetListData.items;

      let availabilityMap = {};

      if (!forceAvailable) {
        const formattedPickupDate = pickupDate ? formatDate(pickupDate) : "";
        const formattedReturnDate = actual_returnDate ? formatDate(actual_returnDate) : "";
        
        const availabilityResponse = await getItemAvailability(
          formattedPickupDate,
          formattedReturnDate
        );
        
        setGlobalKpis(availabilityResponse.kpis || null);
        const availabilityData = availabilityResponse["total items"] || [];

        availabilityMap = availabilityData.reduce((acc, item) => {
          acc[item.item_id] = {
            status: item.status,
            available_quantity: item.available_quantity
          };
          return acc;
        }, {});
      }

      const formattedData = filteredItems.map((item) => {
        const itemId = item.item_id || item.name;
        let itemStock = item.stock_qty ?? 0;
        let finalStatus = itemStock > 0 ? "Available" : "Unavailable";
        
        if (!forceAvailable && availabilityMap[itemId]) {
            finalStatus = availabilityMap[itemId].status;
            itemStock = availabilityMap[itemId].available_quantity;
        }

        if (portalMode === "customer" && finalStatus !== "Available") {
            finalStatus = "Currently Unavailable";
        }

        return {
          id: itemId,
          brand: item.brand_name || item.brand,
          name: item.item_name || item.name,
          status: finalStatus,
          price: item.price || 0,
          price_list: item.price_list_name || "N/A",
          image: item.item_image || "",
          description: item.item_description || "No description available",
          warehouses: item.warehouse_name,
          stock_quantity: itemStock,
          custom_is_bulk_item: item.custom_is_bulk_item,
        };
      });

      setCameras(formattedData);

      setTotalPages(
        forceAvailable
          ? 0
          : rentalAssetListData.pagination
          ? rentalAssetListData.pagination.total_pages
          : 0
      );
    } catch (err) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    rentalItemsForRentalAssetList,
    selectedCategory,
    selectedBrands,
    selectedWarehouse,
    selectedPriceList,
    currentPage,
    pickupDate,
    returnDate,
    actual_returnDate,
    sortOption,
    selectedItemAvailStatus,
  ]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      fetchData(searchQuery);
      setCurrentPage(1);
    }
  };

  const handleSearchClick = () => {
    fetchData(searchQuery);
    setCurrentPage(1);
  };

  const closeModal = () => {
    setIsCartOpen(false);
  };

  const handleContinueToCheckout = () => {
    if (cartItems.length > 0) {
      createQuotationHandler(cartItems);
      setMainCartItems((prevItems) => [...prevItems, ...cartItems]);
      closeModal();
      setCartItems([]);
    }
  };

  const handleDateChange = (type, date) => {
    if (!date) return;

    const selectedDate = dayjs(date);
    const isOnlyDateSelected =
      selectedDate.hour() === 0 &&
      selectedDate.minute() === 0 &&
      selectedDate.second() === 0;

    let dateWithTime;
    if (isOnlyDateSelected) {
      const now = dayjs();
      dateWithTime = selectedDate
        .hour(now.hour())
        .minute(now.minute())
        .second(now.second());
    } else {
      dateWithTime = selectedDate;
    }

    if (type === "pickup") {
      if (returnDate && dateWithTime > returnDate) {
        addToast("Pickup date cannot be after return date.", "error");
        return;
      }
      setPickupDate(dateWithTime);
    } else if (type === "return") {
      if (pickupDate && dateWithTime < pickupDate) {
        addToast("Return date cannot be before pickup date.", "error");
        return;
      }
      setReturnDate(dateWithTime);
      setActual_ReturnDate(dateWithTime);
    } else if (type === "actual_return") {
      if (returnDate && dateWithTime < returnDate) {
        addToast("Actual return date cannot be before return date.", "error");
        return;
      }
      setActual_ReturnDate(dateWithTime);
    }
  };

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const response = await getCustomerDraftQuotations(selectedCustomer);
        if (response.message && response.message.quotations) {
          const quotations = response.message.quotations;

          const quotationNames = quotations.map((quotation) => quotation.name);
          setQuotationNames(quotationNames);

          const formattedData = quotations.flatMap((quotation) =>
            quotation.custom_rental_items.map((item) => ({
              ...item,
              total: quotation.total,
              transaction_date: quotation.transaction_date,
            }))
          );
          setMainCartItems(mergeCartItemImages(formattedData));

          if (formattedData.length > 0) {
            setPickupDate(quotations[0].custom_rental_from_date);
            setReturnDate(quotations[0].custom_rental_to_date);
            setActual_ReturnDate(quotations[0].custom_actual_to_date);
          }
        }
      } catch (error) {
        // console.error("Error fetching quotations:", error);
        addToast("Error fetching quotations:", error, "error");
      }
    };

    if (selectedCustomer) {
      fetchQuotations();
    }
  }, [selectedCustomer]);

  const handleClearFilter = () => {
    if (mainCartItems.length > 0) {
      addToast(
        "Cannot clear Pickup, Return, and Actual Return fields because items exist in the cart.",
        "error"
      );
    } else {
      setPickupDate(null);
      setReturnDate(null);
      setActual_ReturnDate(null);
      setQuantities({});
    }
    setSelectedCategory("");
    setSelectedBrands("");
    setFilterCustomer(null);
    setFilterCustomer("");
    setFilterWarehouse("");
    setFinancialData(allBookingData);
    setExtendPickupDate(null);
    setExtendReturnDate(null);
    setFilterDateStatus(null);
    setSelectedItemAvailStatus("");
    setSortOption(null);
    if (!isUserWarehouse) {
      setSelectedWarehouse("");
    }
  };

  return (
    <div className="App">
      <FrappeProvider>
        <div className="App grid gap-2 grid-rows-[auto,1fr] min-h-screen font-barlow">
          <div className="w-full mb-2">
            <Header
              onButtonClick={toggleComponentSidenav}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleKeyDown={handleKeyDown}
              handleSearchClick={handleSearchClick}
              handleSearchChange={handleSearchChange}
              userImage={userImage}
              user={user}
              companyName={companyName}
              logo={logo}
              portalMode={portalMode}
              isAuthenticated={isAuthenticated}
              handleCustomerLogout={handleCustomerLogout}
              customerDetails={customerDetails}
            />
          </div>

          <div className="grid w-full relative grid-cols-12 gap-2">
            <div className="col-span-12 sm:col-span-3">
              {isComponentSidenavVisible && (
                <SideNav
                  companyName={companyName}
                  onTabChange={handleTabChange}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedBrands={selectedBrands}
                  setSelectedBrands={setSelectedBrands}
                  onDateChange={handleDateChange}
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  actualReturnDate={actual_returnDate}
                  onClearFilter={handleClearFilter}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isDateFieldDisabled={isDateFieldDisabled}
                  isDropdownOpen={isDropdownOpen}
                  setIsDropdownOpen={setIsDropdownOpen}
                  forceAvailable={forceAvailable}
                  filterCustomer={filterCustomer}
                  setFilterCustomer={setFilterCustomer}
                  allBookingData={allBookingData}
                  setFinancialData={setFinancialData}
                  setFilterWarehouse={setFilterWarehouse}
                  filterWarehouse={filterWarehouse}
                  setCurrentPageBooking={setCurrentPageBooking}
                  setSelectedWarehouse={setSelectedWarehouse}
                  selectedWarehouse={selectedWarehouse}
                  setCurrentPage={setCurrentPage}
                  extendpickupDate={extendpickupDate}
                  extendreturnDate={extendreturnDate}
                  setExtendPickupDate={setExtendPickupDate}
                  setExtendReturnDate={setExtendReturnDate}
                  isLoading={isLoading}
                  addToast={addToast}
                  setIsUserWarehouse={setIsUserWarehouse}
                  isUserWarehouse={isUserWarehouse}
                  setMainCartItems={setMainCartItems}
                  setIsDateDropdownOpen={setIsDateDropdownOpen}
                  filterDateStatus={filterDateStatus}
                  portalMode={portalMode}
                  isDateDropdownOpen={isDateDropdownOpen}
                  setFilterDateStatus={setFilterDateStatus}
                  selectedItemAvailStatus={selectedItemAvailStatus}
                  setSelectedItemAvailStatus={setSelectedItemAvailStatus}
                  setIsItemStatusDropOpen={setIsItemStatusDropOpen}
                  isItemStatusDropOpen={isItemStatusDropOpen}
                  branding={brandingData}
                />
              )}
            </div>

            <div
              className={`${
                activeComponent === "rentalAssetList"
                  ? "col-span-12 sm:col-span-6"
                  : "col-span-12 sm:col-span-9"
              }`}
            >
              {activeComponent === "rentalAssetList" ? (
                <RentalAssetList
                  stockQuantities={stockQuantities}
                  setStockQuantities={setStockQuantities}
                  setMainCartItems={setMainCartItems}
                  mainCartItems={mainCartItems}
                  onContinueToCheckout={handleContinueToCheckout}
                  cartItems={cartItems}
                  setCartItems={setCartItems}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  actual_returnDate={actual_returnDate}
                  selectedCustomer={selectedCustomer}
                  quantities={quantities}
                  setQuantities={setQuantities}
                  createQuotationHandler={createQuotationHandler}
                  setIsCartOpen={setIsCartOpen}
                  isCartOpen={isCartOpen}
                  addToast={addToast}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  pageNumbers={pageNumbers}
                  formatDate={formatDate}
                  selectedPriceList={selectedPriceList}
                  setSelectedPriceList={setSelectedPriceList}
                  loading={loading}
                  error={error}
                  rentalAssets={rentalAssets}
                  globalKpis={globalKpis}
                  branding={brandingData}
                  forceAvailable={forceAvailable}
                  portalMode={portalMode}
                  findMatchingQuantity={findMatchingQuantity}
                  setDefaultPriceList={setDefaultPriceList}
                  itemsState={itemsState}
                  setItemsState={setItemsState}
                  fetchData={fetchData}
                  isSortActive={isSortActive}
                  setIsSortActive={setIsSortActive}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                />
              ) : (
                <CardList
                  addToast={addToast}
                  onRedirectToRentalAssetList={handleRedirectToRentalAssetList}
                  financialData={financialData}
                  setFinancialData={setFinancialData}
                  setAllBookingData={setAllBookingData}
                  allBookingData={allBookingData}
                  setFilterCustomer={setFilterCustomer}
                  setIsDropdownOpen={setIsDropdownOpen}
                  currentPage={currentPageBooking}
                  setCurrentPage={setCurrentPageBooking}
                  extendpickupDate={extendpickupDate}
                  extendreturnDate={extendreturnDate}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  formatDate={formatDate}
                  fetchData={fetchData}
                />
              )}
            </div>

            {/* Rental Cart */}
            {activeComponent === "rentalAssetList" && (
              <div className="col-span-12 sm:col-span-3">
                <RentalCart
                  mainCartItems={mainCartItems}
                  setMainCartItems={setMainCartItems}
                  selectedCustomer={selectedCustomer}
                  quotationNames={quotationNames}
                  toasts={toasts}
                  addToast={addToast}
                  removeToast={removeToast}
                  totalAmountCart={totalAmountCart}
                  settotalAmountCart={settotalAmountCart}
                  financialData={financialData}
                  exbookingEntryName={bookingEntryName}
                  salesAvailable={salesAvailable}
                  setQuotationNames={setQuotationNames}
                  portalMode={portalMode}
                  fetchData={fetchData}
                />
              </div>
            )}
          </div>
          <Toast messages={toasts} removeToast={removeToast} />
        </div>
      </FrappeProvider>
    </div>
  );
}

export default App;
