export default function SessionExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⏳</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h1>
          <p className="text-gray-600 mb-6">
            Your session has expired. Please log in again to continue.
          </p>
          <a href="/" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Log In Again
          </a>
        </div>
      </div>
    </div>
  );
}
