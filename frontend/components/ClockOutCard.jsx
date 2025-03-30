import React from "react";
import { departIcon, bitmoji, statsIcon } from "../assets";
import { Link } from "react-router-dom";
import { WifiIcon } from "lucide-react";

function ClockOutCard({ userInfo, clockOutTime, totalTimeSpent }) {
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
            <div className="flex justify-between w-full lg:gap-4 gap-12">
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

            <div className="flex justify-between w-full lg:gap-12 gap-20">
              <p className="text-[#5C5C5B]">Expiry:</p>
              <p className="text-[#000000]">{userInfo.expiryText}</p>
            </div>

            <div className="flex justify-between w-full lg:gap-[51px]">
              <p className="text-[#5C5C5B]">Space</p>
              <p className="text-[#000000]">{userInfo.space}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 lg:mt-0">
          <div className="text-center justify-center flex flex-col items-center bg-gradient-to-b from-blue-100 to-stone-50 rounded-lg p-8">
            <img src={departIcon} alt="Clock In" className="w-12 h-12" />
            <p className="text-xs mt-4">Left the hub at</p>
            <h2 className="font-bold text-[30px] sm:text-[35px] lg:text-[40px]">
              {clockOutTime}
            </h2>
            <p className="bg-[#6BEBAD] px-4 font-extrabold py-2 border rounded-md text-[10px] flex items-center justify-center gap-1">
              <img src={statsIcon} alt="This is a stats logo" width={15} />
              {totalTimeSpent}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-6 items-center flex-col">
        <img src={bitmoji} alt="bitmoji" className="w-9 h-9 mx-auto" />
        <p className="text-[12px] text-[#1F2127] text-center">
          Hey {userInfo.name}, We hope your day was productive. <br />
          <b>See you tomorrow!</b>
        </p>
      </div>
    </>
  );
}

export default ClockOutCard;
