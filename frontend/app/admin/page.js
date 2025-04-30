import {
    addHubUserIcon,
    addStaffIcon,
    plusIcon,
    spaceManagementIcon,
    graphChartIcon,
    greenCircleIcon2,
    greenIncreaseIcon,
    greenShortArrowUpIcon,
    redDecreaseIcon,
    threeDotsIcon,
    downShortBlackArrowIcon,
    newHubUserIcon,
    closeIcon2,
    importIcon,
    uploadIcon,
    cashIcon,
    cardPaymentIcon,
    bankTransferIcon,
    checkBlackIcon,
    meshIcon,
    MJAY,
    roundClockLogo,
    addTeamMemberIcon,
  } from "../../assets";
  import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
  } from "@headlessui/react";
  import H3 from "../../components/H3";
  import RecentActivities from "../../components/RecentActivities";
  import BarChart from "../../components/BarChart";
  import { Link } from "react-router-dom";
  import { useState } from "react";
  import { useNavigate } from "react-router-dom";
  import { toast } from "react-toastify";
  import "react-toastify/dist/ReactToastify.css";
  import "../../index.css";
  import CustomToast from "../../components/CustomToast";
  import CustomInput from "../../components/CustomInput";
  import CustomDropdown from "../../components/CustomDropdown";
  import { Form, Formik } from "formik";
  import { Schemas, initialValues } from "../../utils/validationShema";
  import { useAdmin } from "../../context/AdminContext";
  
  const AdminHome = () => {
    const navigate = useNavigate();
    const { user } = useAdmin();
    const [addNewHubUser, setAddNewHubUser] = useState(false);
    const [addNewStaff, setAddNewStaff] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [verifyHubUserIdentity, setVerifyHubUserIdentity] = useState(false);
    const [verifyStaffIdentity, setVerifyStaffIdentity] = useState(false);
    const [addTeamMembers, setAddTeamMembers] = useState(false);
    const [
      addTeamMembersbyEmailAndNameContainer,
      setAddTeamMembersbyEmailAndNameContainer,
    ] = useState(false);
    const [completePaymentModal, setCompletePaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState("card");
  
    const handlePaymentSelection = (method, e) => {
      e.preventDefault();
      setSelectedPayment(method);
    };
  
    const handlePaymentFormSubmission = (e) => {
      e.preventDefault();
      setCompletePaymentModal((prev) => !prev);
      setVerifyHubUserIdentity((prev) => !prev);
    };
  
    const handleHubUserVerificationFormSubmission = (e) => {
      e.preventDefault();
      setVerifyHubUserIdentity((prev) => !prev);
      toast(<CustomToast message={"Hub user added successfully"} />);
    };
  
    const handleNewHubUserFormSubmit = () => {
      toggleCompletePaymentModalVisibility();
    };
  
    const toggleCompletePaymentModalVisibility = () => {
      setAddNewHubUser((prev) => !prev);
      setCompletePaymentModal((prev) => !prev);
    };
  
    const handleStaffFormSubmit = () => {
      setAddNewStaff((prev) => !prev);
      setVerifyStaffIdentity((prev) => !prev);
    };
  
    const handleStaffVerificationFormSubmission = (e) => {
      e.preventDefault();
      setVerifyStaffIdentity((prev) => !prev);
      toast(<CustomToast message="New Staff created Successfully" />);
      navigate("/dashboard");
    };
  
    const handleTeamFormSubmit = () => {
      setAddNewHubUser((prev) => !prev);
      setAddTeamMembers((prev) => !prev);
    };
  
    const handleAddTeamMembersForm = () => {
      toast(<CustomToast message="New Team created Successfully" />);
    };
  
    const handleSendInviteTeamMembers = () => {
      setAddTeamMembers((prev) => !prev);
      setCompletePaymentModal((prev) => !prev);
    };
  
    return (
      <>
        <main className="flex flex-col gap-6">
          {/* quick actions section */}
          <div className="">
            <p className="font-semibold text-[13px]">Quick Actions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-1">
              {/* first action box */}
              <Link to={"/spaces"}>
                <div className="w-full rounded-md bg-[#f2f2f2] flex justify-between items-center px-4 py-5 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                  <div className="flex items-center gap-2">
                    <img
                      src={spaceManagementIcon}
                      alt="space management icon"
                      width={35}
                      height={35}
                    />
  
                    <p className="text-[12px] font-semibold">Space Management</p>
                  </div>
                </div>
              </Link>
  
              {/* second action box */}
              <button
                className="w-full rounded-md bg-[#f2f2f2] flex justify-between items-center px-4 py-5 shadow-sm hover:scale-105 transition-transform"
                type="button"
                onClick={() => setAddNewHubUser((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={addHubUserIcon}
                    alt="space management icon"
                    width={35}
                    height={35}
                  />
  
                  <p className="text-[12px] font-semibold">Add Hub User</p>
                </div>
  
                <img src={plusIcon} alt="plus icon" width={20} />
              </button>
  
              {/* third action box - hidden on sm */}
  
              <button
                className="w-full  sm:hidden lg:flex rounded-md bg-[#f2f2f2] flex justify-between items-center px-4 py-5 shadow-sm hover:scale-105 transition-transform"
                type="button"
                onClick={() => setAddNewStaff((prev) => !prev)}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={addStaffIcon}
                    alt="space management icon"
                    width={35}
                    height={35}
                  />
  
                  <p className="text-[12px] font-semibold">Add Staff</p>
                </div>
  
                <img src={plusIcon} alt="plus icon" width={20} />
              </button>
            </div>
  
            {/* third action box - Hidden on large screen*/}
            <div className="w-full hidden sm:flex lg:hidden rounded-md bg-[#f2f2f2] justify-between items-center px-4 py-5 mt-4 shadow-sm">
              <div className="flex items-center gap-2">
                <img
                  src={addStaffIcon}
                  alt="space management icon"
                  width={35}
                  height={35}
                />
  
                <p className="text-[12px] font-semibold">Add Staff</p>
              </div>
  
              <img src={plusIcon} alt="plus icon" width={20} />
            </div>
          </div>
  
          {/* stats section */}
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
                          <span className="text-[#027A48] font-semibold">
                            40%
                          </span>{" "}
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
                  <img
                    src={greenCircleIcon2}
                    alt="green circle icon"
                    width={12}
                  />
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
                          <span className="text-[#027A48] font-semibold">
                            40%
                          </span>{" "}
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
  
          {/* recent activities section */}
          <div className="">
            <p className="font-semibold text-[13px]">Recent Activities</p>
  
            <div className="flex gap-4 mt-1 flex-col lg:flex-row">
              {/* activities section */}
              <div className="w-full lg:w-[67.5%] shadow-md rounded-b-lg">
                <RecentActivities />
              </div>
  
              {/* user distribution section */}
              <div className="w-full lg:w-[32.5%] shadow-md rounded-b-lg">
                <div className="w-full mx-auto bg-white rounded-lg">
                  <div className="flex justify-between items-start px-2 pt-2.5 pb-2">
                    <div>
                      <h3 className="text-[12px] font-semibold">
                        User Distribution
                      </h3>
                    </div>
  
                    <img src={threeDotsIcon} alt="more info icon" width={16} />
                  </div>
  
                  <hr />
  
                  <div className="pl-3 pr-2 pt-6 pb-5">
                    {/* spaces section */}
                    <div className="flex gap-2">
                      <div className="bg-[#F4F5F4] rounded-full px-2 py-1 text-[12px] font-semibold flex items-center">
                        54 Persons
                      </div>
  
                      <div className="flex gap-2 items-center text-[12px] font-semibold bg-[#F4F5F4] rounded-full px-2 py-1">
                        <img
                          src={spaceManagementIcon}
                          alt="space icon"
                          width={18}
                        />{" "}
                        6 Spaces
                      </div>
                    </div>
  
                    {/* bar chart section */}
                    {/* <div></div> */}
                    <BarChart width={160} />
  
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
        </main>
  
        {/* ADD NEW HUB USER */}
        {addNewHubUser && (
          <Dialog
            open={addNewHubUser}
            onClose={() => setAddNewHubUser((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
  
            <DialogPanel className="relative z-10 w-full max-w-[700px] bg-white rounded-md shadow-lg">
              <div className="flex flex-col h-[500px] overflow-y-auto">
                {" "}
                {/* Set max height and overflow */}
                {/* FIRST SECTION */}
                <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg sticky top-0 z-10">
                  <div>
                    <DialogTitle className="font-bold text-[13px]">
                      New Hub User
                    </DialogTitle>
                    <p className="text-[10px]">
                      Please fill out the necessary details to add a new user to
                      this hub
                    </p>
                  </div>
  
                  <div className="flex relative">
                    <div className="absolute -top-5 -left-[250px] hidden md:block">
                      <img src={newHubUserIcon} alt="desk icon" width={130} />
                    </div>
                    <button
                      onClick={() => setAddNewHubUser((prev) => !prev)}
                      className="mt-2 mr-1"
                    >
                      <img src={closeIcon2} alt="close icon" width={10} />
                    </button>
                  </div>
                </div>
                {/* SPACE BODY */}
                <div className="px-4">
                  {/* 1st section */}
                  <div className="flex items-center justify-start mt-3 gap-2">
                    <div className="bg-blue-100 text-blue-500 px-1 py-1 rounded-md border-[1px] border-blue-500 text-[10px] font-semibold">
                      For a team?
                    </div>
  
                    {/* toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsActive(!isActive)}
                        className={`relative w-10 h-5 rounded-full p-1 transition-colors duration-200 ${
                          isActive ? "bg-[#095A94]" : "bg-[#e6e6e6] "
                        }`}
                        aria-pressed={isActive}
                        type="button"
                      >
                        <span
                          className={`block w-[15px] h-[15px] -mt-[2px] rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                            isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
  
                  {isActive ? (
                    <div>
                      {/* 2nd section */}
                      <div className="flex justify-between items-center mt-4">
                        <h2 className="text-[13px] font-semibold">
                          Team Information
                        </h2>
                        <button
                          className="flex items-center gap-1 border-[1px] border-gray-300 rounded-md px-2 py-1"
                          type="button"
                        >
                          <img src={importIcon} alt="upload icon" width={12} />
                          <p className="text-[10px] ">Import CSV</p>
                        </button>
                      </div>
  
                      {/* 3rd section */}
                      <Formik
                        initialValues={initialValues.teamUser}
                        validationSchema={Schemas.teamUserSchema}
                        onSubmit={handleTeamFormSubmit}
                      >
                        {({ values, isSubmitting, errors }) => {
                          console.log(errors);
                          return (
                            <Form className="max-w-[1000px] mx-auto mt-1">
                              {/* first section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomInput
                                  name="companyName"
                                  type="text"
                                  label="Company/Group Name"
                                  placeholder="Please enter your company name"
                                />
  
                                <CustomInput
                                  name="contactEmail"
                                  type="email"
                                  label="Contact Email Address"
                                  placeholder="Enter company/contact email"
                                />
  
                                <CustomInput
                                  name="contactPhoneNumber"
                                  type="tel"
                                  label="Contact Phone Number"
                                  placeholder="+234"
                                />
  
                                <CustomDropdown
                                  name="gender"
                                  label="Contact Gender"
                                  options={[
                                    { value: "male", label: "Male" },
                                    {
                                      value: "female",
                                      label: "Female",
                                    },
                                  ]}
                                />
  
                                <CustomDropdown
                                  name="subscriptionType"
                                  label="Subscription Type"
                                  options={[
                                    { value: "daily", label: "Daily" },
                                    { value: "quarterly", label: "Quarterly" },
                                    { value: "monthly", label: "Monthly" },
                                  ]}
                                />
                                <CustomDropdown
                                  name="spaceAllocated"
                                  label="Allocate Space"
                                  options={[
                                    { value: "hub one", label: "Hub One" },
                                    {
                                      value: "conference room",
                                      label: "Conference Room",
                                    },
                                    {
                                      value: "training room",
                                      label: "Training Room",
                                    },
                                  ]}
                                />
                              </div>
  
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                                <CustomInput
                                  name="startDate"
                                  type="text"
                                  label="Start Date"
                                  placeholder="Selected start date"
                                />
  
                                <CustomDropdown
                                  name="paymentChannel"
                                  label="Payment Channel"
                                  options={[
                                    {
                                      value: "bank transfer",
                                      label: "Bank Transfer",
                                    },
                                    {
                                      value: "card payment",
                                      label: "Card Payment",
                                    },
                                    { value: "cash", label: "Cash" },
                                  ]}
                                />
  
                                <CustomInput
                                  name="referralCode"
                                  type="text"
                                  label="Referral Code (Optional)"
                                  placeholder="Enter code"
                                />
                              </div>
  
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <h2 className="text-[13px] font-semibold">
                                  Additional Information
                                </h2>
                                <div></div>
                                <CustomDropdown
                                  name="contactIdentificationType"
                                  label="Contact Person Identification Type"
                                  options={[
                                    { value: "NIN", label: "NIN" },
                                    {
                                      value: "Drivers License",
                                      label: "Drivers License",
                                    },
                                  ]}
                                />
                                <CustomInput
                                  name="contactAddress"
                                  type="text"
                                  label="Contact Address"
                                  placeholder="Enter your address"
                                />
                              </div>
  
                              {/* 3rd section - UPLOAD DOCUMENT */}
                              <div className="mt-6 mb-4">
                                <h3 className="text-[12px]">
                                  Upload Selected document
                                </h3>
  
                                <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1.5">
                                  {/* left section */}
                                  <div className="flex gap-1">
                                    <img
                                      src={uploadIcon}
                                      alt="upload icon"
                                      width={26}
                                    />
  
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
  
                              {/* last section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomInput
                                  name="nextOfKinName"
                                  type="text"
                                  label="Next of kin Name"
                                  placeholder="Name of NOK"
                                />
                                <CustomInput
                                  name="nextOfKinPhone"
                                  type="text"
                                  label="Phone number of NOK"
                                  placeholder="Enter your address"
                                />
  
                                {/* passport */}
                                <div className="w-full mt-1">
                                  <h3 className="text-[11px] font-semibold">
                                    Passport/Profile Photo
                                  </h3>
  
                                  <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                    {/* left section */}
                                    <div className="flex gap-1">
                                      <img
                                        src={uploadIcon}
                                        alt="upload icon"
                                        width={26}
                                      />
  
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
  
                                {/* lease agreement */}
                                <div className="w-full mt-1">
                                  <h3 className="text-[11px] font-semibold ">
                                    Signed Lease Agreement Copy
                                  </h3>
  
                                  <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                    {/* left section */}
                                    <div className="flex gap-1">
                                      <img
                                        src={uploadIcon}
                                        alt="upload icon"
                                        width={26}
                                      />
  
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
  
                                {/* CREATE NEW SPACE SECTION */}
                                <div className="col-span-1 md:col-span-2 mt-4 flex justify-end">
                                  <button
                                    className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px] font-bold text-nowrap rounded-md justify-end mb-4"
                                    type="submit"
                                  >
                                    <img
                                      src={plusIcon}
                                      alt="plus icon"
                                      width={18}
                                      className=""
                                    />
                                    Add User
                                  </button>
                                </div>
                              </div>
                            </Form>
                          );
                        }}
                      </Formik>
  
                      <div className="h-[1.2px] bg-gray-100 w-full"></div>
                    </div>
                  ) : (
                    <div>
                      {/* 2nd section */}
                      <div className="flex justify-between items-center mt-4">
                        <h2 className="text-[13px] font-semibold">
                          User Information
                        </h2>
                        <button
                          className="flex items-center gap-1 border-[1px] border-gray-300 rounded-md px-2 py-1"
                          type="button"
                        >
                          <img src={importIcon} alt="upload icon" width={12} />
                          <p className="text-[10px] ">Import CSV</p>
                        </button>
                      </div>
  
                      {/* 3rd section */}
                      <Formik
                        initialValues={initialValues.subscriptionUser}
                        validationSchema={Schemas.subscriptionUserSchema}
                        onSubmit={handleNewHubUserFormSubmit}
                      >
                        {({ values, isSubmitting, errors }) => {
                          console.log(errors);
                          return (
                            <Form className="max-w-[1000px] mx-auto mt-1">
                              {/* top section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomInput
                                  name="fullName"
                                  type="text"
                                  label="Full Name"
                                  placeholder="Please enter your full name"
                                />
                                <CustomInput
                                  name="email"
                                  type="email"
                                  label="Email"
                                  placeholder="Your email"
                                />
                                <CustomInput
                                  name="phoneNumber"
                                  type="tel"
                                  label="Phone Number"
                                  placeholder="+234"
                                />
                                <CustomDropdown
                                  name="gender"
                                  label="Gender"
                                  options={[
                                    { value: "male", label: "Male" },
                                    {
                                      value: "female",
                                      label: "Female",
                                    },
                                  ]}
                                />
                                <CustomDropdown
                                  name="subscriptionType"
                                  label="Subscription Type"
                                  options={[
                                    { value: "daily", label: "Daily" },
                                    { value: "quarterly", label: "Quarterly" },
                                    { value: "monthly", label: "Monthly" },
                                  ]}
                                />
                                <CustomDropdown
                                  name="spaceAllocated"
                                  label="Allocate Space"
                                  options={[
                                    { value: "hub one", label: "Hub One" },
                                    {
                                      value: "conference room",
                                      label: "Conference Room",
                                    },
                                    {
                                      value: "training room",
                                      label: "Training Room",
                                    },
                                  ]}
                                />
                              </div>
  
                              {/* 2nd section */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                                <CustomInput
                                  name="startDate"
                                  type="text"
                                  label="Start Date"
                                  placeholder="Selected start date"
                                />
  
                                <CustomDropdown
                                  name="paymentChannel"
                                  label="Payment Channel"
                                  options={[
                                    {
                                      value: "bank transfer",
                                      label: "Bank Transfer",
                                    },
                                    {
                                      value: "card payment",
                                      label: "Card Payment",
                                    },
                                    { value: "cash", label: "Cash" },
                                  ]}
                                />
  
                                <CustomInput
                                  name="referralCode"
                                  type="text"
                                  label="Referral Code (Optional)"
                                  placeholder="Enter code"
                                />
                              </div>
  
                              {/* 3rd section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <h2 className="text-[13px] font-semibold">
                                  Additional Information
                                </h2>
                                <div></div>
                                <CustomDropdown
                                  name="identificationType"
                                  label="Identification Type"
                                  options={[
                                    { value: "NIN", label: "NIN" },
                                    {
                                      value: "Drivers License",
                                      label: "Drivers License",
                                    },
                                  ]}
                                />
                                <CustomInput
                                  name="contactAddress"
                                  type="text"
                                  label="Contact Address"
                                  placeholder="Enter your address"
                                />
                              </div>
  
                              {/* 4th section - UPLOAD DOCUMENT */}
                              <div className="mt-6 mb-4">
                                <h3 className="text-[12px]">
                                  Upload Selected document
                                </h3>
  
                                <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1.5">
                                  {/* left section */}
                                  <div className="flex gap-1">
                                    <img
                                      src={uploadIcon}
                                      alt="upload icon"
                                      width={26}
                                    />
  
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
  
                              {/* last section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <CustomInput
                                  name="nextOfKinName"
                                  type="text"
                                  label="Next of kin Name"
                                  placeholder="Name of NOK"
                                />
                                <CustomInput
                                  name="nextOfKinPhone"
                                  type="text"
                                  label="Phone number of NOK"
                                  placeholder="Enter your address"
                                />
  
                                {/* passport */}
                                <div className="w-full mt-1">
                                  <h3 className="text-[11px] font-semibold">
                                    Passport/Profile Photo
                                  </h3>
  
                                  <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                    {/* left section */}
                                    <div className="flex gap-1">
                                      <img
                                        src={uploadIcon}
                                        alt="upload icon"
                                        width={26}
                                      />
  
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
  
                                {/* lease agreement */}
                                <div className="w-full mt-1">
                                  <h3 className="text-[11px] font-semibold ">
                                    Signed Lease Agreement Copy
                                  </h3>
  
                                  <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                    {/* left section */}
                                    <div className="flex gap-1">
                                      <img
                                        src={uploadIcon}
                                        alt="upload icon"
                                        width={26}
                                      />
  
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
  
                                {/* CREATE NEW SPACE SECTION */}
                                <div className="col-span-1 md:col-span-2 mt-4 flex justify-end">
                                  <button
                                    className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px] font-bold text-nowrap rounded-md justify-end mb-4"
                                    type="submit"
                                  >
                                    <img
                                      src={plusIcon}
                                      alt="plus icon"
                                      width={18}
                                      className=""
                                    />
                                    Add User
                                  </button>
                                </div>
                              </div>
                            </Form>
                          );
                        }}
                      </Formik>
                    </div>
                  )}
  
                  <div className="h-[1.2px] bg-gray-100 w-full"></div>
                </div>
              </div>
            </DialogPanel>
          </Dialog>
        )}
  
        {/* TEAM - Add Team Members */}
        {addTeamMembers && (
          <Dialog
            open={addTeamMembers}
            onClose={() => setAddTeamMembers((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center "
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
            <DialogPanel className="relative z-10 w-full max-w-[400px]  bg-white rounded-md shadow-lg">
              <div className="flex flex-col items-center ">
                {/* FIRST SECTION */}
                <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg sticky top-0 z-10">
                  <div>
                    <DialogTitle className="font-bold text-[13px]">
                      Add Team Members
                    </DialogTitle>
                    <p className="text-[10px]">
                      Amazing journey with your team onboard
                    </p>
                  </div>
  
                  <button
                    onClick={() => setAddTeamMembers((prev) => !prev)}
                    className=""
                  >
                    <img src={closeIcon2} alt="close icon" width={10} />
                  </button>
                </div>
  
                {/* SPACE BODY */}
                <form onSubmit={handleAddTeamMembersForm} className="w-full">
                  {/* space name */}
                  <div className="w-[96%] mx-auto px-4 pt-3">
                    <div className="w-full border-[1px]  border-gray-200 rounded-lg px-3 py-2 flex  gap-2 mt-3">
                      <img
                        src={addTeamMemberIcon}
                        alt="add team members icon"
                        width={32}
                      />
  
                      <p className="text-[11px] text-gray-500 text-center">
                        You can add a team member by sending them a
                        preregistration invite or filling in their details.
                      </p>
                    </div>
                  </div>
  
                  {/* INSERT NEW GENERATED CODE HERE */}
                  <div className="w-[96%] mx-auto px-4 pt-5">
                    <div className="w-full">
                      <label
                        htmlFor="teamMemberEmail"
                        className=" text-[11px] mb-1 font-semibold"
                      >
                        Enter email of team member
                      </label>
                      <div className="flex items-center border border-gray-300  bg-gray-100 rounded-md overflow-hidden">
                        <input
                          id="teamMemberEmail"
                          type="text"
                          placeholder="Your email. add ',' for multiple additions"
                          className="flex-grow px-3 py-2 text-gray-600 focus:outline-none placeholder:text-[11px] text-[11px] bg-gray-100 "
                        />
                        <button
                          type="button"
                          className="bg-[#0A0909] text-white px-4 py-2 text-[11px] hover:bg-opacity-90"
                        >
                          Invite
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-4 bg-gray-100 rounded-lg px-1.5 py-1 w-[210px] border-[1px] border-gray-300 executive ml-auto">
                        <span className="text-[#1B2737] font-semibold text-[10px]">
                          Executive Office 2
                        </span>
                        <span className="bg-gray-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                          Max: 4 members
                        </span>
                      </div>
                    </div>
  
                    {addTeamMembersbyEmailAndNameContainer ? (
                      <>
                        <div className="w-full mt-4">
                          {/* USER 1 */}
                          <div className="flex flex-col gap-3">
                            <h3 className="text-[14px] -mb-3">User 1</h3>
                            {/* Email */}
                            <div>
                              <label
                                htmlFor="user1email"
                                className=" text-[11px] mb-1 font-semibold"
                              >
                                Email
                              </label>
                              <div className="flex items-center border border-gray-300  bg-gray-100 rounded-md overflow-hidden">
                                <input
                                  id="user1email"
                                  type="text"
                                  placeholder="Your email. add ',' for multiple additions"
                                  className="flex-grow px-3 py-2 text-gray-600 focus:outline-none placeholder:text-[11px] text-[11px] bg-gray-100 "
                                />
                              </div>
                            </div>
  
                            {/* Fullname */}
                            <div>
                              <label
                                htmlFor="user1fullname"
                                className=" text-[11px] mb-1 font-semibold"
                              >
                                Full Name
                              </label>
                              <div className="flex items-center border border-gray-300  bg-gray-100 rounded-md overflow-hidden">
                                <input
                                  id="user1fullname"
                                  type="text"
                                  placeholder="Enter full name"
                                  className="flex-grow px-3 py-2 text-gray-600 focus:outline-none placeholder:text-[11px] text-[11px] bg-gray-100 "
                                />
                              </div>
                            </div>
                          </div>
                        </div>
  
                        <div className="flex justify-between items-center mt-6 gap-3">
                          {/* Add more button */}
                          <button
                            className="border-[1px] border-gray-200 flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-md w-full justify-center"
                            type="button"
                          >
                            <img
                              src={plusIcon}
                              alt="plus icon"
                              width={18}
                              className=""
                            />
                            Add More
                          </button>
  
                          {/* submit button */}
                          <button
                            className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[30px] text-[12px]  font-bold text-nowrap rounded-md w-full justify-center"
                            onClick={handleSendInviteTeamMembers}
                          >
                            Submit
                          </button>
                        </div>
                      </>
                    ) : (
                      ""
                    )}
                  </div>
  
                  <div className="h-2 w-full pb-4" />
  
                  {/* ADD MEMBERS MANUALLY SECTION */}
                  {!addTeamMembersbyEmailAndNameContainer && (
                    <div className="px-4 w-[96%] mx-auto">
                      <button
                        className="border-[1px] border-gray-200 flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-md w-full justify-center mb-4 mt-5"
                        type="button"
                        onClick={() =>
                          setAddTeamMembersbyEmailAndNameContainer(
                            (prev) => !prev
                          )
                        }
                      >
                        <img
                          src={plusIcon}
                          alt="plus icon"
                          width={18}
                          className=""
                        />
                        Add Members Manually
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </DialogPanel>
          </Dialog>
        )}
  
        {/* COMPLETE PAYMENT MODAL */}
        {completePaymentModal && (
          <Dialog
            open={completePaymentModal}
            onClose={() => setCompletePaymentModal((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center "
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
            <DialogPanel className="relative z-10 w-full max-w-[400px]  bg-white rounded-md shadow-lg">
              <div className="flex flex-col items-center ">
                {/* FIRST SECTION */}
                <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg">
                  <div>
                    <DialogTitle className="font-bold text-[13px]">
                      Complete Payment
                    </DialogTitle>
                    <p className="text-[10px]">
                      Select your preferred payment channel and continue
                    </p>
                  </div>
  
                  <button
                    onClick={() => setCompletePaymentModal((prev) => !prev)}
                    className=""
                  >
                    <img src={closeIcon2} alt="close icon" width={10} />
                  </button>
                </div>
  
                {/* SPACE BODY */}
                <form className="w-full" onSubmit={handlePaymentFormSubmission}>
                  <div>
                    <div className="p-4">
                      <div className=" px-3 py-2 rounded-lg paymentGradient">
                        {/* Blue Header */}
                        <div className="bg-[#4285F4] text-white text-center py-0.5 rounded-full mb-4">
                          <h2 className="text-[14px] font-semibold">
                            Booking Information
                          </h2>
                        </div>
  
                        {/* Booking Details */}
                        <div className="space-y-3 mb-7">
                          <div className="flex justify-between w-[55%] mx-auto bg-white px-4 rounded-full text-[13px]">
                            <span className="text-gray-500">By</span>
                            <span className="font-medium">Mayow Crew 5</span>
                          </div>
  
                          <div className="flex justify-between w-[75%] mx-auto bg-white px-4 rounded-full text-[13px]">
                            <span className="text-gray-500">Space</span>
                            <span className="font-medium">
                              Hot desk H15 (Monthly)
                            </span>
                          </div>
  
                          <div className="flex justify-between w-[85%] mx-auto bg-white px-4 rounded-full text-[13px]">
                            <span className="text-gray-500">Expiry:</span>
                            <span className="font-medium">
                              24 days to ago (6th October)
                            </span>
                          </div>
                        </div>
                      </div>
  
                      {/* Payment Amount */}
                      <div className="text-center mb-8">
                        <p className="text-sm ">Make payment of</p>
                        <p className="text-[26px] font-bold">NGN 5250.00</p>
                      </div>
  
                      {/* Payment Channels */}
                      <div>
                        <h3 className="text-[14px] mb-2 font-medium">
                          Payment Channels
                        </h3>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={(e) => handlePaymentSelection("bank", e)} // Pass `e` to prevent default behavior
                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-[13px] ${
                              selectedPayment === "bank"
                                ? "bg-blue-50 border-blue-500"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={bankTransferIcon}
                                alt="bank transfer icon"
                                width={16}
                              />
                              <span>Bank Transfer</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                selectedPayment === "bank"
                                  ? "border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedPayment === "bank" && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full m-auto mt-1"></div>
                              )}
                            </div>
                          </button>
  
                          <button
                            type="button"
                            onClick={(e) => handlePaymentSelection("card", e)} // Pass `e` to prevent default behavior
                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-[13px] ${
                              selectedPayment === "card"
                                ? "bg-blue-50 border-blue-500"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={cardPaymentIcon}
                                alt="card payment icon"
                                width={16}
                              />
                              <span>Card Payment</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                selectedPayment === "card"
                                  ? "border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedPayment === "card" && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full m-auto mt-1"></div>
                              )}
                            </div>
                          </button>
  
                          <button
                            type="button"
                            onClick={(e) => handlePaymentSelection("cash", e)} // Pass `e` to prevent default behavior
                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-[13px] ${
                              selectedPayment === "cash"
                                ? "bg-blue-50 border-blue-500"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img src={cashIcon} alt="cash icon" width={16} />
                              <span>Cash</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border ${
                                selectedPayment === "cash"
                                  ? "border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedPayment === "cash" && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full m-auto mt-1"></div>
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
  
                  <div className="h-2 w-full pb-4" />
  
                  {/* SEND NOTIFICATION SECTION */}
                  <div className="px-4 w-full mx-auto">
                    <button
                      className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[30px] text-[12px]  font-bold text-nowrap rounded-md w-full justify-center mb-4"
                      type="submit"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </DialogPanel>
          </Dialog>
        )}
  
        {/* VERIFY HUB USER IDENTITY */}
        {verifyHubUserIdentity && (
          <Dialog
            open={verifyHubUserIdentity}
            onClose={() => setVerifyHubUserIdentity((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center "
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
  
            <DialogPanel className="z-10 w-screen h-screen  bg-white rounded-md shadow-lg fixed inset-0 px-8 py-6">
              {/* LOGO */}
              <div>
                <img src={roundClockLogo} alt="roundstone logo" width={100} />
              </div>
              {/* BODY */}
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center max-w-[800px] w-full mx-auto">
                  {/* VERIFICATION BODY */}
                  <form
                    className="w-full"
                    onSubmit={handleHubUserVerificationFormSubmission}
                  >
                    {/* USER INFO SECTION */}
                    <div className="relative max-w-[300px] mx-auto flex flex-col items-center gap-1">
                      <p className="text-[11px] lg:text-[13px] text-gray-600 font-semibold">
                        Hi Jeremiah
                      </p>
  
                      <DialogTitle className="font-semibold  text-[15px] lg:text-[18px]">
                        Verify your identity
                      </DialogTitle>
  
                      {/* mesh icon */}
                      <div className="absolute top-[18%] left-0 w-full">
                        <img src={meshIcon} alt="mesh icon" />
                      </div>
  
                      {/* USER IMAGE */}
                      <div className="h-[180px] w-[150px] flex justify-center items-center p-[2px] rounded-[50%] bg-gradient-to-t from-[#FF9B3E] to-[#0f98e0] mt-4">
                        <div className="h-full w-full rounded-[50%] flex justify-center items-center bg-white p-[6px]">
                          <img
                            src={MJAY}
                            alt="user image"
                            className="h-full w-full object-cover rounded-[50%]"
                          />
                        </div>
                      </div>
  
                      {/* PROGRESS SECTION */}
                      <div className="mt-1 flex flex-col gap-2 items-center">
                        {/* face detected */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          Face detected{" "}
                          <img src={checkBlackIcon} alt="check icon" width={10} />
                        </div>
  
                        {/* progress */}
                        <div className="flex justify-between items-center text-[9px] gap-8">
                          <div className="bg-green-400 w-[100px]">SCANNING</div>{" "}
                          90%
                        </div>
                      </div>
                    </div>
  
                    {/* SEND NOTIFICATION SECTION */}
                    <div className="px-4 max-w-[460px] mx-auto mt-[50px]">
                      <button
                        className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[35px] text-[10px] lg:text-[11px]  font-bold text-nowrap  w-full justify-center mb-4"
                        type="submit"
                      >
                        Submit Take
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogPanel>
          </Dialog>
        )}
  
        {/* STAFF SECTION */}
  
        {/* ADD NEW STAFF */}
        {addNewStaff && (
          <Dialog
            open={addNewStaff}
            onClose={() => setAddNewStaff((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
  
            <DialogPanel className="relative z-10 w-full max-w-[700px] bg-white rounded-md shadow-lg">
              <div className="flex flex-col h-[500px] overflow-y-auto">
                {" "}
                {/* Set max height and overflow */}
                {/* FIRST SECTION */}
                <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg sticky top-0 z-10">
                  <div>
                    <DialogTitle className="font-bold text-[13px]">
                      New Staff
                    </DialogTitle>
                    <p className="text-[10px]">
                      Please fill out the necessary details to add a new user to
                      this hub
                    </p>
                  </div>
                  <div className="flex relative">
                    <div className="absolute -top-5 -left-[250px] hidden md:block">
                      <img src={newHubUserIcon} alt="desk icon" width={130} />
                    </div>
                    <button
                      onClick={() => setAddNewStaff((prev) => !prev)}
                      className="mt-2 mr-1"
                    >
                      <img src={closeIcon2} alt="close icon" width={10} />
                    </button>
                  </div>
                </div>
                {/* SPACE BODY */}
                <div className="px-4">
                  {/* 2nd section */}
                  <div className="flex justify-between items-center mt-4">
                    <h2 className="text-[13px] font-semibold">
                      Staff Information
                    </h2>
                    <button
                      className="flex items-center gap-1 border-[1px] border-gray-300 rounded-md px-2 py-1"
                      type="button"
                    >
                      <img src={importIcon} alt="upload icon" width={12} />
                      <p className="text-[10px] ">Import CSV</p>
                    </button>
                  </div>
  
                  {/* 3rd section */}
                  <Formik
                    initialValues={initialValues.staff}
                    validationSchema={Schemas.staffSchema}
                    onSubmit={handleStaffFormSubmit}
                  >
                    {({ values, isSubmitting, errors }) => {
                      console.log(errors);
                      return (
                        <Form className="max-w-[1000px] mx-auto mt-1">
                          {/* first section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                              name="fullName"
                              type="text"
                              label="Full Name"
                              placeholder="Please enter your full name"
                            />
                            <CustomDropdown
                              name="role"
                              label="Role"
                              options={[
                                { value: "supervisor", label: "Suprvisor" },
                                { value: "manager", label: "Manager" },
                              ]}
                            />
                            <CustomDropdown
                              name="department"
                              label="Department"
                              options={[
                                { value: "projects", label: "Projects" },
                                { value: "facility", label: "Facility" },
                              ]}
                            />
                            <CustomInput
                              name="startDate"
                              type="text"
                              label="Start Date"
                              placeholder="Select your  start date"
                            />
                            <CustomInput
                              name="email"
                              type="email"
                              label="Email"
                              placeholder="Your email"
                            />
                            <CustomInput
                              name="phoneNumber"
                              type="tel"
                              label="Phone Number"
                              placeholder="+234"
                            />
  
                            <h2 className="text-[13px] font-semibold">
                              Additional Information
                            </h2>
                            <div></div>
                            <CustomDropdown
                              name="identificationType"
                              label="Identification Type"
                              options={[
                                { value: "NIN", label: "NIN" },
                                {
                                  value: "Drivers License",
                                  label: "Drivers License",
                                },
                              ]}
                            />
                            <CustomInput
                              name="contactAddress"
                              type="text"
                              label="Contact Address"
                              placeholder="Enter your address"
                            />
                          </div>
  
                          {/* 3rd section - UPLOAD DOCUMENT */}
                          <div className="mt-6 mb-4">
                            <h3 className="text-[12px]">
                              Upload Selected document
                            </h3>
  
                            <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1.5">
                              {/* left section */}
                              <div className="flex gap-1">
                                <img
                                  src={uploadIcon}
                                  alt="upload icon"
                                  width={26}
                                />
  
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
  
                          {/* last section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                              name="nextOfKinName"
                              type="text"
                              label="Next of kin Name"
                              placeholder="Name of NOK"
                            />
                            <CustomInput
                              name="nextOfKinPhone"
                              type="text"
                              label="Phone number of NOK"
                              placeholder="Enter your address"
                            />
  
                            {/* passport */}
                            <div className="w-full mt-1">
                              <h3 className="text-[11px] font-semibold">
                                Passport/Profile Photo
                              </h3>
  
                              <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                {/* left section */}
                                <div className="flex gap-1">
                                  <img
                                    src={uploadIcon}
                                    alt="upload icon"
                                    width={26}
                                  />
  
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
  
                            {/* lease agreement */}
                            <div className="w-full mt-1">
                              <h3 className="text-[11px] font-semibold ">
                                Signed Lease Agreement Copy
                              </h3>
  
                              <div className="border-[1px] border-[#d9dce1] py-2 px-3 rounded-lg flex justify-between items-center mt-1">
                                {/* left section */}
                                <div className="flex gap-1">
                                  <img
                                    src={uploadIcon}
                                    alt="upload icon"
                                    width={26}
                                  />
  
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
  
                            {/* CREATE NEW SPACE SECTION */}
                            <div className="col-span-1 md:col-span-2 mt-4 flex justify-end">
                              <button
                                className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px] font-bold text-nowrap rounded-md justify-end mb-4"
                                type="submit"
                              >
                                <img
                                  src={plusIcon}
                                  alt="plus icon"
                                  width={18}
                                  className=""
                                />
                                Add User
                              </button>
                            </div>
                          </div>
                        </Form>
                      );
                    }}
                  </Formik>
  
                  <div className="h-[1.2px] bg-gray-100 w-full"></div>
                </div>
              </div>
            </DialogPanel>
          </Dialog>
        )}
  
        {/* VERIFY STAFF IDENTITY */}
        {verifyStaffIdentity && (
          <Dialog
            open={verifyStaffIdentity}
            onClose={() => setVerifyStaffIdentity((prev) => !prev)}
            className="fixed inset-0 z-50 flex items-center justify-center "
          >
            <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
  
            <DialogPanel className="z-10 w-screen h-screen  bg-white rounded-md shadow-lg fixed inset-0 px-8 py-6">
              {/* LOGO */}
              <div>
                <img src={roundClockLogo} alt="roundstone logo" width={100} />
              </div>
              {/* BODY */}
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center max-w-[800px] w-full mx-auto">
                  {/* VERIFICATION BODY */}
                  <form
                    className="w-full"
                    onSubmit={handleStaffVerificationFormSubmission}
                  >
                    {/* USER INFO SECTION */}
                    <div className="relative max-w-[300px] mx-auto flex flex-col items-center gap-1">
                      <p className="text-[11px] lg:text-[13px] text-gray-600 font-semibold">
                        Hi Jeremiah
                      </p>
  
                      <DialogTitle className="font-semibold  text-[15px] lg:text-[18px]">
                        Verify your identity
                      </DialogTitle>
  
                      {/* mesh icon */}
                      <div className="absolute top-[18%] left-0 w-full">
                        <img src={meshIcon} alt="mesh icon" />
                      </div>
  
                      {/* USER IMAGE */}
                      <div className="h-[180px] w-[150px] flex justify-center items-center p-[2px] rounded-[50%] bg-gradient-to-t from-[#FF9B3E] to-[#0f98e0] mt-4">
                        <div className="h-full w-full rounded-[50%] flex justify-center items-center bg-white p-[6px]">
                          <img
                            src={MJAY}
                            alt="user image"
                            className="h-full w-full object-cover rounded-[50%]"
                          />
                        </div>
                      </div>
  
                      {/* PROGRESS SECTION */}
                      <div className="mt-1 flex flex-col gap-2 items-center">
                        {/* face detected */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          Face detected{" "}
                          <img src={checkBlackIcon} alt="check icon" width={10} />
                        </div>
  
                        {/* progress */}
                        <div className="flex justify-between items-center text-[9px] gap-8">
                          <div className="bg-green-400 w-[100px]">SCANNING</div>{" "}
                          90%
                        </div>
                      </div>
                    </div>
  
                    {/* SEND NOTIFICATION SECTION */}
                    <div className="px-4 max-w-[460px] mx-auto mt-[50px]">
                      <button
                        className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[35px] text-[10px] lg:text-[11px]  font-bold text-nowrap  w-full justify-center mb-4"
                        type="submit"
                      >
                        Submit Take
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogPanel>
          </Dialog>
        )}
      </>
    );
  };
  
  export default AdminHome;