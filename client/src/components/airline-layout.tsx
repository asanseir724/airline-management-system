import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { AirlineLogo } from "@/components/icons/airline-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ListTodo,
  FileText,
  MessageSquare,
  Send,
  Database,
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  Map,
  Plane,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface AirlineLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AirlineLayout({ children, title, subtitle }: AirlineLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "خروج موفق",
          description: "با موفقیت از سیستم خارج شدید",
        });
      },
    });
  };

  const dashboardItem = [
    {
      title: "داشبورد",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5 ml-3" />,
    },
  ];

  const refundSystemItems = [
    {
      title: "مدیریت درخواست‌ها",
      href: "/requests",
      icon: <ListTodo className="h-5 w-5 ml-3" />,
    },
    {
      title: "فرم درخواست جدید",
      href: "/request-form",
      icon: <FileText className="h-5 w-5 ml-3" />,
    },
    {
      title: "مدیریت پیامک‌ها",
      href: "/sms-management",
      icon: <MessageSquare className="h-5 w-5 ml-3" />,
    },
    {
      title: "اتصال به تلگرام",
      href: "/telegram-integration",
      icon: <Send className="h-5 w-5 ml-3" />,
    },
    {
      title: "بک‌آپ‌گیری",
      href: "/backup",
      icon: <Database className="h-5 w-5 ml-3" />,
    },
    {
      title: "مدیریت سیستم",
      href: "/system-management",
      icon: <Settings className="h-5 w-5 ml-3" />,
    },
  ];
  
  const tourSystemItems = [
    {
      title: "مدیریت تورها",
      href: "/tour-management",
      icon: <Plane className="h-5 w-5 ml-3" />,
    },
  ];
  
  const navItems = [
    {
      title: "داشبورد",
      items: dashboardItem,
    },
    {
      title: "سامانه استرداد",
      items: refundSystemItems,
    },
    {
      title: "سیستم تورهای گردشگری",
      items: tourSystemItems,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-right">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="mr-4 text-xl font-bold">سامانه مدیریت درخواست‌های آژانسی</h1>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-reverse space-x-2"
                >
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden md:inline-block">
                    {user?.displayName || "مدیر سیستم"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 ml-2" />
                  خروج از سیستم
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-64 h-[calc(100vh-57px)] bg-white shadow-md transition-all duration-300 fixed md:relative z-40",
            isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0 md:w-20"
          )}
        >
          <nav className="mt-5 px-2">
            {navItems.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-6">
                <h3 className={cn(
                  "text-sm font-semibold text-gray-500 mb-2 px-2",
                  !isSidebarOpen && "hidden md:hidden"
                )}>
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={location === item.href ? "default" : "ghost"}
                        className={cn(
                          "w-full justify-start mb-1",
                          location === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-gray-700 hover:bg-gray-100 hover:text-primary"
                        )}
                      >
                        {item.icon}
                        <span className={cn(isSidebarOpen ? "inline-block" : "hidden md:hidden")}>
                          {item.title}
                        </span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 p-6 transition-all duration-300",
            isSidebarOpen ? "md:mr-64" : "md:mr-20"
          )}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
