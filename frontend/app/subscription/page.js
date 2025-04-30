import {
    subscriptionLogo,
    plusIcon,
    newHubUserIcon,
    closeIcon2,
    plusSignIcon,
    minusSignIcon,
    importIcon,
    actionsIcon,
    filterIcon,
    hubUserIcon,
    staffUserIcon,
    user1,
    user2,
    user3,
    user4,
    user5,
    user6,
    searchIconn,
    notificationBellIcon,
    faintNotificationBellIcon,
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
  import { useState } from "react";
  import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
  } from "@headlessui/react";
  import { BellAlertIcon, CheckIcon } from "@heroicons/react/24/outline";
  import { toast } from "react-toastify";
  import "react-toastify/dist/ReactToastify.css";
  import "../../index.css";
  import CustomToast from "../../components/CustomToast";
  import CustomInput from "../../components/CustomInput";
  import CustomDropdown from "../../components/CustomDropdown";
  import { useNavigate } from "react-router-dom";
  import { Form, Formik } from "formik";
  import { Schemas, initialValues } from "../../utils/validationShema";
  import { Bell } from "lucide-react";
  import { Link } from "react-router-dom";
  
  const Subscription = () => {
    const [isEmpty, setIsEmpty] = useState(true);
    const [open, setOpen] = useState(false);
    const [openReminder, setOpenReminder] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const navigate = useNavigate();
    const [addNewHubUser, setAddNewHubUser] = useState(false);
    const [verifyHubUserIdentity, setVerifyHubUserIdentity] = useState(false);
    const [completePaymentModal, setCompletePaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState("card");
    const [addTeamMembers, setAddTeamMembers] = useState(false);
    const [
      addTeamMembersbyEmailAndNameContainer,
      setAddTeamMembersbyEmailAndNameContainer,
    ] = useState(false);
  
    const toggleReminderVisibility = () => {
      setOpenReminder((prev) => !prev);
    };
  
    const handleSendNotificationSubmit = () => {
      toast(<CustomToast message="Notification sent Successfully" />);
      setOpenReminder((prev) => !prev);
      navigate("/subscription");
    };
  
    const toggleEmptyState = () => {
      setIsEmpty((prev) => !prev);
    };
  
    // EH EHN
    const toggleNewSpaceVisibility = () => {
      // setOpen((prev) => !prev);
      setAddNewHubUser((prev) => !prev);
    };
  
    const handleFormSubmit = () => {
      toast(<CustomToast message="Subscription created Successfully" />);
      setOpen((prev) => !prev);
      navigate("/subscription");
      toggleEmptyState();
    };
  
    // RECENTLY ADDED FUNCTIONS
  
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
      setIsEmpty(false);
      toast(<CustomToast message={"Hub user added successfully"} />);
    };
  
    const handleNewHubUserFormSubmit = () => {
      toggleCompletePaymentModalVisibility();
    };
  
    const toggleCompletePaymentModalVisibility = () => {
      setAddNewHubUser((prev) => !prev);
      setCompletePaymentModal((prev) => !prev);
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
  
    const transactions = [
      {
        id: 54646,
        name: "Michael Dappa",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Quarterly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user1,
      },
      {
        id: 755647,
        name: "Rebecca Yellowe",
        role: "Hub User",
        spaceAllocated: "Private Office #6",
        planType: "Monthly",
        expiry: "5 days",
        status: "Expires soon",
        sendNotification: true,
        image: user2,
      },
      {
        id: 889087,
        name: "Margaret Amachree",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "3 days",
        status: "Expires soon",
        sendNotification: true,
        image: user3,
      },
      {
        id: 102834,
        name: "Andrew Weridide",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user4,
      },
      {
        id: 643738,
        name: "Samuel Tubonimi",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user5,
      },
      {
        id: 424353,
        name: "Ruth Orji",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user6,
      },
      {
        id: 646453,
        name: "James Nwankwo",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user1,
      },
      {
        id: 554646,
        name: "Andrew Oyebanjo",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user2,
      },
      {
        id: 433535,
        name: "Priscilla Dappa",
        role: "Hub User",
        spaceAllocated: "Shared Office #24",
        planType: "Monthly",
        expiry: "60 days",
        status: "Active",
        sendNotification: false,
        image: user3,
      },
    ];
  
    return (
      <>
        {isEmpty && (
          <>
            <div className="px-4 sm:px-6 lg:px-8 bg-white rounded-lg flex flex-col items-center justify-center py-20">
              <div className="w-[180px] h-[180px] bg-[#FCFBFB] rounded-full flex items-center justify-center">
                <img src={subscriptionLogo} alt="subscription icon" width={120} />
              </div>
  
              <h2 className="font-semibold text-[20px] mt-3">
                No Active Subscription to show
              </h2>
              <p className="max-w-[350px] mx-auto text-center text-[12px] mt-2">
                You are yet to create subscription plans, the moment you do, it
                would appear here
              </p>
  
              {/* CREATE NEW BOOK SPACE SECTION */}
              <div className="px-4 mt-7">
                <button
                  className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[34px] text-[12px]  font-bold text-nowrap rounded-md w-full justify-center mb-4"
                  onClick={toggleNewSpaceVisibility}
                >
                  <img src={plusIcon} alt="plus icon" width={18} className="" />
                  Book Space
                </button>
              </div>
            </div>
  
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
                          Please fill out the necessary details to add a new user
                          to this hub
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
                              <img
                                src={importIcon}
                                alt="upload icon"
                                width={12}
                              />
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
                                        {
                                          value: "quarterly",
                                          label: "Quarterly",
                                        },
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
                              <img
                                src={importIcon}
                                alt="upload icon"
                                width={12}
                              />
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
                                        {
                                          value: "quarterly",
                                          label: "Quarterly",
                                        },
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
                    <form
                      className="w-full"
                      onSubmit={handlePaymentFormSubmission}
                    >
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
                                  <img
                                    src={cashIcon}
                                    alt="cash icon"
                                    width={16}
                                  />
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
                              <img
                                src={checkBlackIcon}
                                alt="check icon"
                                width={10}
                              />
                            </div>
  
                            {/* progress */}
                            <div className="flex justify-between items-center text-[9px] gap-8">
                              <div className="bg-green-400 w-[100px]">
                                SCANNING
                              </div>{" "}
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
        )}
  
        {!isEmpty && (
          <>
            <main>
              <div className="px-4 sm:px-6 lg:px-8 bg-white rounded-lg pt-4">
                <div className="flex justify-between items-center ">
                  {/* all, hub user and staff */}
                  <h3 className="font-semibold text-[14px] -mt-2">
                    Subscription
                  </h3>
  
                  {/* CREATE NEW SUBSCRIPTION SECTION */}
                  <div className="px-4">
                    <button
                      className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-md w-full justify-center"
                      onClick={() => {
                        setIsEmpty((prev) => !prev);
                        setAddNewHubUser((prev) => !prev);
                      }}
                    >
                      <img
                        src={plusIcon}
                        alt="plus icon"
                        width={18}
                        className=""
                      />
                      Book Space
                    </button>
                  </div>
                </div>
  
                <div className="flex justify-between items-center">
                  {/* active and expired */}
                  <div className="pt-6 mb-3.5 flex items-center gap-2 border-b-[1px]  border-b-gray-300 pb-2 max-w-[180px]">
                    {/* ACTIVE */}
                    <div className="flex text-[11px] gap-1.5 items-center text-[#036B26]">
                      <img
                        src={staffUserIcon}
                        alt="hub user icon"
                        width={17}
                        className="-mt-[2px]"
                      />
                      Active
                      <div className=" bg-[#036B26] text-[#f0f0f0] px-2 rounded-full flex items-center justify-center space-x-2">
                        <span className="text-[10px]">20</span>
                      </div>
                    </div>
  
                    {/* EXPIRED */}
                    <div className="flex text-[11px] gap-1.5 ml-6">
                      Expired{" "}
                      <div className=" bg-[#F4F5F4] px-2 rounded-full flex items-center justify-center space-x-2">
                        <span className="text-[10px]">12</span>
                      </div>
                    </div>
                  </div>
                </div>
  
                {/* search and filter section */}
                <div className="flex gap-2 -ml-4 sm:-ml-0 ">
                  {/* search bar */}
                  <div className="flex bg-white rounded-md border-[1.5px] border-gray-300 items-center gap-2 pl-3 h-[30px] w-[190px] shadow-sm">
                    <div>
                      <img src={searchIconn} alt="search icon" width={15} />
                    </div>
                    <div className="w-[80%]">
                      <input
                        type="search"
                        name="search"
                        id="search"
                        placeholder="Search here..."
                        className="w-full outline-none placeholder:text-[12px] text-[12px]"
                      />
                    </div>
                  </div>
  
                  {/* filter button */}
                  <button
                    type="button"
                    className="text-[11px] font-semibold px-2.5 rounded-md border-gray-300 border-[1.5px] bg-white flex gap-1 items-center h-[30px] shadow-sm"
                  >
                    <img src={filterIcon} alt="filter icon" width={15} />
                    Filter
                  </button>
                </div>
  
                {/* table section */}
                <div className="mt-4 flow-root pb-5">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <div className="border border-gray-300 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-300  rounded-lg">
                          <thead className="">
                            <tr
                              className="text-[10px] text-gray-800 
                   bg-[#f2f2f280]"
                            >
                              <th
                                scope="col"
                                className="whitespace-nowrap py-3.5 pl-4 pr-3 text-left font-semibold"
                              >
                                User
                              </th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              >
                                Space allocated
                              </th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              >
                                Plan Type
                              </th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              >
                                Expiry
                              </th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              >
                                Status
                              </th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              ></th>
                              <th
                                scope="col"
                                className="whitespace-nowrap px-2 py-3.5 text-left font-semibold"
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 text-[11px]">
                            {transactions.map((transaction) => (
                              <tr key={transaction.name}>
                                <td className="whitespace-nowrap py-3 pl-4 pr-3">
                                  <Link to={`/subscription/${transaction.id}`}>
                                    <div className="flex items-center gap-[6px]">
                                      <img
                                        src={transaction.image}
                                        alt={transaction.name}
                                        width={29}
                                      />
                                      <div>
                                        {transaction.name}
                                        <p className="text-gray-400 text-[10px] -mt-[2px]">
                                          {transaction.role}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                </td>
                                <td className="whitespace-nowrap px-2 py-2    text-[#1D2939]">
                                  {transaction.spaceAllocated}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2   text-[#1D2939]">
                                  {transaction.planType}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2  text-gray-500">
                                  {transaction.expiry}
                                </td>
                                <td className="whitespace-nowrap px-2 py-2  flex justify-center pt-4">
                                  <span
                                    className={`${
                                      transaction.status === "Active"
                                        ? "text-[#036B26] bg-green-100"
                                        : "text-[#865503] bg-[#FEF6E7]"
                                    }  px-2 py-[3px] rounded-full font-semibold`}
                                  >
                                    {transaction.status}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-2 py-2">
                                  <button
                                    className={`py-[3px] rounded-full font-medium flex items-center justify-center gap-1  w-[80px]
                                      
                                      ${
                                        transaction.sendNotification
                                          ? "border-[1px] border-gray-200"
                                          : "border-[1px] border-gray-100 text-gray-300"
                                      }
                                      
                                      `}
                                    type="button"
                                    onClick={toggleReminderVisibility}
                                  >
                                    <img
                                      src={notificationBellIcon}
                                      alt="notification bell icon"
                                      width={14}
                                      className={`${
                                        transaction.sendNotification
                                          ? ""
                                          : "opacity-20"
                                      }`}
                                    />
                                    Reminder
                                  </button>
                                </td>
                                <td className="whitespace-nowrap px-2 py-2  text-gray-500">
                                  <img
                                    src={actionsIcon}
                                    alt="actions icon"
                                    width={25}
                                  />
                                </td>
                                {/* <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-500">
                        {transaction.netAmount}
                      </td>
                      <td className="relative whitespace-nowrap py-2 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <a
                          href="#"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit<span className="sr-only">, {transaction.id}</span>
                        </a>
                      </td> */}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              {/* pagination and next */}
              <div className="flex sm:justify-between sm:items-center sm:flex-row flex-col-reverse gap-4 sm:gap-0 items-center justify-center mt-4">
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
            </main>
  
            {/* MODAL TO SEND A REMINDER */}
            {openReminder && (
              <Dialog
                open={openReminder}
                onClose={() => setOpenReminder(false)}
                className="fixed inset-0 z-50 flex items-center justify-center "
              >
                <DialogBackdrop className="fixed inset-0 bg-[#0A0909] bg-opacity-75" />
                <DialogPanel className="relative z-10 w-full max-w-[400px]  bg-white rounded-md shadow-lg">
                  <div className="flex flex-col items-center ">
                    {/* FIRST SECTION */}
                    <div className="flex justify-between addNewSpaceGradient w-full pl-4 pt-3 pb-2 pr-4 items-start rounded-t-lg">
                      <div>
                        <DialogTitle className="font-bold text-[13px]">
                          Send Reminder
                        </DialogTitle>
                        <p className="text-[10px]">
                          Remind workspace users of their subscription status
                        </p>
                      </div>
  
                      <button onClick={() => setOpenReminder(false)} className="">
                        <img src={closeIcon2} alt="close icon" width={10} />
                      </button>
                    </div>
  
                    {/* SPACE BODY */}
                    <form
                      onSubmit={handleSendNotificationSubmit}
                      className="w-full"
                    >
                      {/* space name */}
                      <div className="w-[96%] mx-auto px-4 pt-3">
                        <label
                          htmlFor="spaceName"
                          className="text-[11px] font-semibold"
                        >
                          Compose Reminder Message
                        </label>
                        <div className="w-full border-[1px]  border-gray-200 rounded-lg px-3 pt-3 pb-5 flex flex-col gap-3 mt-1">
                          <div className="bg-blue-100 text-blue-500 px-1 py-1 rounded-md border-[1px] border-blue-500 text-[10px] font-semibold w-[100px]">
                            To: Michael Dappa
                          </div>
  
                          <p className="text-[11px] text-gray-500">
                            We wanted to send a friendly reminder that your
                            subscription to [Hub Name] is nearing its expiry date.
                          </p>
  
                          <h3 className="text-[11px] font-semibold">
                            Subscription Details:
                          </h3>
  
                          <ol>
                            <li className="text-[11px] text-gray-500">
                              <span className="font-bold">
                                Subscription Plan:
                              </span>{" "}
                              Shared Office
                            </li>
  
                            <li className="text-[11px] text-gray-500">
                              <span className="font-bold">Expiry Date:</span> 24th
                              October, 2024
                            </li>
  
                            <li className="text-[11px] text-gray-500">
                              <span className="font-bold">Space Allocated:</span>{" "}
                              #Yellow 4
                            </li>
                          </ol>
  
                          <p className="text-[11px] text-gray-500 ">
                            To ensure uninterrupted access to all of our services
                            and benefits, we encourage you to renew your
                            subscription.
                          </p>
                        </div>
                      </div>
  
                      <div className="h-2 w-full pb-4" />
  
                      {/* SEND NOTIFICATION SECTION */}
                      <div className="px-4 w-[96%] mx-auto">
                        <button
                          className="bg-[#FEDC44] flex items-center gap-1 px-3 h-[28px] text-[10px]  font-bold text-nowrap rounded-md w-full justify-center mb-4"
                          type="submit"
                        >
                          {/* <img
                            src={notificationBellIcon}
                            alt="plus icon"
                            width={18}
                            className=""
                          /> */}
                          <Bell width={15} />
                          Send Reminder
                        </button>
                      </div>
                    </form>
                  </div>
                </DialogPanel>
              </Dialog>
            )}
          </>
        )}
      </>
    );
  };
  
  export default Subscription;