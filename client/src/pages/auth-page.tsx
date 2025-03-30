import React, { useState } from "react";
import { Redirect } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { AirlineLogo } from "@/components/icons/airline-logo";
import { User, Lock } from "lucide-react";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(3, "نام کاربری باید حداقل 3 کاراکتر باشد"),
  password: z.string().min(6, "رمز عبور باید حداقل 6 کاراکتر باشد"),
  rememberMe: z.boolean().default(false).optional(),
});

// Register form schema
const registerFormSchema = z.object({
  username: z.string().min(3, "نام کاربری باید حداقل 3 کاراکتر باشد"),
  password: z.string().min(6, "رمز عبور باید حداقل 6 کاراکتر باشد"),
  displayName: z.string().min(3, "نام نمایشی باید حداقل 3 کاراکتر باشد"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  // Submit handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      displayName: data.displayName,
      isAdmin: false,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            {/* Airline Logo */}
            <div className="flex justify-center mb-4">
              <AirlineLogo className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">سامانه مدیریت درخواست‌های آژانسی</h1>
            <p className="text-gray-600 mt-2">لطفاً برای ورود به سیستم اطلاعات خود را وارد کنید</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">ورود</TabsTrigger>
              <TabsTrigger value="register">ثبت نام</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نام کاربری</FormLabel>
                        <div className="relative">
                          <span className="absolute right-3 top-3 text-gray-400">
                            <User className="h-5 w-5" />
                          </span>
                          <FormControl>
                            <Input
                              placeholder="نام کاربری خود را وارد کنید"
                              className="pr-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز عبور</FormLabel>
                        <div className="relative">
                          <span className="absolute right-3 top-3 text-gray-400">
                            <Lock className="h-5 w-5" />
                          </span>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="رمز عبور خود را وارد کنید"
                              className="pr-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between">
                    <FormField
                      control={loginForm.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <div className="flex items-center">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              id="remember-me"
                            />
                          </FormControl>
                          <label
                            htmlFor="remember-me"
                            className="mr-2 text-sm text-gray-700"
                          >
                            مرا به خاطر بسپار
                          </label>
                        </div>
                      )}
                    />
                    <a href="#" className="text-sm font-medium text-primary hover:text-secondary">
                      رمز عبور را فراموش کرده‌اید؟
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "در حال ورود..." : "ورود به سیستم"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نام کاربری</FormLabel>
                        <div className="relative">
                          <span className="absolute right-3 top-3 text-gray-400">
                            <User className="h-5 w-5" />
                          </span>
                          <FormControl>
                            <Input
                              placeholder="نام کاربری خود را وارد کنید"
                              className="pr-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نام نمایشی</FormLabel>
                        <FormControl>
                          <Input placeholder="نام نمایشی خود را وارد کنید" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رمز عبور</FormLabel>
                        <div className="relative">
                          <span className="absolute right-3 top-3 text-gray-400">
                            <Lock className="h-5 w-5" />
                          </span>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="رمز عبور خود را وارد کنید"
                              className="pr-10"
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "در حال ثبت نام..." : "ثبت نام"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
