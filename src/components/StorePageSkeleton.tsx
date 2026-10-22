import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";

const StorePageSkeleton = () => (
  <div className="min-h-screen bg-background font-sans">
    <Navbar />
    
    {/* Breadcrumb Skeleton */}
    <div className="container max-w-[1100px] py-3">
      <Skeleton className="h-4 w-40 bg-[#272a2e]" />
    </div>

    {/* Mobile Header Skeleton (Giống hệt giao diện thật) */}
    <div className="lg:hidden container max-w-[1100px] pb-2">
      <div className="flex items-center gap-2">
        <Skeleton className="w-20 h-20 rounded-full shrink-0 bg-[#272a2e]" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-7 w-[85%] bg-[#272a2e]" />
          <Skeleton className="h-7 w-[60%] bg-[#272a2e]" />
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-3 w-20 bg-[#272a2e]" />
        <Skeleton className="h-3 w-32 bg-[#272a2e]" />
      </div>
    </div>

    {/* Mobile Tabs Skeleton */}
    <div className="lg:hidden sticky top-0 bg-background z-10 border-b border-border mb-1">
      <div className="container max-w-[1100px] flex gap-6 px-4 py-2">
        {[80, 72, 60, 40].map((w, i) => (
          <Skeleton key={i} className="h-4 bg-[#272a2e]" style={{ width: w }} />
        ))}
      </div>
    </div>

    <div className="container max-w-[1100px] pb-8">
      <div className="flex flex-col lg:flex-row gap-0 lg:gap-6 relative">
        
        {/* Sidebar Skeleton (Thu hẹp lại còn 280px giống bản thật) */}
        <aside className="hidden lg:block lg:w-[280px] shrink-0">
          <div className="rounded-2xl border border-[#3f3f46] bg-[#272a2e] p-5 space-y-4 sticky top-20">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-full bg-[#363a3f]" />
            </div>
            <div className="-mt-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-[#363a3f]" />
              <Skeleton className="h-3 w-24 bg-[#363a3f]" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-40 bg-[#363a3f]" />
              <Skeleton className="h-3 w-full bg-[#363a3f]" />
              <Skeleton className="h-3 w-full bg-[#363a3f]" />
              <Skeleton className="h-3 w-2/3 bg-[#363a3f]" />
            </div>
          </div>
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1 space-y-4 lg:space-y-6">
          
          {/* Desktop Header Skeleton */}
          <div className="hidden lg:block space-y-3 pt-2 pb-2">
            <Skeleton className="h-10 w-[80%] bg-[#272a2e]" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-24 bg-[#272a2e]" />
              <Skeleton className="h-4 w-32 bg-[#272a2e]" />
              <Skeleton className="h-4 w-32 bg-[#272a2e]" />
            </div>
          </div>

          {/* Desktop Tabs Skeleton */}
          <div className="hidden lg:flex gap-6 border-b border-[#3f3f46] sticky top-0 bg-background pt-1 pb-2">
            {[80, 72, 60, 40].map((w, i) => (
              <Skeleton key={i} className="h-4 bg-[#272a2e]" style={{ width: w }} />
            ))}
          </div>

          {/* Report Box Skeleton */}
          <div>
             <Skeleton className="h-7 w-64 bg-[#272a2e] mb-3" />
             <Skeleton className="h-10 w-full rounded-xl bg-[#272a2e]" />
          </div>

          {/* Coupon cards skeleton (Chỉnh lại form card chuẩn) */}
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-2xl border border-transparent bg-[#272a2e] p-3 sm:p-3.5 space-y-3 ${i === 1 ? 'mt-3' : ''}`}>
                <div className="flex items-start gap-3 w-full">
                  <Skeleton className="w-12 h-12 rounded-xl bg-[#363a3f] shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-6 w-24 bg-[#363a3f]" />
                    <Skeleton className="h-4 w-20 bg-[#363a3f]" />
                  </div>
                  <Skeleton className="h-10 w-[95px] sm:w-[110px] rounded-xl bg-[#363a3f] shrink-0" />
                </div>
                <Skeleton className="h-4 w-[90%] bg-[#363a3f]" />
                <div className="flex gap-2">
                   <Skeleton className="h-3 w-20 bg-[#363a3f]" />
                   <Skeleton className="h-3 w-24 bg-[#363a3f]" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  </div>
);

export default StorePageSkeleton;
