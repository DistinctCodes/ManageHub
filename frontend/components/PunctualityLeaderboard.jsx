import React, { useState } from "react";

const PunctualityLeaderboard = () => {
  const [isHubUser, setIsHubUser] = useState(true);

  const toggleTab = (tab) => {
    setIsHubUser(tab === "Hub User");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md w-80 sm:w-96">
      {/* Toggle Button */}
      <div className="flex justify-between mb-4">
        <button
          onClick={() => toggleTab("Hub User")}
          className={`px-4 py-2 ${
            isHubUser ? "text-white bg-gray-900" : "text-gray-400"
          } rounded-md font-medium`}
        >
          Hub User
        </button>
        <button
          onClick={() => toggleTab("Staff")}
          className={`px-4 py-2 ${
            !isHubUser ? "text-white bg-gray-900" : "text-gray-400"
          } rounded-md font-medium`}
        >
          Staff
        </button>
      </div>

      {/* Profile Card Content */}
      {isHubUser ? (
        <div className="text-center">
          <div className="flex justify-center items-center mb-2">
            <img
              src="https://via.placeholder.com/50"
              alt="User Profile"
              className="w-14 h-14 rounded-full"
            />
            <div className="ml-3">
              <h3 className="text-lg font-semibold">Moses Jeremiah</h3>
              <span className="text-gray-500 text-sm">Hub User</span>
            </div>
            <span className="ml-auto text-yellow-400 text-xl">✨</span>
          </div>
          <div className="my-6">
            <p className="text-gray-600 text-sm">Attendance this week</p>
            <p className="text-3xl font-bold mt-1">5/5</p>
          </div>
          <div className="my-6">
            <p className="text-gray-600 text-sm">Average Time in this week</p>
            <p className="text-3xl font-bold mt-1">8:15 am</p>
          </div>
          <div className="flex justify-center">
            <span className="text-yellow-500 text-4xl">🏆</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <p>No data available for Staff</p>
        </div>
      )}

      {/* Bottom Toggle */}
      <div className="flex justify-around mt-4">
        <button
          className="text-blue-600 font-medium focus:outline-none"
          onClick={() => toggleTab("Hub User")}
        >
          This Week
        </button>
        <button
          className="text-gray-400 font-medium focus:outline-none"
          onClick={() => toggleTab("Staff")}
        >
          This Month
        </button>
      </div>
    </div>
  );
};

export default PunctualityLeaderboard;
