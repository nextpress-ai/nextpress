import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { UserPlus, Edit, Trash2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, NewUser } from "@shared/schema-types";
import { getZodSchema } from "@shared/zod-schema";

type UserFormData = NewUser & { role?: string };

const userSchemas = getZodSchema("users");

export default function Users() {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [page, setPage] = useState(1);

	const { toast } = useToast();
	const queryClient = useQueryClient();

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

	// Fetch users from API
	const { data: usersData, isLoading } = useQuery({
		queryKey: ["/api/users", { page, per_page: 20 }],
	});

	const createMutation = useMutation({
		mutationFn: async (userData: NewUser) => {
			return await apiRequest("POST", "/api/users", userData);
		},
		onSuccess: () => {
			toast({
				title: "Success",
				description: "User created successfully",
			});
			queryClient.invalidateQueries({ queryKey: ["/api/users"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: () => {
			toast({
				title: "Error",
				description: "Failed to create user",
				variant: "destructive",
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<User>;
		}) => {
			return await apiRequest("PUT", `/api/users/${id}`, data);
		},
		onSuccess: () => {
			toast({
				title: "Success",
				description: "User updated successfully",
			});
			queryClient.invalidateQueries({ queryKey: ["/api/users"] });
			setIsDialogOpen(false);
			setEditingUser(null);
			form.reset();
		},
		onError: () => {
			toast({
				title: "Error",
				description: "Failed to update user",
				variant: "destructive",
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			return await apiRequest("DELETE", `/api/users/${id}`);
		},
		onSuccess: () => {
			toast({
				title: "Success",
				description: "User deleted successfully",
			});
			queryClient.invalidateQueries({ queryKey: ["/api/users"] });
		},
		onError: () => {
			toast({
				title: "Error",
				description: "Failed to delete user",
				variant: "destructive",
			});
		},
	});

	const handleNewUser = () => {
		setEditingUser(null);
		form.reset();
		setIsDialogOpen(true);
	};

	const handleEditUser = (user: User) => {
		setEditingUser(user);
		// Reset form with current user data but empty password
		form.reset({
			username: user.username || "",
			email: user.email || "",
			firstName: user.firstName || "",
			lastName: user.lastName || "",
			password: "", // Password field is empty for editing
			role: (user.role as any) || "subscriber",
			status: (user.status as any) || "active",
		});
		setIsDialogOpen(true);
	};

	const handleDeleteUser = (userId: string) => {
		if (confirm("Are you sure you want to delete this user?")) {
			deleteMutation.mutate(userId);
		}
	};

	const onSubmit = (data: UserFormData) => {
		if (editingUser) {
			// For updates, remove password if it's empty
			const updateData = { ...data } as any;
			if (!updateData.password || updateData.password.trim() === "") {
				delete updateData.password;
			}
			updateMutation.mutate({ id: editingUser.id, data: updateData });
		} else {
			createMutation.mutate(data);
		}
	};

	const users = (usersData as any)?.users || [];

	const getRoleBadge = (role: string) => {
		const variants: Record<string, any> = {
			administrator: "destructive",
			editor: "default",
			author: "secondary",
			contributor: "outline",
			subscriber: "outline",
		};
		return <Badge variant={variants[role] || "outline"}>{role}</Badge>;
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, any> = {
			active: "default",
			inactive: "secondary",
			pending: "outline",
		};
		return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
	};

	return (
		<AdminLayout
			title="Users"
			actions={
				<Button
					className="npb-btn-accent"
					onClick={handleNewUser}
				>
					<UserPlus className="w-4 h-4 mr-2" />
					Add New User
				</Button>
			}
		>
					<Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
						<CardHeader>
							<CardTitle>All Users</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>User</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Registered</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{isLoading ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-8">
												Loading users...
											</TableCell>
										</TableRow>
									) : users.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-8">
												No users found
											</TableCell>
										</TableRow>
									) : (
										users.map((user: any) => (
											<TableRow key={user.id}>
												<TableCell>
													<div className="flex items-center space-x-3">
														<Avatar className="w-8 h-8">
															<AvatarImage
																src={user.profileImageUrl || undefined}
															/>
															<AvatarFallback>
																{(user.firstName?.[0] || "") +
																	(user.lastName?.[0] || "")}
															</AvatarFallback>
														</Avatar>
														<div>
															<div className="font-medium text-npb-text-primary">
																{user.firstName} {user.lastName}
															</div>
															<div className="text-sm text-npb-text-muted">
																@{user.username}
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<a
														href={`mailto:${user.email}`}
														className="text-npb-accent hover:underline flex items-center"
													>
														<Mail className="w-4 h-4 mr-1" />
														{user.email}
													</a>
												</TableCell>
												<TableCell>{getRoleBadge(user.role)}</TableCell>
												<TableCell>{getStatusBadge(user.status)}</TableCell>
												<TableCell>
													<div className="text-sm">
														{new Date(user.createdAt).toLocaleDateString()}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex items-center justify-end space-x-2">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleEditUser(user)}
														>
															<Edit className="w-4 h-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleDeleteUser(user.id)}
															disabled={deleteMutation.isPending}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					{/* User Roles Info */}
					<div className="mt-8 rounded-[var(--npb-radius-surface)] bg-npb-surface-inset p-6">
						<h3 className="text-lg font-semibold text-npb-text-primary mb-4">
							User Roles & Capabilities
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{[
								{
									role: "Administrator",
									description:
										"Full access to all NextPress features and settings",
									capabilities: [
										"Manage posts",
										"Manage users",
										"Install themes",
										"Modify settings",
									],
								},
								{
									role: "Editor",
									description:
										"Can publish and manage posts including posts by other users",
									capabilities: [
										"Publish posts",
										"Edit others' posts",
										"Manage comments",
										"Upload files",
									],
								},
								{
									role: "Author",
									description: "Can publish and manage their own posts",
									capabilities: [
										"Publish own posts",
										"Edit own posts",
										"Upload files",
										"View comments",
									],
								},
								{
									role: "Contributor",
									description:
										"Can write and manage their own posts but cannot publish them",
									capabilities: [
										"Write posts",
										"Edit own posts",
										"View own posts",
									],
								},
								{
									role: "Subscriber",
									description: "Can only manage their profile and view content",
									capabilities: ["Read posts", "Edit profile", "View comments"],
								},
							].map((role, index) => (
								<div key={index} className="rounded-[var(--npb-radius-surface)] bg-npb-surface-base p-4">
									<div className="flex items-center space-x-2 mb-2">
										<h4 className="font-medium text-npb-text-primary">{role.role}</h4>
										{getRoleBadge(role.role.toLowerCase())}
									</div>
									<p className="text-sm text-npb-text-secondary mb-3">
										{role.description}
									</p>
									<div className="space-y-1">
										{role.capabilities.map((capability, capIndex) => (
											<div
												key={capIndex}
												className="text-xs text-npb-text-muted flex items-center"
											>
												<span className="w-1 h-1 bg-npb-accent rounded-full mr-2"></span>
												{capability}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>

			{/* User Editor Dialog */}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingUser ? "Edit User" : "Add New User"}
						</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="username"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Username</FormLabel>
										<FormControl>
											<Input placeholder="Enter username" {...field} />
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
												placeholder="Enter email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>First Name</FormLabel>
											<FormControl>
												<Input placeholder="First name" {...field} />
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
											<FormLabel>Last Name</FormLabel>
											<FormControl>
												<Input placeholder="Last name" {...field} />
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
										<FormLabel>
											Password{" "}
											{editingUser && "(leave blank to keep current password)"}
										</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder={
													editingUser
														? "Enter new password (optional)"
														: "Enter password"
												}
												{...field}
											/>
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
												<SelectTrigger>
													<SelectValue placeholder="Select a role" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="administrator">
													Administrator
												</SelectItem>
												<SelectItem value="editor">Editor</SelectItem>
												<SelectItem value="author">Author</SelectItem>
												<SelectItem value="contributor">Contributor</SelectItem>
												<SelectItem value="subscriber">Subscriber</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Status</FormLabel>
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="inactive">Inactive</SelectItem>
												<SelectItem value="pending">Pending</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-end space-x-2 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setIsDialogOpen(false);
										setEditingUser(null);
										form.reset();
									}}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									className="bg-npb-accent hover:bg-npb-accent-hover"
									disabled={
										createMutation.isPending || updateMutation.isPending
									}
								>
									{editingUser ? "Update User" : "Create User"}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</AdminLayout>
	);
}
