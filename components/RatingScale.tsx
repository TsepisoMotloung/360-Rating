'use client';

import React from 'react';

interface RatingScaleProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const RatingScale: React.FC<RatingScaleProps> = ({ value, onChange, disabled = false }) => {
  const ratings = [1, 2, 3, 4, 5];
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 justify-between">
        {ratings.map((rating, idx) => (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onChange(rating)}
            className={`
              flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200
              ${value === rating
                ? 'bg-primary-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            `}
            aria-label={`Rating ${rating} - ${labels[idx]}`}
          >
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold">{rating}</span>
              <span className="text-xs mt-1">{labels[idx]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RatingScale;
