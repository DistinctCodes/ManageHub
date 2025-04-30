import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  complaintsIcon,
  homeIcon,
  monitoringIcon,
  roundClockLogo,
  searchIconn,
  signoutIcon,
  spacesIcon,
  subscriptionIcon,
  userIcon,
  UsersIcon,
  notificationBellIcon,
  settingsIcon,
} from "../assets";
import {
  Bars3Icon,
  Cog6ToothIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import H3 from "../components/H3";
import P from "../components/P";

const teams = [
  { id: 1, name: "Heroicons", href: "#", initial: "H", current: false },
  { id: 2, name: "Tailwind Labs", href: "#", initial: "T", current: false },
  { id: 3, name: "Workcation", href: "#", initial: "W", current: false },
];
const userNavigation = [
  { name: "Your profile", href: "#" },
  { name: "Sign out", href: "#" },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Example() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [navigation, setNavigation] = useState([
    {
      name: "Home",
      href: "/dashboard",
      icon: homeIcon,
      current: true,
      desc: "",
    },
    {
      name: "Monitoring",
      href: "/monitoring",
      icon: monitoringIcon,
      current: false,
      desc: "",
    },
    {
      name: "Users",
      href: "/users",
      icon: UsersIcon,
      current: false,
      desc: "Manage user data",
    },
    {
      name: "Subscription",
      href: "/subscription",
      icon: subscriptionIcon,
      current: false,
      desc: "Manage subscription packages",
    },
    {
      name: "Spaces",
      href: "/spaces",
      icon: spacesIcon,
      current: false,
      desc: "",
    },
    {
      name: "Complaints",
      href: "/complaints",
      icon: complaintsIcon,
      current: false,
      desc: "",
    },
  ]);

  // Update active navigation item based on current path
  useEffect(() => {
    const updatedNavigation = navigation.map((item) => ({
      ...item,
      current: location.pathname.startsWith(item.href),
    }));
    setNavigation(updatedNavigation);
  }, [location.pathname]);

  return (
    <>
      <div>
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-[closed]:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5 duration-300 ease-in-out data-[closed]:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="h-6 w-6 text-white"
                    />
                  </button>
                </div>
              </TransitionChild>
              {/* Sidebar component, swap this element with another sidebar if you like */}
              <div
                className="
              
              flex grow flex-col gap-y-5 overflow-y-auto hide-scrollbar bg-[#f2f2f2] px-6 pb-4
              "
              >
                {/* logo area */}
                <div className="mt-6">
                  <Link to={"/"}>
                    <img
                      alt="Your Company"
                      src={roundClockLogo}
                      className="h-8"
                    />
                  </Link>
                </div>

                {/* search bar */}
                <div className="flex bg-white shadow-sm rounded-lg py-2 border-[1.5px] border-gray-300 items-center gap-2 pl-3">
                  <div>
                    <img src={searchIconn} alt="search icon" />
                  </div>
                  <div className="w-[80%]">
                    <input
                      type="search"
                      name="search"
                      id="search"
                      placeholder="Search"
                      className="w-full outline-none"
                    />
                  </div>
                </div>

                {/* nav items */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li className="flex-1">
                      <ul role="list" className="-mx-2 space-y-1 mb-10">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              className={classNames(
                                item.current
                                  ? "bg-[#FEDC44] text-black font-semibold"
                                  : "text-[#202020] hover:bg-[#FEDC44] hover:text-black",
                                "group flex gap-x-2 rounded-md p-2 text-[13px] font-medium leading-6 items-center"
                              )}
                            >
                              <img
                                src={item.icon}
                                aria-hidden="true"
                                className={classNames(
                                  item.current
                                    ? "text-black"
                                    : "text-[#202020] group-hover:text-black",
                                  "h-5 w-5 shrink-0"
                                )}
                              />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>

                    {/* ending */}
                    <div className="flex flex-col ending mt-auto gap-6">
                      {/* WELCOME BACK AREA */}
                      <div className="bg-[#F9FAFB] rounded-lg p-5 flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <H3>Welcome Back</H3>
                          <P>Manage your attendance and Hub Subscription</P>
                        </div>
                        <div className="flex gap-3 text-[13px]">
                          <p className="font-semibold text-[#475467]">
                            Fri Oct 4, 2024
                          </p>
                          <p className="font-semibold">02:23 PM</p>
                        </div>
                      </div>

                      {/* HORIZONTAL RULE */}
                      <hr />

                      {/* SIGNED IN USER NAME */}
                      <li className="-mt-4">
                        <Link
                          to="#"
                          className="group -mx-2 flex gap-x-3 rounded-md p-2 leading-6"
                        >
                          <div className="flex gap-2 items-center">
                            <img
                              src={userIcon}
                              aria-hidden="true"
                              className="h-9 w-9 shrink-0 text-indigo-200 group-hover:text-white"
                            />
                            <div>
                              <H3>Ann Emmanuel</H3>
                              <P>Ann@Roundstone.co.uk</P>
                            </div>
                          </div>
                          <div>
                            <img src={signoutIcon} alt="signout icon" />
                          </div>
                        </Link>
                      </li>
                    </div>
                  </ul>
                </nav>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col scroll-m-0">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto hide-scrollbar bg-[#f2f2f2] px-6 pb-4">
            {/* logo area */}
            <div className="mt-6">
              <Link to={"/"}>
                <img alt="Your Company" src={roundClockLogo} className="h-8" />
              </Link>
            </div>

            {/* search bar */}
            <div className="flex bg-white shadow-sm rounded-lg py-2 border-[1.5px] border-gray-300 items-center gap-2 pl-3">
              <div>
                <img src={searchIconn} alt="search icon" />
              </div>
              <div className="w-[80%]">
                <input
                  type="search"
                  name="search"
                  id="search"
                  placeholder="Search"
                  className="w-full outline-none"
                />
              </div>
            </div>

            {/* nav items */}
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li className="flex-1">
                  <ul role="list" className="-mx-2 space-y-1 mb-10">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={classNames(
                            item.current
                              ? "bg-[#FEDC44] text-black font-semibold"
                              : "text-[#202020] hover:bg-[#FEDC44] hover:text-black",
                            "group flex gap-x-2 rounded-md p-2 text-[13px] font-medium leading-6 items-center"
                          )}
                        >
                          <img
                            src={item.icon}
                            aria-hidden="true"
                            className={classNames(
                              item.current
                                ? "text-black"
                                : "text-[#202020] group-hover:text-black",
                              "h-5 w-5 shrink-0"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>

                {/* ending */}
                <div className="flex flex-col ending mt-auto gap-6">
                  {/* WELCOME BACK AREA */}
                  <div className="bg-[#F9FAFB] rounded-lg p-5 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <H3>Welcome Back</H3>
                      <P>Manage your attendance and Hub Subscription</P>
                    </div>
                    <div className="flex gap-3 text-[12px]">
                      <p className="font-semibold text-[#475467]">
                        Fri Oct 4, 2024
                      </p>
                      <p className="font-semibold">02:23 PM</p>
                    </div>
                  </div>

                  {/* HORIZONTAL RULE */}
                  <hr />

                  {/* SIGNED IN USER NAME */}
                  <li className="-mt-4">
                    <Link
                      to="#"
                      className="group -mx-2 flex gap-x-3 rounded-md p-2 leading-6"
                    >
                      <div className="flex gap-2 items-center">
                        <img
                          src={userIcon}
                          aria-hidden="true"
                          className="h-9 w-9 shrink-0 text-indigo-200 group-hover:text-white"
                        />
                        <div>
                          <H3>Ann Emmanuel</H3>
                          <P>Ann@Roundstone.co.uk</P>
                        </div>
                      </div>
                      <div>
                        <img src={signoutIcon} alt="signout icon" />
                      </div>
                    </Link>
                  </li>
                </div>
              </ul>
            </nav>
          </div>
        </div>

        <div className="lg:pl-72">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 px-4  sm:gap-x-6 sm:px-6 lg:px-8 bg-[#F7F8FA]">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>

            {/* Separator */}
            <div
              aria-hidden="true"
              className="h-6 w-px bg-gray-900/10 lg:hidden"
            />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center justify-between bg-[#F7F8FA]">
              {navigation
                .filter((item) => location.pathname.startsWith(item.href))
                .map((item) => {
                  return (
                    <div>
                      <h3 className="text-[18px] font-bold">{item.name}</h3>
                      <p className="text-[10px]">{item.desc}</p>
                    </div>
                  );
                })}

              <div className="flex items-center gap-x-1.5">
                <div
                  type="button"
                  className="h-8 w-8 bg-white p-2 flex items-center justify-center rounded-md"
                >
                  <img
                    src={settingsIcon}
                    alt="settings icon"
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </div>

                <div
                  type="button"
                  className="h-8 w-8 bg-white p-2 flex items-center justify-center rounded-md"
                >
                  <img
                    src={notificationBellIcon}
                    alt="settings icon"
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </div>

                {/* Profile dropdown */}
                <Menu as="div" className="relative ml-1.5">
                  <MenuButton className="-m-1.5 flex items-center p-1.5">
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt=""
                      src={userIcon}
                      className="h-8 w-8 rounded-full bg-gray-50"
                    />
                  </MenuButton>
                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                  >
                    {userNavigation.map((item) => (
                      <MenuItem key={item.name}>
                        <Link
                          to={item.href}
                          className="block px-3 py-1 text-sm leading-6 text-gray-900 data-[focus]:bg-gray-50"
                        >
                          {item.name}
                        </Link>
                      </MenuItem>
                    ))}
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </div>

          <main className="pt-1.5 pb-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
