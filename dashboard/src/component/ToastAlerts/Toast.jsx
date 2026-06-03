import React from 'react'

const Toast = ({ messages, removeToast }) => {
  return (
<div className="fixed top-4 right-4 space-y-2 z-50">
      {messages.map((msg, index) => (
        <div
        key={index}
        className={`px-4 py-2 rounded shadow-lg ${
          msg.type === "success"
            ? "bg-green-500 text-white"
            : msg.type === "warning"
            ? "bg-orange-500 text-white"
            : msg.type === "info"
            ? "bg-[#17a2b8] text-white"
            : "bg-rose-500 text-white shadow-md"
        }`}
      >
          <div className="flex justify-between items-center">
            <span>{msg.text}</span>
            <button
              onClick={() => removeToast(index)}
              className="ml-4 text-sm font-semibold"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Toast
