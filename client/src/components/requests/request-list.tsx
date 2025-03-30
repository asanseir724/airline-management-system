import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Request } from "@shared/schema";
import { format } from "date-fns-jalali";
import { Check, Eye, FileDown, Filter, X } from "lucide-react";
import { RequestDetail } from "./request-detail";

export function RequestList() {
  const { data: requests = [], isLoading } = useQuery<Request[]>({
    queryKey: ["/api/requests"],
  });
  
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredRequests = requests.filter((request) => {
    const passesStatusFilter = !statusFilter || request.status === statusFilter;
    const passesTypeFilter = !typeFilter || request.requestType === typeFilter;
    
    let passesDateFilter = true;
    if (startDate) {
      const requestDate = new Date(request.createdAt);
      const filterDate = new Date(startDate);
      passesDateFilter = passesDateFilter && requestDate >= filterDate;
    }
    if (endDate) {
      const requestDate = new Date(request.createdAt);
      const filterDate = new Date(endDate);
      passesDateFilter = passesDateFilter && requestDate <= filterDate;
    }
    
    return passesStatusFilter && passesTypeFilter && passesDateFilter;
  });

  const resetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setStartDate("");
    setEndDate("");
  };

  const handleViewDetail = (request: Request) => {
    setSelectedRequest(request);
  };

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
      header: "شناسه",
      accessorKey: "id",
    },
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
      header: "شماره بلیط",
      accessorKey: "ticketNumber",
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
        <div className="flex space-x-2 space-x-reverse">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => handleViewDetail(row)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === "pending" && (
            <>
              <Button size="icon" variant="ghost" className="text-green-600">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <div className="flex space-x-4 space-x-reverse">
          <Button className="flex items-center">
            <FileDown className="h-4 w-4 ml-2" />
            خروجی اکسل
          </Button>
          <Button variant="outline" className="flex items-center">
            <Filter className="h-4 w-4 ml-2" />
            فیلتر
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وضعیت
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="pending">در انتظار</SelectItem>
                  <SelectItem value="approved">تایید شده</SelectItem>
                  <SelectItem value="rejected">رد شده</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع درخواست
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="همه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="refund">استرداد بلیط</SelectItem>
                  <SelectItem value="payment">واریز وجه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                از تاریخ
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تا تاریخ
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={resetFilters} variant="outline" className="ml-2">
              پاک کردن فیلترها
            </Button>
            <Button>اعمال فیلتر</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={filteredRequests}
            loading={isLoading}
            pagination={
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  نمایش {filteredRequests.length > 0 ? "۱" : "۰"}-
                  {filteredRequests.length} از {requests.length} نتیجه
                </div>
                <div className="flex space-x-2 space-x-reverse">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3 py-1"
                    disabled
                  >
                    قبلی
                  </Button>
                  <Button size="sm" className="px-3 py-1">
                    ۱
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-3 py-1"
                    disabled={filteredRequests.length <= 10}
                  >
                    بعدی
                  </Button>
                </div>
              </div>
            }
          />
        </CardContent>
      </Card>

      {selectedRequest && (
        <RequestDetail 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}
    </>
  );
}
