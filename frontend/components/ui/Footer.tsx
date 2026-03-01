import { Building2 } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="px-6 py-16 bg-gray-950">
      <div className="max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-12 mb-14">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-gray-800 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-semibold text-white tracking-tight">
                ManageHub
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Workspace management for modern teams.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
              Product
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="#notify"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Early access
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
              Legal
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-600 text-sm">
            &copy; {currentYear} ManageHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
