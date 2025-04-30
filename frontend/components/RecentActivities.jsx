import React from "react";
import {
  calenderIcon,
  upShortBlackArrowIcon,
  downShortBlackArrowIcon,
  user1,
  user2,
  user3,
  user4,
  user5,
  user6,
} from "../assets";

// Sample data to populate the component
const employees = [
  {
    name: "Ayibaemi Awolowo",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "N/A",
    image: user1,
  },
  {
    name: "Diobu Wokoma",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "9:15 AM",
    image: user2,
  },
  {
    name: "Seiye Tuma",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "9:15 AM",
    image: user3,
  },
  {
    name: "Werinipre Benibo",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "9:15 AM",
    image: user4,
  },
  {
    name: "Ibiagbanibo Amakiri",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "9:15 AM",
    image: user5,
  },
  {
    name: "Oyintare Aganaba",
    office: "Main Office",
    timeIn: "9:15 AM",
    timeOut: "9:15 AM",
    image: user6,
  },
];

export default function RecentActivities() {
  return (
    <div className="w-full mx-auto pt-3 bg-white rounded-lg ">
      <div className="flex justify-between items-center pb-2 px-6">
        <div className="flex items-center space-x-2">
          <img src={calenderIcon} alt="calender icon" width={16} />
          <span className="text-xs font-semibold">Friday Oct 4, 2024</span>
          <img src={downShortBlackArrowIcon} alt="calender icon" width={12} />
        </div>

        {/* Time headers aligned with content below */}
        <div className="flex space-x-4 ">
          <div className="w-28 flex items-center space-x-2">
            <img src={calenderIcon} alt="calender icon" width={16} />
            <span className="text-xs font-semibold">Time in</span>
          </div>

          <div className="w-28 flex items-center space-x-2">
            <img src={calenderIcon} alt="calender icon" width={16} />
            <span className="text-xs font-semibold">Time Out</span>
          </div>
        </div>
      </div>

      <hr />

      <div className="space-y-4 pt-6 pb-9 px-6">
        {employees.map((employee, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={employee.image}
                  alt={employee.name}
                  className="w-9 h-9 rounded-full"
                />
              </div>
              <div>
                <h3 className="font-semibold text-xs">{employee.name}</h3>
                <p className="text-[10px] text-gray-500">{employee.office}</p>
              </div>
            </div>

            <div className="flex space-x-4">
              <div className="w-28 bg-[#F4F5F4] px-4 py-2 rounded-full flex items-center justify-center space-x-2">
                <img
                  src={upShortBlackArrowIcon}
                  alt="calender icon"
                  width={11}
                />
                <span className="text-[11px]">{employee.timeIn}</span>
              </div>

              <div className="w-28 bg-[#F4F5F4] px-4 py-2 rounded-full flex items-center justify-start space-x-2">
                <img
                  src={downShortBlackArrowIcon}
                  alt="calender icon"
                  width={11}
                />
                <span className="text-[11px]">{employee.timeOut}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
