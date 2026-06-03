import React from "react";
import Rentlistview from "./Rentlistview";
import RentalAssetDetails from "./RentalAssetDetails/RentalAssetDetails.jsx";
import CartModal from "./CartModal/CartModal.jsx";

const Rentlist = ({
  rentalAssets,
  quantities,
  openModal,
  hasProductBundle,
  selectedAsset,
  closeModal,
  addToCart,
  isCartOpen,
  cartItems,
  cartModalItems,
  closeCart,
  onContinueToCheckout,
  itemsState,
  setItemsState,

}) => {
  const safeRentalAssets = Array.isArray(rentalAssets) ? rentalAssets : [];
  const safeQuantities = quantities || {};
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];

  return (
    <div className="flex flex-wrap w-full justify-center gap-2">
      {safeRentalAssets.map((asset, index) => {
        const assetData = safeQuantities[asset.id] || {
          quantity: 0,
          totalRate: 0,
        };
        const { quantity, totalRate } = assetData;

        return (
          <div
            key={index}
            className="flex-none cursor-pointer"
            onClick={() => openModal(asset)} // Use the openModal function
          >
            <Rentlistview
              id={asset.id}
              status={asset.status || "Available"}
              price={asset.price}
              brand={asset.brand}
              name={asset.name}
              image={asset.image}
              price_list={asset.price_list}
              quantity={quantity}
              item_name={asset.id}
              amount={totalRate}
            />
          </div>
        );
      })}
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
    </div>
  );
};

export default Rentlist;
