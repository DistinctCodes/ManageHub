import React, { useState } from "react";
import { Clock, User, FileText, Users, Files } from "lucide-react";
import { subscriptionLogo, adobeIcon, user1 } from "../../assets";
import { Link } from "react-router-dom";

const ProfileDashboard = () => {
  const [activeTab, setActiveTab] = useState("Profile");

  const sidebarItems = [
    { name: "Profile", icon: User },
    { name: "Activity Log", icon: Clock },
    { name: "Bio", icon: FileText },
    { name: "Transactions", icon: Files },
    { name: "Team", icon: Users },
    { name: "Document", icon: Files },
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
          <span className="font-semibold">Space allocated -</span>
          <span>Shared Space</span>
        </div>

        <div className="flex justify-between px-4 border-b-[1px] border-gray-200 pb-2">
          <span className="font-semibold">Plan Type -</span>
          <span>Monthly</span>
        </div>

        <div className="flex justify-between px-4 border-b-[1px] border-gray-200 pb-2">
          <span className="font-semibold">Expiry -</span>
          <span>22/10/2024</span>
        </div>

        <div className="flex justify-between px-4 ">
          <span className="font-semibold">Last Activity -</span>
          <span>12 Hours Ago</span>
        </div>
      </div>
    </div>
  );

  const BioContent = () => (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold mb-8">Bio</h2>

      <div className="flex flex-col gap-3 bg-white rounded-lg text-[12px]">
        <div className="flex justify-between items-center px-4 border-gray-200 border-b-[1px] py-2">
          <span className="font-semibold">Email -</span>
          <span>MichaelDapper@gmial.com</span>
        </div>

        <div className="flex justify-between items-center px-4 border-gray-200 border-b-[1px] pb-2">
          <span className="font-semibold">Phone number -</span>
          <span>+234 8142658412</span>
        </div>

        <div className="flex justify-between items-center px-4 pb-2 border-gray-200 border-b-[1px]">
          <span className="font-semibold">Next of Kin -</span>
          <span>Queen Dapper</span>
        </div>

        <div className="flex justify-between items-center px-4 pb-2 border-gray-200 border-b-[1px]">
          <span className="font-semibold">Next of Kin Phone number -</span>
          <span>+234 8146261863</span>
        </div>

        <div className="flex justify-between items-center px-4 pb-2">
          <span className="font-semibold">Contact Address -</span>
          <span>Frazan Estate, Kashim Ibrahim Way, Kaduna</span>
        </div>
      </div>
    </div>
  );

  const TransactionsContent = () => (
    <div className="space-y-6">
      <h2 className="text-[16px] font-semibold mb-8">Transactions</h2>
      <div className="overflow-x-auto bg-white rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[12px] ">
              <th className="pb-2 pt-2 pl-4">Status</th>
              <th className="pb-2 pt-2">Date</th>
              <th className="pb-2 pt-2">Amount</th>
              <th className="pb-2 pt-2">Description</th>
              <th className="pb-2 pt-2">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr
                key={index}
                className=" border-t-[1px] border-gray-200 text-[11px]"
              >
                <td className="py-4 pl-6">
                  <div className="text-green-500">▲</div>
                </td>
                <td className="py-4">12/10/2024</td>
                <td className="py-4">NGN 23,000</td>
                <td className="py-4">Shared Office #23</td>
                <td className="py-4">
                  <a
                    href="#"
                    className="text-gray-600 underline flex items-center gap-1"
                  >
                    <img src={adobeIcon} alt="adobe icon" width={17} />
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const TeamContent = () => (
    <div className="space-y-6 ">
      <h2 className="text-[16px] font-semibold">Team</h2>
      <div className="text-center bg-white rounded-lg px-6 pt-6 pb-16 flex flex-col items-center">
        <img src={subscriptionLogo} alt="icon" width={70} />

        <h3 className="text-xl font-semibold">Team not applicable</h3>
        <p className="text-[12px]">
          You are not a part of any team or corporate workspace
        </p>
      </div>
    </div>
  );

  const DocumentContent = () => (
    <div className="space-y-6 ">
      <h2 className="text-[16px] font-semibold">Document</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-lg px-6 pt-6 pb-10">
        {[
          { title: "Lease agreement", icon: subscriptionLogo },
          { title: "ID Card", icon: subscriptionLogo },
        ].map((doc, index) => (
          <div key={index} className="p-2 bg-white rounded-lg border">
            <div className="mb-4 text-4xl bg-[#F7F8FA] rounded-sm flex justify-center items-center h-[100px]">
              <img src={doc.icon} alt="icon" width={50} />
            </div>
            <h3 className="text-[13px] font-semibold mb-1">{doc.title}</h3>
            <div className="flex items-center gap-2.5 text-[12px] font-semibold">
              <button className="text-green-600 flex items-center gap-1">
                <img src={adobeIcon} alt="adobe icon" width={17} />
                Open
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-gray-600">Update</button>
            </div>
          </div>
        ))}
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
      case "Transactions":
        return <TransactionsContent />;
      case "Team":
        return <TeamContent />;
      case "Document":
        return <DocumentContent />;
      default:
        return <div className="p-4">Content for {activeTab}</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg min-h-[700px]">
      <div className="mb-6">
        <h1 className="text-[15px] font-bold">Profile</h1>
        <div className="text-gray-500 text-[11px] mt-0.5">
          <Link to="/subscription" className="text-gray-800 font-semibold">
            Subscription
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

export default ProfileDashboard;
