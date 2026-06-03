import { useEffect, useState } from "react";
import { LuImage } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";

function CameraDetails({
  camera,
  onClose,
  onAddToCart,
  itemsState,
  setItemsState,
}) {
  const { bundleData } = camera;

  useEffect(() => {
    if (camera?.bundleData?.items) {
      // Find the index of the main item
      const mainItemIndex = camera.bundleData.items.findIndex(
        (item) => item.is_main_item === 1
      );

      const initialState = camera.bundleData.items.map((item, index) => ({
        ...item,
        checked: item.is_main_item === 1 || item.item_quantity > 0, // Ensure main item is checked
        maxQuantity: item.item_quantity,
        isMain: item.is_main_item === 1, // Add this for easier checks later
      }));

      setItemsState(initialState);
    }
  }, [camera]);

  const handleCheckboxChange = (index) => {
    setItemsState((prevState) => {
      if (prevState[index].isMain) return prevState; // Prevent unchecking main item

      const updatedState = [...prevState];
      updatedState[index].checked = !updatedState[index].checked;
      updatedState[index].item_quantity = updatedState[index].checked ? 1 : 0;
      return updatedState;
    });
  };

  const handleQuantityChange = (index, newQuantity) => {
    setItemsState((prevState) => {
      const updatedState = [...prevState];
      const maxQuantity = updatedState[index].maxQuantity;

      newQuantity = Math.max(0, Math.min(newQuantity, maxQuantity));

      updatedState[index] = {
        ...updatedState[index],
        item_quantity: newQuantity,
        checked: newQuantity > 0 || updatedState[index].isMain, // Ensure main item remains checked
      };

      return updatedState;
    });
  };

  const handleAddToCart = () => {
    const checkedItems = itemsState
      .filter((item) => item.checked)
      .map((item) => ({
        ...item,
        stock_quantity: item.item_quantity,
      }));

    const updatedCamera = {
      ...camera,
      bundleItems: checkedItems,
    };

    onAddToCart(updatedCamera);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex justify-center items-center z-50">
      <div
        className="bg-white p-4 sm:p-6 rounded-lg w-auto text-center relative shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-7 right-9 bg-transparent border-none text-lg cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-gray-200"
          onClick={onClose}
        >
          <IoMdClose />
        </button>
        <div className="flex flex-col rounded-lg p-5 border border-[#F5C725]">
          <div className="flex flex-row gap-5">
            <div className="flex-[1.5] border-r border-[#F5C725] pr-0 text-left">
              <div className="flex flex-col items-start gap--1">
                <strong className="text-[25px] mb-1">{camera.brand}</strong>
                <p className="text-[25px] mr-1">{camera.name}</p>
                <p
                  className={`text-[14px] mt-[-5px] font-bold ${
                    camera.status.toLowerCase() === "available"
                      ? "text-[#34C759]"
                      : camera.status.toLowerCase() === "reserved"
                      ? "text-[#E56218]"
                      : camera.status.toLowerCase() === "unavailable"
                      ? "text-[#FF0F00]"
                      : "text-[#FF0F00]"
                  }`}
                >
                  {camera.status}
                </p>
              </div>
              <div className="mt-[-20px] mr-0 flex flex-col justify-center items-start">
                <img src={camera.image} className="h-[160px] w-auto" />
                <p className="text-[12px] mt-0">
                  {camera.price_list} <strong>Rs {camera.price}</strong>
                </p>
              </div>
            </div>

            <div className="flex-[2] pl-0">
              <div className="bg-white rounded-lg p-4 shadow-md mt-5">
                {itemsState.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border border-[#F5C725] rounded-md mb-2 w-auto pr-2"
                  >
                    {/* Left End - LuImage + Item Name */}
                    <div className="flex items-center space-x-2">
                      <div className="bg-[#F5C725] flex items-center justify-center w-[40px] h-[35px] rounded-sm">
                        <i>
                          <LuImage />
                        </i>
                      </div>
                      <span className="text-[12px] text-[#333] font-semibold">
                        {item.bundle_item_name}
                      </span>
                    </div>

                    {/* Right End - Quantity & Checkbox */}
                    <div className="flex items-center ml-auto space-x-2">
                      <input
                        type="checkbox"
                        className="form-checkbox accent-[#F5C725] disabled:accent-[#F5C725] disabled:cursor-not-allowed"
                        checked={item.checked}
                        disabled={item.isMain}
                        onChange={() => handleCheckboxChange(index)}
                      />
                      <input
                        type="number"
                        className="text-[12px] text-[#333] font-semibold w-[50px] border border-gray-300 rounded-md text-center"
                        value={item.item_quantity}
                        min="0"
                        readOnly={item.isMain}
                        max={item.maxQuantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            index,
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                      />

                      <span className="text-[12px] text-[#333] font-semibold">
                        Nos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="mt-6 h-[28px] w-[230px] bg-[#4B5150] text-white font-bold border-none rounded-md text-[11px] cursor-pointer hover:bg-[#F5C725]"
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-5 text-[14px] text-[#555] text-left border-t-2 border-[#4B5150]">
            <h3 className="text-base font-bold text-[#F5C725]">Description</h3>
            <p className="text-[10px]">
              {camera.description ? stripHtml(camera.description) : safe}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CameraDetails;

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
