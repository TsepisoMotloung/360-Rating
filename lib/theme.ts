// Theme constants for consistency across the app
export const THEME = {
  primary: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    textDark: 'text-red-900',
  },
  success: {
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-700',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    textDark: 'text-green-900',
  },
  warning: {
    bg: 'bg-yellow-600',
    bgHover: 'hover:bg-yellow-700',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
    textDark: 'text-yellow-900',
  },
  error: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    bgLight: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    textDark: 'text-red-900',
  },
  gray: {
    bg: 'bg-white',
    bgAlt: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    textMuted: 'text-gray-600',
  },
};

// Common button classes
export const buttonClasses = {
  primary: `${THEME.primary.bg} text-white py-3 px-6 rounded-lg font-medium ${THEME.primary.bgHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`,
  secondary: `bg-white border ${THEME.gray.border} text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors`,
  success: `${THEME.success.bg} text-white py-4 px-6 rounded-lg font-medium text-lg ${THEME.success.bgHover} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`,
};

// Common message alert classes
export const alertClasses = {
  success: `${THEME.success.bgLight} border ${THEME.success.border} text-green-800`,
  error: `${THEME.error.bgLight} border ${THEME.error.border} text-red-800`,
  warning: `${THEME.warning.bgLight} border ${THEME.warning.border} text-yellow-800`,
  info: `bg-white border ${THEME.gray.border} text-gray-800`,
};