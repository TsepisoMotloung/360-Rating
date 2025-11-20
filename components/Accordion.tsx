'use client';

import React, { useState } from 'react';
import { ChevronDown, CheckCircle, Clock } from 'lucide-react';

interface AccordionProps {
  title: string;
  subtitle?: string;
  isCompleted: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  subtitle,
  isCompleted,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 flex-1">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div className="text-left">
            <span className="font-medium text-gray-900">{title}</span>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`text-sm px-3 py-1 rounded-full whitespace-nowrap ${
              isCompleted
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isCompleted ? 'Completed' : 'Pending'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;
