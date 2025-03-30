import React from "react";
import { AirlineLayout } from "@/components/airline-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { RecentRequests } from "@/components/dashboard/recent-requests";
import { CustomerRequestsComponent } from "@/components/dashboard/customer-requests";
import { useQuery } from "@tanstack/react-query";
import { Request, CustomerRequest } from "@shared/schema";
import { AlertCircle, CheckCircle, Clock, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
  });
  
  const { data: customerRequests = [], isLoading: isLoadingCustomer } = useQuery<CustomerRequest[]>({
    queryKey: ["/api/customer-requests"],
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
  
  const pendingCustomerRequests = customerRequests.filter(
    (request) => request.status === "pending"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <StatCard
          title="درخواست‌های استرداد مشتریان"
          value={isLoadingCustomer ? "..." : pendingCustomerRequests.length.toString()}
          icon={<Users className="h-5 w-5 text-blue-500" />}
          color="blue-500"
          onClick={() => window.open("/customer-request-form", "_blank")}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        <RecentRequests />
        <CustomerRequestsComponent />
      </div>
    </AirlineLayout>
  );
}
