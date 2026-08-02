import React, { useState, useEffect, useRef } from "react";
import { searchCustomers } from "../../services/api";

const CustomerCombobox = ({ value, onChange, placeholder = "Search customer...", className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const wrapperRef = useRef(null);

  // Sync external value changes (e.g. from New Customer creation)
  useEffect(() => {
    if (value && (!selectedCustomer || selectedCustomer.name !== value)) {
      setSearchTerm(value);
      setSelectedCustomer({ name: value, customer_name: value });
    } else if (!value) {
      setSearchTerm("");
      setSelectedCustomer(null);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // On blur, revert to the selected customer's name if valid
        if (selectedCustomer) {
           setSearchTerm(selectedCustomer.customer_name || selectedCustomer.name);
        } else {
           setSearchTerm(""); 
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCustomer]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Don't search if the input strictly matches the selected customer's name (prevents searching on select)
      if (isOpen && searchTerm !== (selectedCustomer?.customer_name || selectedCustomer?.name)) {
        setIsLoading(true);
        try {
          const data = await searchCustomers(searchTerm);
          setResults(data || []);
        } catch (e) {
          setResults([]);
        } finally {
          setIsLoading(false);
          setHighlightedIndex(-1);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, selectedCustomer]);

  const handleSelect = (customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.customer_name || customer.name);
    setIsOpen(false);
    onChange(customer.name);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedCustomer(null);
    setSearchTerm("");
    setResults([]);
    onChange("");
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
       if (e.key === "ArrowDown") {
          setIsOpen(true);
       }
       return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]);
      } else if (results.length > 0) {
        // Auto-select the first one if they press enter and nothing is explicitly highlighted
        handleSelect(results[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
             setSearchTerm(e.target.value);
             // When they type, clear the underlying selected object so they can search freely
             if (selectedCustomer) setSelectedCustomer(null);
             setIsOpen(true);
          }}
          onFocus={async () => {
             setIsOpen(true);
             if (!results.length) {
                setIsLoading(true);
                const data = await searchCustomers("");
                setResults(data || []);
                setIsLoading(false);
             }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full p-2.5 pr-8 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all ${className || ''}`}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {searchTerm ? (
           <button 
             type="button" 
             onClick={handleClear}
             className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
             aria-label="Clear selection"
           >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
        ) : (
           <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none p-1">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
           </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1" role="listbox">
              {results.map((c, index) => {
                const isHighlighted = index === highlightedIndex;
                const secondaryElements = [];
                if (c.mobile_no) secondaryElements.push(c.mobile_no);
                if (c.email_id) secondaryElements.push(c.email_id);
                const secondaryText = secondaryElements.join(" · ");
                
                return (
                  <li
                    key={c.name}
                    role="option"
                    aria-selected={isHighlighted}
                    className={`px-4 py-2 cursor-pointer transition-colors ${isHighlighted ? "bg-primary/10" : "hover:bg-slate-50"}`}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="font-bold text-slate-800 text-sm">
                       {c.customer_name || c.name}
                    </div>
                    {secondaryText && (
                       <div className="text-xs text-slate-500 mt-0.5">
                         {secondaryText}
                       </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              No customers found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerCombobox;
