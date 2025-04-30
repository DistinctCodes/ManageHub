import {
  addHubUserIcon,
  addStaffIcon,
  plusIcon,
  calenderIcon,
  upShortBlackArrowIcon,
  spaceManagementIcon,
  graphChartIcon,
  greenCircleIcon2,
  greenIncreaseIcon,
  greenShortArrowUpIcon,
  redDecreaseIcon,
  threeDotsIcon,
  downShortBlackArrowIcon,
  starsIcon,
  trophyIcon,
  user1,
} from "../../assets";
import H3 from "../../components/H3";
import P from "../../components/P";
import RecentActivities from "../../components/RecentActivities";
import BarChart from "../../components/BarChart";
import AttendanceChart from "../../components/AttendanceChart";
import TimeOfArrivalChart from "../../components/TimeOfArrivalChart";
import PunctualityLeaderboard from "../../components/PunctualityLeaderboard";
import { useState } from "react";

const Monitoring = () => {
  const [userType, setUserType] = useState("Hub User");

  const handleToggle = (type) => {
    setUserType(type);
  };

  return (
    <main className="flex flex-col gap-6">
      {/* 1st section */}
      <div className="">
        <p className="font-semibold text-[13px]">Stats</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
          {/* first stats box */}
          <div className="w-full rounded-md bg-white px-4 py-4 flex flex-col gap-3 shadow-md">
            {/* top */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[14px] font-semibold">
                  Net Position Today
                </h3>
                <p className="text-[#475467] text-[10px] -mt-0.5">
                  Mon 14 October, 12:46 PM
                </p>
              </div>

              <img src={threeDotsIcon} alt="more info icon" width={16} />
            </div>

            {/* middle */}
            <div className="flex justify-between">
              <div className=" border-r-[1.5px] border-gray-200 flex flex-col gap-1 w-[50%]">
                <div className="flex gap-4">
                  <p className="font-semibold text-[22px]">53</p>{" "}
                  <img
                    src={greenIncreaseIcon}
                    alt="increase icon"
                    width={15}
                    height={15}
                    className="-mt-2"
                  />
                </div>
                <p className="text-[11px] font-light">checked in</p>
              </div>

              <div className="w-[50%] flex-col gap-1 pl-[15%]">
                <div className="flex gap-4">
                  <p className="font-semibold text-[22px]">23</p>{" "}
                  <img
                    src={redDecreaseIcon}
                    alt="reducing icon"
                    width={15}
                    height={15}
                    className="-mt-2"
                  />
                </div>
                <p className="text-[11px] font-light mt-1">checked out</p>
              </div>
            </div>

            {/* bottom */}
            <p className="text-[11px]">
              <strong>23 people</strong> are within the space
            </p>
          </div>

          {/* second stats box */}
          <div className="w-full rounded-md bg-white px-4 py-4 flex flex-col gap-3 shadow-md">
            {/* top */}
            <div className="flex justify-between items-start">
              <div>
                <H3>Hub Users</H3>
              </div>
              <img src={threeDotsIcon} alt="more info icon" width={16} />
            </div>

            {/* middle */}
            <div className="flex flex-col">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  {/* Stats number */}
                  <div className="flex gap-4">
                    <p className="font-semibold text-[22px]">72</p>
                  </div>

                  {/* Percentage comparison */}
                  <div className="flex items-center gap-1">
                    <img
                      src={greenShortArrowUpIcon}
                      alt="green icon"
                      width={15}
                    />
                    <p className="text-[11px] font-normal">
                      <span className="text-[#027A48] font-semibold">40%</span>{" "}
                      vs last month
                    </p>
                  </div>
                </div>

                {/* Graph chart - now properly positioned */}
                <div className="w-24 min-w-[96px] ml-auto">
                  <img
                    src={graphChartIcon}
                    alt="graph icon"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>

            {/* bottom */}
            <p className="text-[11px] flex items-center gap-1 mt-3">
              <img src={greenCircleIcon2} alt="green circle icon" width={12} />
              24 Active subscription
            </p>
          </div>

          {/* third stats box - hidden on sm*/}
          <div className="w-full rounded-md bg-white px-4 py-4 flex flex-col gap-3 sm:hidden lg:flex shadow-md">
            {/* top */}
            <div className="flex justify-between items-start">
              <div>
                <H3>Staff</H3>
              </div>
              <img src={threeDotsIcon} alt="more info icon" width={16} />
            </div>

            {/* middle */}
            <div className="flex flex-col">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  {/* Stats number */}
                  <div className="flex gap-4">
                    <p className="font-semibold text-[22px]">44</p>
                  </div>

                  {/* Percentage comparison */}
                  <div className="flex items-center gap-1">
                    <img
                      src={greenShortArrowUpIcon}
                      alt="green icon"
                      width={15}
                    />
                    <p className="text-[11px] font-normal">
                      <span className="text-[#027A48] font-semibold">40%</span>{" "}
                      vs last month
                    </p>
                  </div>
                </div>

                {/* Graph chart - now properly positioned */}
                <div className="w-24 min-w-[96px] ml-auto">
                  <img
                    src={graphChartIcon}
                    alt="graph icon"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* third stats box - hidden on large screen*/}
        <div className="w-full rounded-md bg-white px-4 py-4 flex-col gap-3 hidden sm:flex lg:hidden mt-4 shadow-md">
          {/* top */}
          <div className="flex justify-between items-start">
            <div>
              <H3>Staff</H3>
            </div>
            <img src={threeDotsIcon} alt="more info icon" width={16} />
          </div>

          {/* middle */}
          <div className="flex flex-col">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                {/* Stats number */}
                <div className="flex gap-4">
                  <p className="font-semibold text-[22px]">44</p>
                </div>

                {/* Percentage comparison */}
                <div className="flex items-center gap-1">
                  <img
                    src={greenShortArrowUpIcon}
                    alt="green icon"
                    width={15}
                  />
                  <p className="text-[11px] font-normal">
                    <span className="text-[#027A48] font-semibold">40%</span> vs
                    last month
                  </p>
                </div>
              </div>

              {/* Graph chart - now properly positioned */}
              <div className="w-24 min-w-[96px] ml-auto">
                <img
                  src={graphChartIcon}
                  alt="graph icon"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2nd section */}
      <div className="">
        <div className="flex gap-4 mt-1 flex-col lg:flex-row">
          {/* space occupancy rate section */}
          <div className="w-full lg:w-[67.5%]">
            {/* heading */}
            <div className="w-full mx-auto py-2.5 px-4 bg-[#f2f2f2] rounded-t-lg">
              {/* top */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[12px] font-semibold">
                    Space Occupancy Rate
                  </h3>
                </div>

                {/* filter section */}
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 rounded-full px-2 py-1 text-[11px] font-semibold flex items-center text-[#475467]">
                    Today
                  </div>

                  <p className="text-[#475467] text-[11px]">Yesterday</p>

                  <div className="flex items-center space-x-2 text-[#475467] text-[11px]">
                    <span>Select Date</span>
                    <img
                      src={downShortBlackArrowIcon}
                      alt="calender icon"
                      width={11}
                    />
                  </div>
                </div>

                <img src={threeDotsIcon} alt="more info icon" width={16} />
              </div>
            </div>

            {/* body */}
            <div className="pl-3 pr-2 pt-6 pb-5 bg-white rounded-b-lg shadow-md">
              {/* spaces section */}
              <div className="flex gap-2 items-center">
                <div className="bg-[#F4F5F4] rounded-full px-2 py-1 text-[12px] font-semibold flex items-center">
                  54 Persons
                </div>
                <p className="text-[12px] font-semibold">in</p>
                <div className="flex gap-2 items-center text-[12px] font-semibold bg-[#F4F5F4] rounded-full px-2 py-1">
                  <img src={spaceManagementIcon} alt="space icon" width={18} />{" "}
                  6 Spaces
                </div>
              </div>

              {/* bar chart section */}
              {/* <div></div> */}
              <BarChart width={400} />
            </div>
          </div>

          {/* attendance section */}
          <div className="w-full lg:w-[32.5%] shadow-md rounded-b-lg">
            <div className="w-full mx-auto bg-white rounded-lg flex flex-col items-center">
              {/* heading */}
              <div
                className="
                flex justify-between items-center
                w-full mx-auto py-3 px-4 bg-[#f2f2f2] rounded-t-lg
                "
              >
                <div>
                  <h3 className="text-[12px] font-semibold">Attendance</h3>
                </div>

                <img src={threeDotsIcon} alt="more info icon" width={16} />
              </div>

              {/* user type chart section */}
              <div>
                <AttendanceChart />{" "}
              </div>

              <div className="pl-3 pr-2 pt-6 pb-5">
                {/* filter section */}
                <div className="flex items-center gap-3 mt-3 ml-3">
                  <div className="bg-gray-200 rounded-full px-2 py-1 text-[11px] font-semibold flex items-center text-[#475467]">
                    Today
                  </div>

                  <p className="text-[#475467] text-[11px]">Yesterday</p>

                  <div className="flex items-center space-x-2 text-[#475467] text-[11px]">
                    <span>Select Date</span>
                    <img
                      src={downShortBlackArrowIcon}
                      alt="calender icon"
                      width={11}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3rd section */}
      <div className="">
        <div className="flex gap-4 mt-1 flex-col lg:flex-row">
          {/* time of arrival section */}
          <div className="w-full lg:w-[67.5%]">
            {/* heading */}
            <div className="w-full mx-auto py-3 px-4 bg-[#f2f2f2] rounded-t-lg">
              {/* top */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[12px] font-semibold">Time of Arrival</h3>
                </div>

                {/* filter section */}
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 rounded-full px-2 py-1 text-[11px] font-semibold flex items-center text-[#475467]">
                    Today
                  </div>

                  <p className="text-[#475467] text-[11px]">Yesterday</p>

                  <div className="flex items-center space-x-2 text-[#475467] text-[11px]">
                    <span>Select Date</span>
                    <img
                      src={downShortBlackArrowIcon}
                      alt="calender icon"
                      width={11}
                    />
                  </div>
                </div>

                <img src={threeDotsIcon} alt="more info icon" width={16} />
              </div>
            </div>

            {/* body */}
            <div className="pl-3 pr-2 pt-3 bg-white rounded-b-lg shadow-md text-[11px]">
              {/* average percentage section */}
              <div className="flex gap-2 items-center bg-[#F7F7FB] justify-center max-w-[290px] w-full mx-auto py-2 rounded-lg">
                80% arrived between
                <div className="flex gap-2 items-center text-[10px] font-semibold bg-[#EB5757] text-white rounded-full px-2 py-1">
                  7:30am - 8:00am
                </div>
                Today
              </div>

              {/* line chart section */}
              <div className="w-full max-w-4xl">
                <TimeOfArrivalChart />
              </div>
            </div>
          </div>

          {/* punctuality leadership section */}
          <div className="w-full lg:w-[32.5%]  rounded-b-lg">
            <div className="w-full mx-auto bg-white rounded-lg flex flex-col items-center shadow-md pb-2">
              {/* heading */}
              <div
                className="
                flex justify-between items-center
                w-full mx-auto py-3 px-4 bg-[#f2f2f2] rounded-t-lg
                "
              >
                <div>
                  <h3 className="text-[12px] font-semibold">
                    Punctuality Leaderboard
                  </h3>
                </div>

                <img src={threeDotsIcon} alt="more info icon" width={16} />
              </div>

              {/* toggle section */}
              <div className="flex justify-center w-full bg-[#f2f2f2] pt-1.5">
                <div
                  className="flex rounded-md shadow-sm w-full justify-center"
                  role="group"
                >
                  <button
                    type="button"
                    className={`px-4  text-[12px] font-medium rounded-md w-full ${
                      userType === "Hub User"
                        ? "bg-white text-gray-900"
                        : "bg-[#f2f2f2] hover:bg-gray-200"
                    }`}
                    onClick={() => handleToggle("Hub User")}
                  >
                    Hub User
                  </button>

                  <button
                    type="button"
                    className={`px-4 py-2 text-[12px] font-medium rounded-md w-full ${
                      userType === "Staff"
                        ? "bg-white text-gray-900"
                        : "bg-[#f2f2f2] hover:bg-gray-200"
                    }`}
                    onClick={() => handleToggle("Staff")}
                  >
                    Staff
                  </button>
                </div>
              </div>

              {/* user section */}
              <div className=" h-[55px] w-full punctualityGradient flex justify-between px-5">
                <div className="flex items-center gap-2">
                  <div>
                    <img src={user1} alt="user icon" width={38} />
                  </div>

                  <div>
                    <h3 className="text-[12px] font-semibold">
                      Moses Jeremiah
                    </h3>

                    <p className="text-[11px]">Hub User</p>
                  </div>
                </div>

                <div>
                  <img
                    src={starsIcon}
                    alt="stars icon"
                    width={30}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Attendance this week */}
              <div className="relative mt-9 flex flex-col gap-6 w-full pl-5">
                {/* top */}
                <div>
                  <p className="text-[12px]">Attendance this week</p>
                  <p className="font-bold text-[23px]">5/5</p>
                </div>

                {/* bottom */}
                <div>
                  <p className="text-[12px]">Average Time in this week</p>
                  <p className="font-bold text-[23px]">8:15 am</p>
                </div>

                {/* trophy */}
                <div className="absolute -top-5 right-0">
                  <img src={trophyIcon} alt="trophy icon" width={110} />
                </div>
              </div>

              {/* last section */}
              <div className="pl-3 pr-2 pt-6 pb-7">
                {/* filter section */}
                <div className="flex items-center gap-3 mt-3 ml-3">
                  <div className="bg-gray-200 rounded-full px-2 py-1 text-[11px] font-semibold flex items-center text-[#475467]">
                    This Week
                  </div>

                  <p className="text-[11px]">This Month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Monitoring;
