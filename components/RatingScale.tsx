'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface RatingScaleProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const RatingScale: React.FC<RatingScaleProps> = ({ value, onChange, disabled = false }) => {
  const ratings = [1, 2, 3, 4, 5];
  const labels = ['Poor', 'Partial', 'Satisfactory', 'Good', 'Excellent'];

  return (
    <div className="flex flex-col gap-4">
      {/* Star Rating */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {ratings.map((rating) => (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange(rating)}
              className={`transition-all duration-200 transform hover:scale-110 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={`Rating ${rating} - ${labels[rating - 1]}`}
            >
              <Star
                className={`w-8 h-8 transition-colors duration-200 ${
                  rating <= value
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-300 hover:text-red-300'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-sm font-medium text-gray-700 min-w-max">
          {value > 0 ? labels[value - 1] : 'Not rated'}
        </span>
      </div>
    </div>
  );
};

export default RatingScale;
