'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-red-700 to-red-600 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <span className="text-red-600 font-bold text-lg">360</span>
              </div>
              <h3 className="text-xl font-bold">Rating System</h3>
            </div>
            <p className="text-red-100 text-sm">
              Comprehensive 360-degree performance rating and feedback platform for organizations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-white rounded-full"></span>
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-red-100 hover:text-white transition-colors font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/" className="text-red-100 hover:text-white transition-colors font-medium">
                  About
                </Link>
              </li>
              <li>
                <Link href="/" className="text-red-100 hover:text-white transition-colors font-medium">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-white rounded-full"></span>
              Contact Support
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:support@example.com" className="text-red-100 hover:text-white transition-colors font-medium">
                  📧 support@example.com
                </a>
              </li>
              <li>
                <a href="tel:+1234567890" className="text-red-100 hover:text-white transition-colors font-medium">
                  📞 +1 (234) 567-890
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-red-500 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-red-100">
          <p className="font-semibold">&copy; {currentYear} 360 Rating System. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/" className="hover:text-white transition-colors font-medium">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-white transition-colors font-medium">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
