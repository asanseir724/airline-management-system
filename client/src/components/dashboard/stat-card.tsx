import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, color, onClick }: StatCardProps) {
  return (
    <Card className={cn("border-t-4", `border-${color}`)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm mb-1">{title}</p>
            <h3 className="text-3xl font-bold">{value}</h3>
          </div>
          <div
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center",
              `bg-${color} bg-opacity-20`
            )}
          >
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={onClick}
            className={cn(
              "text-sm flex items-center",
              `text-${color}`
            )}
          >
            مشاهده همه
            <ArrowRight className="h-4 w-4 mr-1" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
