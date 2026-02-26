import { Building2 } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 px-4 py-12 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ManageHub</span>
            </div>
            <p className="text-gray-400 text-sm">
              Revolutionizing workspace management for the digital age
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/workspaces"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Workspaces
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Line */}
        <div className="pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm text-center">
            © {currentYear} ManageHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
