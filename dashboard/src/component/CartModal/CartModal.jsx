import React, { useState } from "react";
import {
  LuBike,
  LuChevronDown,
  LuChevronRight,
  LuImage,
  LuPackageCheck,
  LuShoppingCart,
  LuSparkles,
  LuX,
} from "react-icons/lu";

const CartModal = ({ cartItems, closeCart, Quantity, onContinueToCheckout }) => {
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const [hoveredItemId, setHoveredItemId] = useState(null);

  const handleMouseEnter = (itemId) => {
    setHoveredItemId((current) => (current === itemId ? null : itemId));
  };

  const handleMouseLeave = () => {};

  const estimatedRentalCost = safeCartItems.reduce((total, item) => {
    const amount = Number(item.amount ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    return total + amount * (Number.isFinite(quantity) ? quantity : 1);
  }, 0);

  const getStatusClasses = (status) => {
    switch ((status || "available").toLowerCase()) {
      case "available":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "reserved":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
      case "rented":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";
      case "maintenance":
      case "unavailable":
        return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
      default:
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      onClick={closeCart}
    >
      <aside
        className="flex h-full w-full max-w-[420px] animate-[slideInCart_220ms_ease-out] flex-col overflow-hidden rounded-l-none bg-slate-50 shadow-2xl sm:rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <style>
          {`
            @keyframes slideInCart {
              from { transform: translateX(100%); opacity: 0.7; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}
        </style>

        <header className="border-b border-white/70 bg-white/90 px-5 py-5 shadow-sm backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
                <LuShoppingCart className="h-3.5 w-3.5" />
                Rental Cart
              </div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                Selected Bikes
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {safeCartItems.length} bike{safeCartItems.length === 1 ? "" : "s"} ready
                for checkout
              </p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-md"
              onClick={closeCart}
              aria-label="Close cart"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {safeCartItems.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-soft">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/15 to-slate-100 text-primary">
                <LuBike className="h-12 w-12" />
              </div>
              <h3 className="mt-6 text-2xl font-black text-slate-950">
                No Bikes Selected
              </h3>
              <p className="mt-2 max-w-xs text-sm font-medium text-slate-500">
                Browse bikes and add them to your cart.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeCartItems.map((item, index) => {
                const isExpanded = hoveredItemId === index;
                const itemQuantity = Quantity?.[item.id]?.quantity;
                const bundleCount = Array.isArray(item.bundleItems)
                  ? item.bundleItems.length
                  : 0;

                return (
                  <article
                    key={index}
                    className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-primary/10">
                        {item.image ? (
                          <img
                            src={item.image}
                            className="max-h-20 w-auto object-contain drop-shadow-lg"
                            alt={item.name}
                          />
                        ) : (
                          <LuImage className="h-9 w-9 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black uppercase tracking-wide text-primary">
                              {item.brand || "Bike Rental"}
                            </p>
                            <h3 className="mt-1 line-clamp-2 text-base font-black leading-snug text-slate-950">
                              {item.name}
                            </h3>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClasses(
                              item.status
                            )}`}
                          >
                            {item.status || "Available"}
                          </span>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              {item.price_list || "Rental"}
                            </p>
                            <p className="text-lg font-black text-slate-950">
                              <span className="text-primary">₹</span>
                              {item.amount ?? item.price}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            Qty {itemQuantity ?? item.quantity ?? 1}
                          </span>
                        </div>
                      </div>
                    </div>

                    {bundleCount > 0 && (
                      <div className="border-t border-slate-100 px-4 pb-4">
                        <button
                          type="button"
                          onClick={() => handleMouseEnter(index)}
                          onMouseLeave={handleMouseLeave}
                          className="flex w-full items-center justify-between py-3 text-left text-sm font-black text-slate-700"
                        >
                          <span className="inline-flex items-center gap-2">
                            <LuPackageCheck className="h-4 w-4 text-primary" />
                            Included Accessories
                          </span>
                          {isExpanded ? (
                            <LuChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <LuChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <div
                          className={`grid transition-all duration-300 ${
                            isExpanded
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-2">
                              {item.bundleItems.map((bundleItem, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                                    <LuSparkles className="h-4 w-4" />
                                  </span>
                                  <span className="text-sm font-bold text-slate-700">
                                    {bundleItem.bundle_item_name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-white/70 bg-white/95 p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-white/60">Total Bikes</span>
              <span className="font-black">{safeCartItems.length}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-white/60">
                Estimated Rental Cost
              </span>
              <span className="text-2xl font-black">
                ₹{estimatedRentalCost.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <button
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-slate-950 text-sm font-black text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onContinueToCheckout}
            disabled={safeCartItems.length === 0}
          >
            Proceed to Checkout →
          </button>
        </footer>
      </aside>
    </div>
  );
};

export default CartModal;