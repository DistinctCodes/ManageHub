import React, { useState } from "react";
import { Clock, User, FileText, Users, Files } from "lucide-react";
import { subscriptionLogo, adobeIcon, user1 } from "../../assets";
import { Link } from "react-router-dom";

const StaffProfile = () => {
  const [activeTab, setActiveTab] = useState("Profile");

  const sidebarItems = [
    { name: "Profile", icon: User },
    { name: "Activity Log", icon: Clock },
    { name: "Bio", icon: FileText },
  ];

  const ActivityLog = () => (
    <div className="space-y-4">
      <h2 className="text-[16px] font-semibold mb-8">Activity Log</h2>
      <div className="bg-white rounded-lg overflow-hidden  text-[11px] font-medium border-x-[1px] border-gray-200">
        {[
          { date: "Tue 15th October", timeIn: "8:00 AM", timeOut: "6:00 PM" },
          { date: "Mon 14th October", timeIn: "9:40 AM", timeOut: "6:00 PM" },
          { date: "Mon 14th October", timeIn: "9:40 AM", timeOut: "6:00 PM" },
          { date: "Mon 14th October", timeIn: "9:40 AM", timeOut: "6:00 PM" },
          { date: "Mon 14th October", timeIn: "9:40 AM", timeOut: "6:00 PM" },
        ].map((log, index) => (
          <div key={index} className=" bg-white">
            <div className="flex items-center justify-between border-t-[1px] border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-4">
                <div className="text-green-500">▲</div>
                <span>{log.date}</span>
                <span>{log.timeIn}</span>
              </div>
              <span>Checked-in</span>
            </div>
            <div className="flex items-center justify-between border-t-[1px] border-gray-200 px-4 py-2">
              <div className="flex items-center space-x-4">
                <div className="text-red-500">▼</div>
                <span>{log.date}</span>
                <span>{log.timeOut}</span>
              </div>
              <span>Checked-out</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ProfileContent = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
          <img
            src={user1}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold">Michael Dapper</h2>
          <div className="text-gray-500 flex gap-4 text-[12px]">
            <p>mdapper@gmail.com</p>
            <p>+2348100 0000 00</p>
          </div>
          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-[11px] mt-1 font-semibold">
            Active
          </span>
        </div>
      </div>

      <div className=" bg-white rounded-lg text-[11px] flex flex-col gap-2 py-2">
        <div className="flex justify-between px-4 border-b-[1px] border-gray-200 pb-2">
          <span className="font-semibold">Role</span>
          <span>DevOps</span>
        </div>

        <div className="flex justify-between px-4 border-b-[1px] border-gray-200 pb-2">
          <span className="font-semibold">Department</span>
          <span>Engineering</span>
        </div>

        <div className="flex justify-between px-4 border-b-[1px] border-gray-200 pb-2">
          <span className="font-semibold">Email</span>
          <span>Example@gmail.com</span>
        </div>

        <div className="flex justify-between px-4 ">
          <span className="font-semibold">Phone Number</span>
          <span>08180020382</span>
        </div>
      </div>
    </div>
  );

  const BioContent = () => (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold mb-8">Bio</h2>

      <div className="flex flex-col gap-3 bg-white rounded-lg text-[12px]">
        <div className="flex justify-between items-center px-4 pb-2 border-gray-200 border-b-[1px] pt-2">
          <span className="font-semibold">Next of Kin</span>
          <span>Queen Dapper</span>
        </div>

        <div className="flex justify-between items-center px-4 pb-2 border-gray-200 border-b-[1px]">
          <span className="font-semibold">Next of Kin Phone number</span>
          <span>+234 8146261863</span>
        </div>

        <div className="flex justify-between items-center px-4 pb-2">
          <span className="font-semibold">Contact Address</span>
          <span>Frazan Estate, Kashim Ibrahim Way, Kaduna</span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "Profile":
        return <ProfileContent />;
      case "Activity Log":
        return <ActivityLog />;
      case "Bio":
        return <BioContent />;
      default:
        return <div className="p-4">Content for {activeTab}</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg min-h-[700px]">
      <div className="mb-6">
        <h1 className="text-[15px] font-bold">Profile</h1>
        <div className="text-gray-500 text-[11px] mt-0.5">
          <Link to="/users" className="text-gray-800 font-semibold">
            Staff
          </Link>
          <span className="mx-2">/</span>
          <span>Michael Dapper</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <div className="bg-[#F7F8FA] rounded-lg  overflow-hidden">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center px-4 py-2.5 text-left text-[12px] font-medium border-[1px] border-gray-200 ${
                    activeTab === item.name
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* <Icon className="w-5 h-5 mr-2" /> */}
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-[#F7F8FA] rounded-lg  px-4 py-5">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;