import { useState, useEffect, useRef } from "react";
import { FaSearch, FaBars, FaRegBell } from "react-icons/fa";
import NotificationDropdown from "./NotificationDropdown";
import { CiSearch } from "react-icons/ci";
import { PiCaretDownBold, PiDesk } from "react-icons/pi";
import {
  VITE_PUBLIC_DESK_LINK,
  VITE_PUBLIC_DASHBOARD,
  VITE_AUTHENTICATION,
} from "../../../../constants";

function Header({
  onButtonClick,
  searchQuery,
  setSearchQuery,
  handleKeyDown,
  handleSearchClick,
  handleSearchChange,
  userImage,
  user,
  companyName,
  logo,
  portalMode,
  isAuthenticated,
  handleCustomerLogout,
  customerDetails,
}) {
  const [isNavbarVisible, setIsNavbarVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${VITE_AUTHENTICATION}/api/method/logout`, {
        credentials: "include",
      });
      window.location.href = `${VITE_AUTHENTICATION}/login`; 
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  

  const toggleNavbar = () => setIsNavbarVisible(!isNavbarVisible);

  function getUserInitials(fullName) {
    if (!fullName) return "";

    const names = fullName.trim().split(" ");
    if (names.length === 1) {
      return names[0][0];
    }
    return names[0][0] + names[names.length - 1][0];
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      <div className="px-6 py-3 flex items-center justify-between w-full mx-auto">
        {/* Left: Logo and Name */}
        <div className="flex items-center w-1/4">
          <a href={VITE_PUBLIC_DASHBOARD} className="flex items-center gap-3 text-gray-900 font-bold text-xl tracking-tight no-underline">
            {logo ? (
              <img src={logo} alt={companyName || "Rental Platform"} className="h-8 object-contain rounded-md" />
            ) : (
              <span className="bg-primary text-white p-1.5 rounded-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </span>
            )}
            {!logo && (companyName || "Rental Platform")}
            {logo && <span className="hidden sm:inline">{companyName || "Rental Platform"}</span>}
          </a>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center bg-gray-50 rounded-full border border-gray-100 focus-within:border-gray-300 focus-within:bg-white transition-all w-full max-w-md">
            <div className="pl-4 pr-2 text-gray-400">
              <CiSearch className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-full py-2 pr-4 bg-transparent text-sm text-gray-700 outline-none"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Right: Actions and User */}
        <div className="flex items-center justify-end gap-6 w-1/4">
          <button className="hidden lg:flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors text-sm font-medium">
            <CiSearch className="h-5 w-5" />
            <span>Search</span>
          </button>
          
          {(portalMode !== "customer" || (portalMode === "customer" && isAuthenticated)) && (
            <NotificationDropdown 
              portalMode={portalMode} 
              isAuthenticated={portalMode === "customer" ? isAuthenticated : true} 
            />
          )}

          {portalMode !== "customer" && (
            <a
              href={VITE_PUBLIC_DESK_LINK}
              className="hidden md:flex items-center gap-1 text-gray-600 hover:text-primary font-medium text-sm transition-colors"
            >
              <span>Desk</span>
              <PiCaretDownBold className="h-3 w-3" />
            </a>
          )}
          
          {portalMode !== "customer" && (
            <div className="relative ml-2" ref={dropdownRef}>
              <div onClick={toggleDropdown} className="cursor-pointer">
                {userImage ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white ring-2 ring-transparent hover:ring-primary/30 transition-all">
                    <img
                      src={userImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm uppercase ring-2 ring-transparent hover:ring-primary/30 transition-all shadow-sm">
                    {getUserInitials(user?.full_name || user?.name || "A")}
                  </div>
                )}
              </div>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-900 bg-gray-50">
                    {user?.full_name || user?.name || "User"}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
          
          {portalMode === "customer" && isAuthenticated && (
            <div className="relative ml-2" ref={dropdownRef}>
              <div onClick={toggleDropdown} className="cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm uppercase ring-2 ring-transparent hover:ring-primary/30 transition-all shadow-sm">
                  {getUserInitials(customerDetails?.customer_name || "C")}
                </div>
              </div>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-900 bg-gray-50">
                    {customerDetails?.customer_name || "Customer"}
                  </div>
                  <button
                    onClick={handleCustomerLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="flex md:hidden p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center bg-white rounded-full border border-gray-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 w-full transition-all">
          <div className="pl-4 pr-2 text-gray-400">
            <CiSearch className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="w-full py-2 pr-4 bg-transparent text-sm text-gray-700 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Bottom Navbar */}
      {/* <div className="bg-black text-white p-3 flex justify-between md:justify-center items-center">
        <a
              href="#home"
              className="block py-1 px-2 hover:bg-gray-200 hover:text-black"
              onClick={onButtonClick}>
              HOME
            </a>
        <FaBars
          className="md:hidden cursor-pointer text-lg"
          onClick={toggleNavbar}
        />

        <ul className="hidden md:flex space-x-4">
          <li className="px-4 py-2 hover:bg-gray-200 hover:text-black"></li>
           
        <a
              href="#home"
              >
              HOME
            </a>
          {Object.keys(navItems).map((item, index) => (
            <li key={index} className="group relative list-none">
              <a href="#" className="flex items-center space-x-3 text-white">
                <span>{item}</span>
                <PiCaretDownBold className="group-hover:rotate-180 transition-transform" />
              </a>
              <ul className="absolute hidden group-hover:block bg-black text-white mt-2 w-40 shadow-lg rounded z-50">
                {navItems[item].map((dropdownItem, idx) => (
                  <li
                    key={idx}
                    className="px-4 py-2 hover:bg-gray-200 hover:text-black"
                  >
                    <a href="#">{dropdownItem}</a>
                  </li>
                ))}
              </ul>
            </li>
          ))}

          {additionalNavItems.map((item, index) => (
            <li key={index} className="list-none">
              <a
                href={`#${item.replace(/\s+/g, "").toLowerCase()}`}
                className="text-white hover:text-red-600 no-underline"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </div> */}

      {/* {isNavbarVisible && (
        <div className="md:hidden bg-black text-white p-3">
          {Object.keys(navItems).map((item, index) => (
            <details key={index} className="w-full">
              <summary className="flex justify-between cursor-pointer px-2 py-1">
                {item}
                <PiCaretDownBold />
              </summary>
              <ul className="pl-4 mt-1">
                {navItems[item].map((dropdownItem, idx) => (
                  <li
                    key={idx}
                    className="py-1 hover:bg-gray-200 hover:text-black"
                  >
                    <a href="#" className="block">
                      {dropdownItem}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ))}

          
          <div className="mt-3">
            {additionalNavItems.map((item, index) => (
              <a
                key={index}
                href={`#${item.replace(/\s+/g, "").toLowerCase()}`}
                className="block py-1 px-2 hover:bg-gray-200 hover:text-black"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      )} */}
    </header>
  );
}

export default Header;
