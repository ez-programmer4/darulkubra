export const PaymentSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex space-x-4 mb-6">
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        {/* Payment Cards Skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-3 w-48 bg-gray-200 rounded"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
