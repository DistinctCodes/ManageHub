import {
  spaceImageOne,
  spaceImageTwo,
  spaceImageThree,
  deskSetupIcon,
  greenCircleIcon2,
  plusIcon,
  plusSignIcon,
  minusSignIcon,
  uploadIcon,
  closeIcon2,
} from "../../assets";
import GenButton from "../../components/Buttons/GenButton";
import SpacesCard from "../../components/SpacesCard";
import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../index.css";
import CustomToast from "../../components/CustomToast";

import { useNavigate } from "react-router-dom";

const Spaces = () => {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();

  const toggleNewSpaceVisibility = () => {
    setOpen((prev) => !prev);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // toast.success("Space created successfully");
    toast(<CustomToast message="Space created Successfully" />);
    setOpen((prev) => !prev);
    navigate("/spaces");
  };

  const spacesData = [
    {
      id: 1,
      image: spaceImageOne,
      title: "Shared Office Space",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N4,200",
        monthly: "N40,000",
        yearly: "N550,000",
      },
    },
    {
      id: 2,
      image: spaceImageTwo,
      title: "Private Office",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N10,000",
        monthly: "N250,000",
        yearly: "N1.2m",
      },
    },
    {
      id: 3,
      image: spaceImageThree,
      title: "Conference Room",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N10,000",
        monthly: "N500,000",
        yearly: "N4m",
      },
    },
    {
      id: 4,
      image: spaceImageOne,
      title: "Shared Office Space",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N4,200",
        monthly: "N40,000",
        yearly: "N550,000",
      },
    },
    {
      id: 5,
      image: spaceImageTwo,
      title: "Private Office",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N10,000",
        monthly: "N250,000",
        yearly: "N1.2m",
      },
    },
    {
      id: 6,
      image: spaceImageThree,
      title: "Conference Room",
      statusColor: {
        green: greenCircleIcon2,
      },
      description: "23 Allowances",
      subscriptionType: {
        daily: "N10,000",
        monthly: "N500,000",
        yearly: "N4m",
      },
    },
  ];

  return (
    <>
      <main className="relative">
        {/* banner */}
        <div className="flex justify-between px-6 py-5 sm:py-8 bg-[#F2F0EE] rounded-lg overflow-hidden sm:flex-row flex-col gap-4 sm:gap-0">
          <div>
            <h2 className="font-bold text-[15px]">
              Create and manage hub spaces
            </h2>
            <p className="text-[10px]">
              seamlessly stride for better collaboration and productivity
            </p>
          </div>

          <div className="flex relative gap-6">
            <div className="absolute -top-5 -left-[150px] hidden lg:block">
              <img src={deskSetupIcon} alt="desk icon" width={130} />
            </div>

            {/* <GenButton>New Space</GenButton>
             */}

            <button
              onClick={toggleNewSpaceVisibility}
              className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-sm"
            >
              <img src={plusIcon} alt="plus icon" width={18} className="" />
              New Space
            </button>
          </div>
        </div>

        {/* avalailable spaces */}
        <div className="mt-5">
          <h3 className="font-bold text-[12px]">Available Spaces</h3>

          <div>
            {/* cards section */}
            <div className=" grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
              {/* card */}
              {spacesData.map((space) => {
                const {
                  id,
                  image,
                  title,
                  description,
                  statusColor,
                  subscriptionType,
                } = space;
                return (
                  <SpacesCard
                    key={id}
                    spaceImage={image}
                    spaceTitle={title}
                    spaceDescription={description}
                    spaceStatusColor={statusColor.green}
                    daily={subscriptionType.daily}
                    monthly={subscriptionType.monthly}
                    yearly={subscriptionType.yearly}
                  />
                );
              })}
            </div>

            {/* horizontal rule */}
            <div className="pt-5 pb-3">
              <hr />
            </div>

            {/* pagination and next */}
            <div className="flex sm:justify-between sm:items-center sm:flex-row flex-col-reverse gap-4 sm:gap-0 items-center justify-center">
              <div className="flex items-center gap-2 pl-5">
                <button
                  type="button"
                  className="text-[11px] text-gray-600 font-semibold px-2 py-1 rounded-md border-gray-400 border-[1px] bg-white"
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="text-[11px] text-gray-600 font-semibold px-2 py-1 rounded-md border-gray-400 border-[1px] bg-white"
                >
                  Next
                </button>
              </div>

              <p className="text-[10px] text-[#344054] ml-6 sm:ml-0">
                Page 1 of 10
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL TO ADD SPACE */}
      {open && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center "
        >
          <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
          <DialogPanel className="relative z-10 w-full max-w-sm  bg-white rounded-md shadow-lg">
            <div className="flex flex-col items-center ">
              {/* FIRST SECTION */}
              <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg">
                <div>
                  <DialogTitle className="font-bold text-[13px]">
                    Add New Space
                  </DialogTitle>
                  <p className="text-[10px]">Configure space data</p>
                </div>

                <button onClick={() => setOpen(false)} className="">
                  <img src={closeIcon2} alt="close icon" width={10} />
                </button>
              </div>

              {/* SPACE BODY */}
              <form onSubmit={handleFormSubmit}>
                {/* space name */}
                <div className=" w-full px-4 pt-2">
                  <label
                    htmlFor="spaceName"
                    className="text-[11px] font-semibold"
                  >
                    Space Name
                  </label>
                  <div className="w-full">
                    <input
                      type="text"
                      name="spaceName"
                      id="spaceName"
                      placeholder="Enter the name of this space"
                      className="w-full placeholder:text-[11px]  bg-[#FAFAFA] rounded-md border-gray-200 border-[1px] pl-3 text-[12px] py-1 text-gray-500"
                    />
                  </div>
                </div>

                {/* maximum capacity */}
                <div className=" w-full px-4 pt-2">
                  <label
                    htmlFor="spaceName"
                    className="text-[11px] font-semibold"
                  >
                    Maximum Capacity
                  </label>
                  <div className="flex gap-1.5">
                    <div className="w-[30%]">
                      <input
                        type="text"
                        name="spaceName"
                        id="spaceName"
                        value={0}
                        placeholder="Enter the name of this space"
                        className="w-full placeholder:text-[12px] bg-[#FAFAFA] rounded-md border-gray-200 border-[1px] pl-3 text-[11px] py-1 text-gray-500"
                      />
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="bg-[#FAFAFA] rounded-md px-2 py-[3px] border-gray-200 border-[1px]"
                      >
                        <img src={plusSignIcon} alt="plus icon" width={17} />
                      </button>

                      <button
                        type="button"
                        className="bg-[#FAFAFA] rounded-md px-2 py-[3px] border-gray-200 border-[1px]"
                      >
                        <img src={minusSignIcon} alt="plus icon" width={17} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* subscription types */}
                <div className=" w-full px-4 pt-2 flex flex-col gap-3.5 mt-2">
                  <label
                    htmlFor="spaceName"
                    className="text-[11px] font-semibold "
                  >
                    Subscription Types
                  </label>

                  {/* FIRST TYPE */}
                  <div className="flex items-center justify-between -mt-1">
                    {/* left */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsActive(!isActive)}
                        className={`
        relative w-10 h-5 rounded-full p-1 transition-colors duration-200
        ${isActive ? "bg-[#FEDC44]" : "bg-[#FAFAFA] "}
      `}
                        aria-pressed={isActive}
                        type="button"
                      >
                        <span
                          className={`
          block w-[15px] h-[15px] -mt-[2px] rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
          ${isActive ? "translate-x-4" : "translate-x-0"}
        `}
                        />
                      </button>

                      <p className="text-[11px] text-[#344054]">Daily</p>
                    </div>

                    {/* right */}
                    <div className="w-[50%] mr-[60px]">
                      <input
                        type="text"
                        name="spaceName"
                        id="spaceName"
                        placeholder="N  0.00"
                        className="w-full placeholder:text-[12px]  bg-[#FAFAFA] rounded-md border-gray-300 border-[1px] pl-3 text-[12px] py-1 text-gray-500"
                      />
                    </div>
                  </div>

                  {/* SECOND TYPE */}
                  <div className="flex items-center justify-between">
                    {/* left */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsActive(!isActive)}
                        className={`
        relative w-10 h-5 rounded-full p-1 transition-colors duration-200
        ${isActive ? "bg-[#FEDC44]" : "bg-[#FAFAFA] "}
      `}
                        aria-pressed={isActive}
                        type="button"
                      >
                        <span
                          className={`
          block w-[15px] h-[15px] -mt-[2px] rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
          ${isActive ? "translate-x-4" : "translate-x-0"}
        `}
                        />
                      </button>

                      <p className="text-[11px] text-[#344054]">Monthly</p>
                    </div>

                    {/* right */}
                    <div className="w-[50%] mr-[60px]">
                      <input
                        type="text"
                        name="spaceName"
                        id="spaceName"
                        placeholder="N  0.00"
                        className="w-full placeholder:text-[12px]  bg-[#FAFAFA] rounded-md border-gray-300 border-[1px] pl-3 text-[12px] py-1 text-gray-500"
                      />
                    </div>
                  </div>

                  {/* THIRD TYPE */}
                  <div className="flex items-center justify-between">
                    {/* left */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsActive(!isActive)}
                        className={`
        relative w-10 h-5 rounded-full p-1 transition-colors duration-200
        ${isActive ? "bg-[#FEDC44]" : "bg-[#FAFAFA] "}
      `}
                        aria-pressed={isActive}
                        type="button"
                      >
                        <span
                          className={`
          block w-[15px] h-[15px] -mt-[2px] rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
          ${isActive ? "translate-x-4" : "translate-x-0"}
        `}
                        />
                      </button>

                      <p className="text-[11px] text-[#344054]">Yearly</p>
                    </div>

                    {/* right */}
                    <div className="w-[50%] mr-[60px]">
                      <input
                        type="text"
                        name="spaceName"
                        id="spaceName"
                        placeholder="N  0.00"
                        className="w-full placeholder:text-[12px]  bg-[#FAFAFA] rounded-md border-gray-300 border-[1px] pl-3 text-[12px] py-1 text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* photos */}
                <div className="w-full px-4 pt-2 mb-4 mt-2">
                  <h3 className="text-[12px] font-semibold ">Photos</h3>

                  <div className="border-[1px] border-gray-100 py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                    {/* left section */}
                    <div className="flex gap-1">
                      <img src={uploadIcon} alt="upload icon" width={26} />

                      <div>
                        <h3 className="text-[11px] font-semibold">
                          Tap to Upload
                        </h3>
                        <p className="text-[9px] text-gray-400 font-semibold">
                          SVG, PNG, JPG, GIF | 10MB max
                        </p>
                      </div>
                    </div>

                    {/* right section */}
                    <button className="bg-black  text-white flex items-center gap-1 px-3 h-[28px] text-[10px]  font-normal text-nowrap rounded-md">
                      Upload
                    </button>
                  </div>
                </div>

                <div className="h-[1.2px] bg-gray-100 w-full"></div>

                <div className="h-2 w-full pb-4" />

                {/* CREATE NEW SPACE SECTION */}
                <div className="px-4 w-full">
                  <button
                    className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-md w-full justify-center mb-4"
                    type="submit"
                  >
                    <img
                      src={plusIcon}
                      alt="plus icon"
                      width={18}
                      className=""
                    />
                    Create Space
                  </button>
                </div>
              </form>
            </div>
          </DialogPanel>
        </Dialog>
      )}
    </>
  );
};

export default Spaces;
