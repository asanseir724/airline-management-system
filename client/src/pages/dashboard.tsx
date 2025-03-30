import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentRequests } from "@/components/dashboard/recent-requests";
import { useQuery } from "@tanstack/react-query";
import { Request } from "@shared/schema";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
  });

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  );
  const approvedRequests = requests.filter(
    (request) => request.status === "approved"
  );
  const rejectedRequests = requests.filter(
    (request) => request.status === "rejected"
  );

  const handleViewAll = (status?: string) => {
    if (status) {
      // In a real app, we would add a query param for filtering
      setLocation("/requests");
    } else {
      setLocation("/requests");
    }
  };

  return (
    <AirlineLayout 
      title="داشبورد مدیریت" 
      subtitle="خلاصه وضعیت سیستم و آمار درخواست‌ها"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="درخواست‌های در انتظار"
          value={isLoading ? "..." : pendingRequests.length.toString()}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          color="yellow-500"
          onClick={() => handleViewAll("pending")}
        />
        <StatCard
          title="درخواست‌های تایید شده"
          value={isLoading ? "..." : approvedRequests.length.toString()}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          color="green-500"
          onClick={() => handleViewAll("approved")}
        />
        <StatCard
          title="درخواست‌های رد شده"
          value={isLoading ? "..." : rejectedRequests.length.toString()}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          color="red-500"
          onClick={() => handleViewAll("rejected")}
        />
      </div>

      <RecentRequests />
    </AirlineLayout>
  );
}
