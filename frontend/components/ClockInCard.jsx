import React from "react";
import { arrivedIcon } from "../assets";
import { Link } from "react-router-dom";

function ClockInCard({ userInfo, clockInTime, paymentRequired, isError }) {
  const renderContent = () => {
    if (paymentRequired) {
      return (
        <div className="card-content payment">
          <img src="/icons/payment.svg" alt="Payment Required" />
          <p>Complete your outstanding payment of</p>
          <h2>NGN5250</h2>
          <p className="subtitle">to retain your space</p>
          <button className="action-button black">Make Payment</button>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="card-content error">
          <div className="error-icon">!</div>
          <p>You are unable to clock-in twice on the same day.</p>
          <p className="subtitle">Contact Admin for more info</p>
        </div>
      );
    }

    return (
      <div className="text-center justify-center flex flex-col items-center bg-gradient-to-b from-blue-100 to-stone-50 rounded-lg p-8">
        <img src={arrivedIcon} alt="Clock In" className="w-10 h-10" />
        <p className="text-xs mt-4">You arrived today at</p>
        <h2 className="font-bold text-[25px] sm:text-[30px] lg:text-[40px]">
          {clockInTime}
        </h2>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white flex flex-col lg:flex-row justify-around lg:w-[800px] p-4 lg:p-10 mx-auto">
        <div className="flex flex-col gap-4 items-center text-center lg:text-left">
          {/* IMAGE */}
          <div className="flex justify-center">
            <img
              src={userInfo.avatar}
              alt="User Avatar"
              className="w-16 h-16 lg:w-20 lg:h-20"
            />
          </div>

          {/* USER DETAILS */}
          <div>
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#282525]">
              {userInfo.name}
            </h2>
            <p className="text-[#5C5C5B] text-center text-xs lg:text-sm">
              {userInfo.email}
            </p>
          </div>

          {/* SUBSCRIPTION INFO */}
          <div className="text-xs gap-2 flex flex-col justify-between">
            <div className="flex justify-between w-full lg:gap-4">
              <p className="text-[#5C5C5B]">Subscription</p>
              <p
                className={`text-[#000000] flex justify-start items-center w-full ${
                  userInfo.isActive ? "active" : "expired"
                }`}
              >
                {userInfo.isActive ? "Active" : "Expired"}
                {userInfo.isActive && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                )}
                {!userInfo.isActive && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block"></span>
                )}
              </p>
            </div>
            <div className="flex justify-between w-full lg:gap-12">
              <p className="text-[#5C5C5B]">Expiry:</p>
              <p className="text-[#000000]">{userInfo.expiryText}</p>
            </div>
            <div className="flex justify-between w-full lg:gap-[51px]">
              <p className="text-[#5C5C5B]">Space</p>
              <p className="text-[#000000]">{userInfo.space}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 lg:mt-0">{renderContent()}</div>
      </div>

      <Link to={"/home"}>
        <button className="px-4 py-3 lg:px-10 lg:py-4 bg-[#FEDC44] w-full md:w-full text-[#1F2127] text-[13px] font-semibold">
          Great- Let's go
        </button>
      </Link>
    </>
  );
}

export default ClockInCard;
