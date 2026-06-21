import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getZodSchema } from "@shared/zod-schema";
import type { NewUser } from "@shared/schema-types";
import { Eye, EyeOff } from "lucide-react";
import { BrandedFormLayout } from "@/components/auth";
import { authClient } from "@/lib/auth-client";

type UserFormData = NewUser & { role?: string };

const userSchemas = getZodSchema("users");

export default function Register() {
	const [, setLocation] = useLocation();
	const queryClient = useQueryClient();
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const { toast } = useToast();

	const form = useForm<UserFormData>({
		resolver: zodResolver(userSchemas.insert),
		defaultValues: {
			username: "",
			email: "",
			firstName: "",
			lastName: "",
			password: "",
			role: "subscriber",
			status: "active",
		},
	});

	const onSubmit = async (data: UserFormData) => {
		setIsLoading(true);
		try {
			const displayName =
				[data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
				data.username;

			const result = await authClient.signUp.email({
				email: data.email,
				password: data.password,
				name: displayName,
				username: data.username,
				firstName: data.firstName,
				lastName: data.lastName,
			});

			if (result.error) {
				throw new Error(result.error.message || "Registration failed");
			}

			await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

			toast({
				title: "Success",
				description: "Account created successfully",
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			setLocation("/admin/dashboard");
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Registration failed",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<BrandedFormLayout>
			<Card className="w-full border-border/70 bg-card/95 shadow-lg shadow-black/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 dark:shadow-black/25">
				<CardHeader className="space-y-1 pb-2 text-center">
					<CardTitle className="text-xl font-semibold tracking-tight">
						Create account
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						Join this NextPress site
					</p>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input
												placeholder="Choose a username"
												autoComplete="username"
												className="h-10"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="you@example.com"
												autoComplete="email"
												className="h-10"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>First name</FormLabel>
											<FormControl>
												<Input
													placeholder="First"
													autoComplete="given-name"
													className="h-10"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="lastName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Last name</FormLabel>
											<FormControl>
												<Input
													placeholder="Last"
													autoComplete="family-name"
													className="h-10"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<div className="relative">
												<Input
													type={showPassword ? "text" : "password"}
													placeholder="••••••••"
													autoComplete="new-password"
													className="h-10 pr-10"
													{...field}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
													onClick={() => setShowPassword(!showPassword)}
													aria-label={
														showPassword ? "Hide password" : "Show password"
													}
													aria-pressed={showPassword}
												>
													{showPassword ? (
														<EyeOff className="h-4 w-4" aria-hidden />
													) : (
														<Eye className="h-4 w-4" aria-hidden />
													)}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="h-10">
													<SelectValue placeholder="Select a role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="subscriber">Subscriber</SelectItem>
												<SelectItem value="contributor">Contributor</SelectItem>
												<SelectItem value="author">Author</SelectItem>
												<SelectItem value="editor">Editor</SelectItem>
												<SelectItem value="administrator">
													Administrator
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
								{isLoading ? "Creating account…" : "Create account"}
							</Button>
						</form>
					</Form>

					<div className="mt-6 border-t border-border/60 pt-6 text-center">
						<p className="text-sm text-muted-foreground">
							Already have an account?{" "}
							<Link
								href="/admin/login"
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								Sign in
							</Link>
						</p>
					</div>
				</CardContent>
			</Card>
		</BrandedFormLayout>
	);
}
