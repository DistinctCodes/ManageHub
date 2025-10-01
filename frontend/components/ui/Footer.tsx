import { Building2 } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const navigationLinks = [
        { name: 'Privacy Policy', href: '/privacy-policy' },
        { name: 'Terms of Service', href: '/terms-of-service' },
        { name: 'Contact Us', href: '/contact' },
    ];

    return (
        <footer className="bg-blue-600 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Logo and Tagline Section */}
                <div className="flex flex-col items-center text-center mb-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500 p-2.5 rounded-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">ManageHub</h2>
                    </div>

                    {/* Tagline */}
                    <p className="text-gray-200 text-base sm:text-lg max-w-2xl">
                        Revolutionizing workspace management for the digital age
                    </p>
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 mb-8">
                    {navigationLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Copyright */}
                <div className="text-center">
                    <p className="text-gray-400 text-sm">
                        © {currentYear} ManageHub. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;