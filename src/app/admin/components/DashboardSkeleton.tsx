"use client";

const Skeleton = () => (
  <div className="animate-pulse bg-gray-200 rounded-md">&nbsp;</div>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center border-l-4 border-gray-200">
    <div className="mr-4 text-3xl">
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    </div>
    <div className="w-full">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-lg shadow-md h-[384px] flex flex-col">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
    <div className="flex-1 bg-gray-200 rounded-md animate-pulse"></div>
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
    <div className="max-w-md mx-auto">
      <ChartSkeleton />
    </div>
  </div>
);
