import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Package, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast({ title: t("auth.toasts.welcome"), description: t("auth.toasts.loginSuccess") });
          navigate("/dashboard");
        } else {
          toast({ title: t("auth.toasts.loginFailed"), description: result.error, variant: "destructive" });
        }
      } else {
        if (!formData.name.trim()) {
          toast({ title: t("auth.toasts.nameRequired"), description: t("auth.toasts.nameRequiredDesc"), variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const result = await register(formData.name, formData.email, formData.password);
        if (result.success) {
          toast({ title: t("auth.toasts.accountCreated"), description: t("auth.toasts.welcomeMhema") });
          navigate("/dashboard");
        } else {
          toast({ title: t("auth.toasts.regFailed"), description: result.error, variant: "destructive" });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col lg:flex-row overflow-y-auto">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <a href="/" className="flex items-center gap-3 mb-12">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-lg">
              <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-2xl font-bold">MHEMA EXPRESS</div>
              <div className="text-sm text-primary-foreground/70">Logistics Co. Ltd</div>
            </div>
          </a>

          <h1 className="text-4xl font-extrabold mb-6">
            {t("auth.branding.title")}
            <span className="block text-secondary">{t("auth.branding.titleSuffix")}</span>
          </h1>

          <p className="text-lg text-primary-foreground/80 mb-8 max-w-md">
            {t("auth.branding.desc")}
          </p>

          <div className="space-y-4">
            {(t("auth.branding.features", { returnObjects: true }) as string[]).map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <svg className="w-4 h-4 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-primary-foreground/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <a href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("auth.backToHome")}
          </a>

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="MHEMA EXPRESS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">MHEMA EXPRESS</div>
              <div className="text-xs text-muted-foreground">Logistics Co. Ltd</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? t("auth.loginDesc")
              : t("auth.registerDesc")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">{t("auth.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t("auth.fullNamePlaceholder")}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isLoading}>
              {isLoading ? t("auth.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.signUp")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-secondary font-semibold hover:underline"
              >
                {isLogin ? t("auth.signUp") : t("auth.signIn")}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
