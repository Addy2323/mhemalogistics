import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { customersAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Mail, Phone, MapPin, Calendar, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    status: string;
    joinedAt: string;
    ordersCount: number;
    avatarUrl?: string;
}


const DashboardCustomers = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const serverUrl = baseUrl.replace('/api', '');

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };


    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response: any = await customersAPI.list({});
            if (response && response.success) {
                setCustomers(response.data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (!window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
            return;
        }
        try {
            await customersAPI.delete(customerId);
            toast.success("Customer deleted successfully");
            fetchCustomers();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete customer");
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("dashboard.customers.title")}</h1>
                    <p className="text-muted-foreground">{t("dashboard.customers.desc")}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCustomers}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="hero">
                        <UserPlus className="w-4 h-4" />
                        {t("dashboard.customers.addCustomer")}
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder={t("dashboard.customers.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Loading customers...
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                        <p className="text-muted-foreground">{t("dashboard.customers.noCustomers")}</p>
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <div key={customer.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-all hover-lift">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-12 h-12 border border-border">
                                        <AvatarImage src={customer.avatarUrl ? `${serverUrl}${customer.avatarUrl}` : undefined} className="object-cover" />
                                        <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
                                            {getInitials(customer.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>

                                        <h3 className="font-bold text-foreground">{customer.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${customer.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {customer.status === "active" ? t("dashboard.customers.statusActive") : t("dashboard.customers.statusInactive")}
                                        </span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>{t("dashboard.customers.actions.viewProfile")}</DropdownMenuItem>
                                        <DropdownMenuItem>{t("dashboard.customers.actions.editDetails")}</DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => handleDeleteCustomer(customer.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            {t("dashboard.customers.actions.delete")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="w-4 h-4" />
                                    <span>{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="w-4 h-4" />
                                    <span>{customer.phone}</span>
                                </div>
                                {customer.location && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        <span>{customer.location}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    <span>{t("dashboard.customers.joined")} {format(new Date(customer.joinedAt), "MMM yyyy")}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-foreground">{customer.ordersCount || 0}</p>
                                    <p className="text-xs text-muted-foreground">{t("dashboard.customers.orders")}</p>
                                </div>
                                <Button variant="outline" size="sm">{t("dashboard.customers.viewOrders")}</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DashboardCustomers;
