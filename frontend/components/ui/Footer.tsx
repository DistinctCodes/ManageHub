import { Building2 } from "lucide-react";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 px-4 py-12 bg-gray-900">
      <div className="max-w-6xl mx-auto text-center">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ManageHub</span>
        </div>
        <p className="text-gray-400 mb-6">
          Revolutionizing workspace management for the digital age
        </p>
        <div className="flex justify-center space-x-8 text-sm text-gray-400">
          <Link href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-white transition-colors">
            Contact Us
          </Link>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-gray-500 text-sm">
            © {currentYear} ManageHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
