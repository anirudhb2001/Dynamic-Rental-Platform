import Rentlist from "../RentList.jsx";
import { HiViewList } from "react-icons/hi";
import { useState, useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import {
  LuBike,
  LuCalendarClock,
  LuCheckCircle2,
  LuClock3,
  LuSearch,
  LuShoppingCart,
  LuSparkles,
  LuWrench,
} from "react-icons/lu";
import { FaPlus, FaMinus } from "react-icons/fa";
import CartModal from "../CartModal/CartModal.jsx";
import { BsArrowDownUp, BsGrid3X3Gap } from "react-icons/bs";
import RentalAssetDetails from "../RentalAssetDetails/RentalAssetDetails.jsx";
import Pagination from "../Pagination/Pagination.jsx";
import ConfirmCheckoutModal from "../ConfirmationModal/ConfirmCheckoutModal.jsx";
import dayjs from "dayjs";

import {
  getPriceLists,
  getProductBundleList,
  getPriceListQty,
  gettQtyReturn,
  getReservedBookingEntryData,
  getCustomerDraftQuotations,
} from "../../services/api.jsx";
import CancelBookingModal from "../ConfirmationModal/CancelBookingModal.jsx";

const RentalAssetList = ({
  stockQuantities,
  setStockQuantities,
  setMainCartItems,
  mainCartItems,
  onContinueToCheckout,
  cartModalItems,
  cartItems,
  setCartItems,
  pickupDate,
  returnDate,
  actual_returnDate,
  selectedCustomer,
  quantities,
  setQuantities,
  createQuotationHandler,
  setIsCartOpen,
  isCartOpen,
  addToast,
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
  setCurrentPage,
  formatDate,
  fetchData,
  selectedPriceList,
  setSelectedPriceList,
  loading,
  error,
  rentalAssets,
  globalKpis,
  branding,
  forceAvailable,
  setDefaultPriceList,
  itemsState,
  setItemsState,
  isSortActive,
  setIsSortActive,
  sortOption,
  setSortOption,
  portalMode,
}) => {
  const safeRentalAssets = Array.isArray(rentalAssets) ? rentalAssets : [];
  const safeMainCartItems = Array.isArray(mainCartItems) ? mainCartItems : [];
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const safeQuantities = quantities || {};
  const safePageNumbers = pageNumbers || {};
  const [activeTab, setActiveTab] = useState("grid");
  const [priceLists, setPriceLists] = useState([]);
  const [showRentOptions, setShowRentOptions] = useState(false);
  const [selectedAsset, setSelectedCamera] = useState(null);
  const [hasProductBundle, setHasProductBundle] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [reservedItemsModal, setReservedItemsModal] = useState(false);
  const [reservedData, setReservedData] = useState([]);
  const [loadingReservedData, setLoadingReservedData] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [hideAddToCartButton, setHideAddToCartButton] = useState(false);
  const [loadingQuantities, setLoadingQuantities] = useState(false);
  useEffect(() => {
    const initialStockQty = {};
    safeRentalAssets.forEach((asset) => {
      if (asset.custom_is_bulk_item === 1) {
        initialStockQty[asset.id] = asset.stock_qty || asset.stock_quantity;
      }
    });
    setStockQuantities(initialStockQty);
  }, [rentalAssets]);

  const handleStockQuantityChange = (assetId, delta) => {
    setStockQuantities((prev) => {
      const currentStock = prev[assetId];
      const asset = safeRentalAssets.find((c) => c.id === assetId);
      const maxStock = asset?.stock_quantity || 1;

      const current = currentStock !== undefined ? currentStock : maxStock;
      const newStock = Math.max(1, Math.min(maxStock, current + delta));

      return {
        ...prev,
        [assetId]: newStock,
      };
    });
  };
  useEffect(() => {
    const fetchPriceLists = async () => {
      try {
        const data = await getPriceLists();
        const enabledPriceLists = data.filter(
          (priceList) => priceList.enabled === 1
        );
        setPriceLists(enabledPriceLists);

        // Try to find a price list with custom_valid_hour === 24
        const valid24 = enabledPriceLists.find(
          (priceList) => priceList.custom_valid_hour === 24
        );

        if (valid24) {
          setSelectedPriceList(valid24.price_list_name);
        } else if (enabledPriceLists.length > 0) {
          setSelectedPriceList(enabledPriceLists[0].price_list_name);
        }
      } catch (err) {
        console.error("Error fetching price lists:", err);
      }
    };

    fetchPriceLists();
  }, []);

  const getDefaultPriceList = () => {
    if (!pickupDate || !returnDate || priceLists.length === 0) return null;

    const pickup = dayjs(pickupDate);
    const returnD = dayjs(returnDate);
    const diffHours = returnD.diff(pickup, "hour");

    const sorted = [...priceLists].sort(
      (a, b) => b.custom_valid_hour - a.custom_valid_hour
    );

    for (let priceList of sorted) {
      if (diffHours >= priceList.custom_valid_hour) {
        return priceList.price_list_name;
      }
    }

    return sorted[sorted.length - 1]?.price_list_name || null;
  };

  useEffect(() => {
    const defaultPrice = getDefaultPriceList();
    if (defaultPrice) {
      setDefaultPriceList(defaultPrice);
      setSelectedPriceList(defaultPrice);
    }
  }, [pickupDate, returnDate, priceLists]);

  const handlePriceListChange = (priceList) => {
    setSelectedPriceList(priceList);
    const pageForPriceList = safePageNumbers[priceList] || 1;
    setCurrentPage(pageForPriceList);
  };

  const toggleSort = () => setIsSortActive(!isSortActive);

  const openModal = async (asset) => {
    const status = getAssetStatus(asset);

    if (status === "reserved") {
      setSelectedItemName(asset.name);
      setConfirmModal(true);
      return;
    }

    if (status === "rented") {
      addToast("This item is already rented by another customer.", "error");
      return;
    }

    const assetData = safeQuantities[asset.id] || { quantity: 0, totalRate: 0 };
    const { quantity, totalRate } = assetData;

    if (
      pickupDate &&
      returnDate &&
      new Date(pickupDate).getTime() === new Date(returnDate).getTime()
    ) {
      addToast(
        "Return date and time must be later than Pickup date and time.",
        "error"
      );
      return;
    }
    if (!selectedCustomer) {
      addToast("Please select a customer before adding to the cart.", "error");
      return;
    }

    if (!quantity || quantity <= 0) {
      addToast(
        "Please choose pickup date and return date before adding to the cart.",
        "error"
      );
      return;
    }

    if (!actual_returnDate) {
      addToast(
        "Please choose actual return date before adding to the cart.",
        "error"
      );
      return;
    }

    if (!asset.stock_quantity || asset.stock_quantity <= 0) {
      addToast(
        "Insufficient stock. This item is currently out of stock and cannot be added to the cart.",
        "error"
      );
      return;
    }

    if (new Date(actual_returnDate) < new Date(returnDate)) {
      addToast("Actual return date cannot be before return date.", "error");
    }

    try {
      const response = await getProductBundleList();
      const productBundles = Array.isArray(response?.message)
        ? response.message
        : [];

      const bundleData = productBundles.find(
        (bundle) => bundle.new_item_code === asset.id
      );

      const bundleExistsInCart = safeMainCartItems.some(
        (item) => item.id === asset.id && item.price_list === asset.price_list
      );

      if (bundleExistsInCart) {
        setHasProductBundle(false);
        addToast("This item already exists in your cart.", "error");
        return;
      }

      const draftQuotationsResponse = await getCustomerDraftQuotations(
        selectedCustomer
      );

      const existingQuotationItems =
        draftQuotationsResponse.message?.quotations?.flatMap((quotation) =>
          (quotation.custom_rental_items || []).map((item) => item.item_name)
        ) || [];

      const itemExistsInDraftQuotations = existingQuotationItems.includes(
        asset.id
      );

      if (itemExistsInDraftQuotations) {
        addToast("This item already exists in your cart.", "error");
        return;
      } else if (bundleData) {
        setSelectedCamera({ ...asset, bundleData });
        setHasProductBundle(true);
      } else {
        setHasProductBundle(false);

        const newItem = {
          id: asset.id,
          name: asset.name,
          brand: asset.brand,
          price: asset.price,
          image: asset.image,
          price_list: asset.price_list,
          quantity: quantity,
          amount: totalRate,
          item_name: asset.id,
          custom_is_bulk_item: asset.custom_is_bulk_item,
          stock_quantity: asset.stock_quantity,
        };
        const itemExists = safeMainCartItems.some(
          (item) =>
            item.id === newItem.id && item.price_list === newItem.price_list
        );

     if (itemExists || itemExistsInDraftQuotations) {
  addToast("This item already exist in your cart", "error");
} else {
  console.log("BOOK NOW CLICKED", newItem);

  await createQuotationHandler([newItem]);

  console.log("Quotation Handler Finished");
}
      }
    } catch (error) {
      console.error("Error fetching product bundle data:", error);
    }
  };

  const createQuotationForAllCameras = (rentalAssetList) => {
    if (!selectedCustomer) {
      addToast("Please select a customer before adding to the cart.", "error");
      return;
    }

    if (!rentalAssetList || rentalAssetList.length === 0) {
      addToast("No items available to create quotations.", "error");
      return;
    }

    const validatedItems = rentalAssetList.map((asset) => {
      const assetData = safeQuantities[asset.id] || { quantity: 0, totalRate: 0 };
      const { quantity, totalRate } = assetData;

      if (!quantity || quantity <= 0) {
        addToast(
          `Please choose pickup and return dates for ${asset.name} before adding to the cart.`,
          "error"
        );
        return null;
      }

      return {
        id: asset.id,
        name: asset.name,
        brand: asset.brand,
        price: asset.price,
        image: asset.image,
        price_list: asset.price_list,
        quantity: quantity,
        amount: totalRate,
        item_name: asset.id,
        bundleItems: asset.bundleItems || [],
      };
    });

    const filteredItems = validatedItems.filter(Boolean);

    if (filteredItems.length > 0) {
      createQuotationHandler(filteredItems);
      setHideAddToCartButton(true);
    }
  };

  const handleConfirm = async () => {
    setLoadingReservedData(true);
    setReservedItemsModal(true);
    setConfirmModal(false);

    const formattedPickupDate = formatDate(pickupDate);
    const formattedReturnDate = formatDate(actual_returnDate);

    try {
      const reservedData = await getReservedBookingEntryData(
        Array.isArray(selectedItemName) ? selectedItemName : [selectedItemName],
        formattedPickupDate,
        formattedReturnDate
      );

      if (reservedData) {
        setReservedData(reservedData);
      }
    } catch (error) {
      addToast(
        error.message || "An error occurred while fetching reserved data.",
        "error"
      );
    } finally {
      setLoadingReservedData(false);
    }
  };

  const closeModal = () => {
    setSelectedCamera(null);
    setHasProductBundle(false);
  };

  const toggleRentOptions = () => {
    setShowRentOptions(!showRentOptions);
  };

  const addToCart = (asset) => {
    const assetData = safeQuantities[asset.id] || { quantity: 0, totalRate: 0 };
    const { quantity, totalRate } = assetData;

    const newItem = {
      id: asset.id,
      name: asset.name,
      brand: asset.brand,
      price: asset.price,
      image: asset.image,
      price_list: asset.price_list,
      bundleItems: asset.bundleItems || [],
      quantity: quantity,
      amount: totalRate,
      item_name: asset.name,
    };

    setCartItems([newItem]);
    setIsCartOpen(true);
  };

  const closeCart = () => setIsCartOpen(false);

  const formatDisplayDate = (date) =>
    date ? dayjs(date).format("DD MMM YYYY, hh:mm A") : "Not selected";

  const getAssetStatus = (asset) => {
    return (asset?.status || "unknown").toLowerCase();
  };

  const getStatusClasses = (status) => {
    switch ((status || "").toLowerCase()) {
      case "available":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "reserved":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
      case "on ride":
      case "rented":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";
      case "maintenance":
      case "unavailable":
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
      default:
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    }
  };

  const assetStats = globalKpis || safeRentalAssets.reduce(
    (stats, asset) => {
      const status = getAssetStatus(asset);

      stats.total += 1;
      if (status === "available") stats.available += 1;
      if (status === "reserved") stats.reserved += 1;
      if (status === "rented") stats.onRide += 1;
      if (status === "maintenance" || status === "unavailable") {
        stats.maintenance += 1;
      }

      return stats;
    },
    {
      total: 0,
      available: 0,
      reserved: 0,
      onRide: 0,
      maintenance: 0,
    }
  );

  const cartCount = safeCartItems.length;

  const kpiCards = [
    {
      label: "Total Bikes",
      value: assetStats.total,
      icon: LuBike,
      accent: "bg-slate-900 text-white",
      glow: "shadow-slate-200",
    },
    {
      label: "Available",
      value: assetStats.available,
      icon: LuCheckCircle2,
      accent: "bg-emerald-500 text-white",
      glow: "shadow-emerald-100",
    },
    {
      label: "Reserved",
      value: assetStats.reserved,
      icon: LuClock3,
      accent: "bg-amber-500 text-white",
      glow: "shadow-amber-100",
    },
    {
      label: "On Ride",
      value: assetStats.onRide,
      icon: LuBike,
      accent: "bg-red-500 text-white",
      glow: "shadow-red-100",
    },
    {
      label: "Maintenance",
      value: assetStats.maintenance,
      icon: LuWrench,
      accent: "bg-sky-500 text-white",
      glow: "shadow-sky-100",
    },
  ];

  const fetchQuantities = async () => {
    if (!pickupDate || !returnDate) return;

    setLoadingQuantities(true);
    try {
      const formattedPickupDate = formatDate(pickupDate);
      const formattedReturnDate = formatDate(returnDate);

      const quantityPromises = safeRentalAssets.map((asset) =>
        getPriceListQty(
          asset.id,
          selectedPriceList,
          formattedPickupDate,
          formattedReturnDate
        )
      );

      const results = await Promise.all(quantityPromises);

      const updatedQuantities = results.reduce((acc, result, index) => {
        const assetId = safeRentalAssets[index].id;

        acc[assetId] = {
          quantity: result?.quantity ?? 0,
          totalRate: result?.total_rate ?? 0,
        };

        return acc;
      }, {});

      setQuantities(updatedQuantities);
    } catch (error) {
      console.error("Error fetching quantities for rentalAssets:", error);
    } finally {
      setLoadingQuantities(false);
    }
  };

  // const fetchReturnQuantities = async () => {
  //   if (!pickupDate || !returnDate) return;

  //   setLoadingQuantities(true);
  //   try {
  //     const formattedPickupDate = formatDate(pickupDate);
  //     const formattedActaulReturnDate = formatDate(actual_returnDate);

  //     const quantityPromises = rentalAssets.map((asset) =>
  //       gettQtyReturn(
  //         asset.id,
  //         selectedPriceList,
  //         formattedPickupDate,
  //         formattedActaulReturnDate
  //       )
  //     );

  //     const results = await Promise.all(quantityPromises);

  //     const updatedQuantities = results.reduce((acc, result, index) => {
  //       const assetId = rentalAssets[index].id;
  //       const quantity =
  //         result && result["the quantity"] !== undefined
  //           ? result["the quantity"]
  //           : 0;
  //       const totalRate =
  //         result && result["the total rate "] !== undefined
  //           ? result["the total rate "]
  //           : 0;
  //       acc[assetId] = { quantity, totalRate };
  //       return acc;
  //     }, {});

  //     // setQuantities(updatedQuantities);
  //   } catch (error) {
  //     console.error("Error fetching quantities for rentalAssets:", error);
  //   } finally {
  //     setLoadingQuantities(false);
  //   }
  // };

  const handleExtendButton = () => {
    if (safeMainCartItems.length > 0) {
      addToast("Please clear the cart before extending the booking.");
    } else {
      createQuotationForAllCameras(safeRentalAssets);
    }
  };

  useEffect(() => {
    if (pickupDate && returnDate) {
      fetchQuantities();
    }
  }, [pickupDate, returnDate, rentalAssets, selectedPriceList]);

  // useEffect(() => {
  //   if (pickupDate && actual_returnDate) {
  //     fetchReturnQuantities();
  //   }
  // }, [pickupDate, actual_returnDate, rentalAssets, selectedPriceList]);

  if (error) return <h4>Error: {error}</h4>;

  return (
    <div className="flex justify-center items-center font-barlow">
      <div className="w-full main-container">
        <div className="space-y-5 p-2 sm:p-3">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-primary px-5 py-6 text-white shadow-xl shadow-slate-200 sm:px-7 sm:py-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute bottom-0 right-8 hidden h-24 w-48 rounded-t-full bg-white/10 blur-2xl sm:block"></div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80 ring-1 ring-white/15">
  <LuSparkles className="h-3.5 w-3.5" />
  Premium {branding?.asset_label || "Rental"} Rentals
</div>
                <h1>
                {branding?.hero_title || "Find Your Perfect Ride"}
              </h1>
                      <p className="mt-2 max-w-2xl text-sm font-medium text-white/70 sm:text-base">
                 {branding?.hero_subtitle || ""}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-xl ring-1 ring-white/15">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/60">
                    <LuCalendarClock className="h-4 w-4" />
                    Pickup
                  </div>
                  <p className="mt-2 text-sm font-bold text-white">
                    {formatDisplayDate(pickupDate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-xl ring-1 ring-white/15">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/60">
                    <LuCalendarClock className="h-4 w-4" />
                    Return
                  </div>
                  <p className="mt-2 text-sm font-bold text-white">
                    {formatDisplayDate(returnDate)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-slate-950 shadow-lg">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                     AVAILABLE {((branding?.asset_label || "Asset").toUpperCase())}S
                  </div>
                  <p className="mt-1 text-3xl font-black">
                    {assetStats.available}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {portalMode !== "customer" && (
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {kpiCards.map(({ label, value, icon: Icon, accent, glow }) => (
                <div
                  key={label}
                  className={`rounded-3xl border border-slate-100 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${glow}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950">
                        {value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {loading || loadingQuantities ? (
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="h-10 w-36 animate-pulse rounded-full bg-slate-100"></div>
                  <div className="flex gap-2">
                    <div className="h-10 w-24 animate-pulse rounded-full bg-slate-100"></div>
                    <div className="h-10 w-24 animate-pulse rounded-full bg-slate-100"></div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft"
                  >
                    <div className="h-44 animate-pulse bg-slate-100"></div>
                    <div className="space-y-3 p-5">
                      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-100"></div>
                      <div className="h-6 w-4/5 animate-pulse rounded-full bg-slate-100"></div>
                      <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100"></div>
                      <div className="flex items-center justify-between pt-3">
                        <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100"></div>
                        <div className="h-10 w-28 animate-pulse rounded-full bg-slate-100"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white/85 p-3 shadow-soft backdrop-blur-xl">
                <div className="flex flex-1 items-center gap-2 flex-wrap rent-options-container">
              <div className="relative inline-block text-left">
                <button
                  className={`flex items-center justify-center px-4 py-2 text-xs rounded-full gap-1.5 transition-all duration-300 shadow-sm ${
                    isSortActive || sortOption
                      ? "bg-primary text-white font-bold shadow-md shadow-primary/30"
                      : "bg-white text-slate-700 border border-slate-100 hover:border-primary/30 hover:text-primary hover:shadow-md"
                  }`}
                  onClick={toggleSort}
                >
                  <BsArrowDownUp />
                  Sort
                  <IoIosArrowDown />
                </button>

                {isSortActive && (
                  <div className="absolute mt-2 w-40 rounded-2xl shadow-lg bg-white/95 backdrop-blur-xl border border-slate-100 z-20 overflow-hidden">
                    <div className="py-2 text-xs text-slate-700">
                      <button
                        className={`block px-4 py-2 w-full text-left transition-colors ${
                          !sortOption
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setSortOption(null);
                          setIsSortActive(false);
                        }}
                      >
                        Default
                      </button>
                      <button
                        className={`block px-4 py-2 w-full text-left transition-colors ${
                          sortOption === "low_to_high"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setSortOption("low_to_high");
                          setIsSortActive(false);
                        }}
                      >
                        Price: Low to High
                      </button>
                      <button
                        className={`block px-4 py-2 w-full text-left transition-colors ${
                          sortOption === "high_to_low"
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          setSortOption("high_to_low");
                          setIsSortActive(false);
                        }}
                      >
                        Price: High to Low
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 rent-duration-buttons">
                {priceLists
                  .filter((priceList) => {
                    if (!pickupDate || !returnDate) return true;

                    const diffHours = dayjs(returnDate).diff(
                      dayjs(pickupDate),
                      "hour"
                    );

                    const shouldHide =
                      diffHours >= 24 && priceList.custom_valid_hour < 24;

                    return priceList.enabled === 1 && !shouldHide;
                  })
                  .map((priceList) => (
                    <button
                      key={priceList.price_list_name}
                      onClick={() =>
                        handlePriceListChange(priceList.price_list_name)
                      }
                      className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 shadow-sm ${
                        selectedPriceList === priceList.price_list_name
                          ? "bg-primary text-white shadow-md shadow-primary/30"
                          : "bg-white text-slate-600 border border-slate-100 hover:border-primary/30 hover:text-primary hover:shadow-md"
                      }`}
                    >
                      {priceList.price_list_name}
                    </button>
                  ))}
              </div>
            </div>

                <div className="flex items-center justify-end w-full gap-2 list-view-container sm:w-auto">
              {forceAvailable && (
                <button
                  className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-full shadow-md shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-hover transition-all"
                  onClick={handleExtendButton}
                >
                  Add All Items to Cart
                </button>
              )}
              <div className="flex bg-white border border-slate-100 p-1 rounded-full shadow-sm">
                <button
                  onClick={() => setActiveTab("grid")}
                  className={`text-lg cursor-pointer transition-all duration-300 p-2 rounded-full view-button ${
                    activeTab === "grid"
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <BsGrid3X3Gap />
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={`text-xl cursor-pointer transition-all duration-300 p-2 rounded-full view-button ${
                    activeTab === "list"
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <HiViewList />
                </button>
              </div>
            </div>
              </section>

            {activeTab === "grid" && (
                <section className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {safeRentalAssets.length > 0 ? (
                  safeRentalAssets.map((asset, index) => {
                    const assetData = safeQuantities[asset.id] || { quantity: 0 };
                    const status = getAssetStatus(asset);
                    const stockQty =
                      stockQuantities[asset.id] !== undefined
                        ? stockQuantities[asset.id]
                        : asset.custom_is_bulk_item === 1
                        ? asset.stock_quantity
                        : 1;
                    return (
                      <div
                        key={index}
                          className="group relative flex min-h-[380px] cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white text-left font-barlow shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-xl"
                        onClick={() => {
                          if (!forceAvailable) {
                            openModal(asset);
                          }
                        }}
                      >
                          <div className="absolute left-4 top-4 z-10">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${getStatusClasses(
                                status
                              )}`}
                            >
                              {status === "rented"
                                ? "On Ride"
                                : status === "unavailable"
                                ? "Maintenance"
                                : asset.status || "Unavailable"}
                            </span>
                          </div>
                          <div className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-primary shadow-md backdrop-blur transition-transform group-hover:scale-110">
                            <LuBike className="h-5 w-5" />
                          </div>
                          <div className="relative flex h-52 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-primary/10">
                            <div className="absolute bottom-0 h-20 w-full bg-gradient-to-t from-white to-transparent"></div>
                            <div className="absolute h-36 w-36 rounded-full bg-primary/10 blur-3xl"></div>
                            <img
                              src={asset.image}
                              className="relative z-10 max-h-[168px] w-auto object-contain drop-shadow-xl transition-all duration-500 group-hover:scale-105"
                              alt={asset.name}
                            />
                          </div>

                          <div className="flex flex-1 flex-col p-5">
                          <div
                              className="min-w-0"
                            title={
                              asset.brand
                                ? `${asset.brand} ${asset.name}`
                                : asset.name
                            }
                          >
                              <p className="truncate text-xs font-black uppercase tracking-wide text-primary">
                                {asset?.brand || "Bike Rental"}
                              </p>
                              <h3 className="mt-1 line-clamp-2 text-lg font-black leading-snug text-slate-950">
                                {asset.name}
                              </h3>
                          </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    status === "available"
                                      ? "bg-emerald-500"
                                      : status === "reserved"
                                      ? "bg-amber-500"
                                      : status === "on ride" || status === "rented"
                                      ? "bg-red-500"
                                      : "bg-sky-500"
                                  }`}
                                ></span>
                                <span className="text-xs font-bold text-slate-500">
                                  {status === "available"
                                    ? "Ready to book"
                                    : status === "reserved"
                                    ? "Reserved slot"
                                    : status === "on ride" || status === "rented"
                                    ? "Currently on ride"
                                    : status === "maintenance"
                                    ? "Under maintenance"
                                    : "Unavailable"}
                                </span>
                              </div>
                              {asset.custom_is_bulk_item === 1 && (
                                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
                                  Bulk
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                              <p className="text-xs font-bold text-slate-500">
                                Available Stock{" "}
                              <strong
                                className={
                                  asset.stock_quantity <= 0
                                    ? "text-red-500"
                                    : "text-slate-800"
                                }
                              >
                                {Math.max(asset.stock_quantity ?? 0, 0)}
                              </strong>
                            </p>
                            </div>

                          {asset.custom_is_bulk_item == 1 && (
                            <div
                                className="mt-3 w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-1.5 px-3 shadow-sm">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    Select Qty
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStockQuantityChange(asset.id, -1);
                                    }}
                                    disabled={stockQty <= 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
                                  >
                                    <FaMinus className="w-3 h-3" />
                                  </button>
                                  <span className="text-sm font-bold min-w-[24px] text-center text-slate-900">
                                    {stockQty}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStockQuantityChange(asset.id, 1);
                                    }}
                                    disabled={stockQty >= asset.stock_quantity}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
                                  >
                                    <FaPlus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  {asset.price_list || selectedPriceList}
                                </p>
                                <p className="text-2xl font-black text-slate-950">
                                  <span className="text-primary">₹</span>
                                  {asset.price}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={getAssetStatus(asset) !== "available"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("BOOK CLICKED", asset);
                                  if (portalMode === "customer") {
                                    addToast("OTP Login functionality coming soon!", "info");
                                  } else if (!forceAvailable) {
                                    openModal(asset);
                                  }
                                }}
                                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black text-white shadow-md transition-all ${
                                  getAssetStatus(asset) !== "available"
                                    ? "bg-slate-300 shadow-none cursor-not-allowed"
                                    : "bg-primary shadow-primary/30 hover:-translate-y-0.5 hover:bg-primary-hover"
                                }`}
                              >
                                {portalMode === "customer" 
                                  ? (getAssetStatus(asset) === "available" ? "Login to Book" : "Currently Unavailable") 
                                  : "Book Now"}
                              </button>
                            </div>
                          </div>
                        </div>
                    );
                  })
                ) : (
                    <div className="col-span-full flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-soft">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <LuSearch className="h-9 w-9" />
                      </div>
                      <h3 className="mt-5 text-2xl font-black text-slate-950">
                        No Bikes Found
                      </h3>
                      <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                        Try changing the selected dates, rental plan, or
                        filters to discover more rides.
                      </p>
                      <button
                        type="button"
                        onClick={fetchData}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary"
                      >
                        <LuSearch className="h-4 w-4" />
                        Search Again
                      </button>
                    </div>
                )}
                {hasProductBundle && selectedAsset && (
                  <RentalAssetDetails
                    asset={selectedAsset}
                    onClose={closeModal}
                    onAddToCart={addToCart}
                    itemsState={itemsState}
                    setItemsState={setItemsState}
                  />
                )}

                {isCartOpen && (
                  <CartModal
                    cartItems={safeCartItems}
                    cartModalItems={cartModalItems}
                    closeCart={closeCart}
                    onContinueToCheckout={onContinueToCheckout}
                    Quantity={safeQuantities}
                  />
                )}
                </section>
            )}
            {activeTab === "list" && (
              <section className="rounded-3xl border border-slate-100 bg-white p-3 shadow-soft">
                <Rentlist
                rentalAssets={safeRentalAssets}
                  quantities={safeQuantities}
                  openModal={openModal}
                  hasProductBundle={hasProductBundle}
                  selectedAsset={selectedAsset}
                  closeModal={closeModal}
                  addToCart={addToCart}
                  cartItems={safeCartItems}
                  isCartOpen={isCartOpen}
                  cartModalItems={cartModalItems}
                  closeCart={closeCart}
                  onContinueToCheckout={onContinueToCheckout}
                  itemsState={itemsState}
                  setItemsState={setItemsState}
                />
              </section>
            )}
            </>
          )}
        </div>
        {totalPages > 1 && !loading && !loadingQuantities && (
          <div className="pagination-container mb-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              selectedPriceList={selectedPriceList}
            />
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-3 rounded-full bg-slate-950 px-5 text-white shadow-2xl shadow-slate-400/40 transition-all hover:-translate-y-1 hover:bg-primary"
        >
          <span className="relative">
            <LuShoppingCart className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white ring-2 ring-slate-950">
              {cartCount}
            </span>
          </span>
          <span className="hidden text-sm font-black sm:inline">Cart</span>
        </button>
      )}
      <ConfirmCheckoutModal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm"
        message="This item is already reserved. Do you want see details?"
        cancelMessage="No"
        confirmMessage="Yes"
        onConfirm={handleConfirm}
      />
      <CancelBookingModal
        isOpen={reservedItemsModal}
        onClose={() => setReservedItemsModal(false)}
        title="Reserved Booking Details"
        loadingReservedData={loadingReservedData}
        reservedData={reservedData}
        addToast={addToast}
        fetchData={fetchData}
      />
    </div>
  );
};

export default RentalAssetList;