import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Request } from "@shared/schema";
import { format } from "date-fns-jalali";

export function RecentRequests() {
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
    refetchInterval: false,
  });

  // Sort by created date (descending) and take first 5
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">در انتظار</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800">تایید شده</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">رد شده</Badge>;
      default:
        return null;
    }
  };

  const getRequestTypeText = (type: string) => {
    return type === "refund" ? "استرداد بلیط" : "واریز وجه";
  };

  const columns = [
    {
      header: "نام مشتری",
      accessorKey: "customerName",
    },
    {
      header: "شماره تماس",
      accessorKey: "phoneNumber",
    },
    {
      header: "نوع درخواست",
      accessorKey: "requestType",
      cell: (row: Request) => getRequestTypeText(row.requestType),
    },
    {
      header: "تاریخ",
      accessorKey: "createdAt",
      cell: (row: Request) => format(new Date(row.createdAt), "yyyy/MM/dd"),
    },
    {
      header: "وضعیت",
      accessorKey: "status",
      cell: (row: Request) => getStatusBadge(row.status),
    },
    {
      header: "عملیات",
      accessorKey: (row: Request) => (
        <Button size="icon" variant="ghost">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>درخواست‌های اخیر</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={recentRequests}
          loading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
