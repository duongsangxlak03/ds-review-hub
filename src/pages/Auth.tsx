import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, CheckCircle2 } from "lucide-react";

const Auth = () => {
  const allowPublicSignup = import.meta.env.VITE_ALLOW_PUBLIC_SIGNUP === "true";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // Check if user is admin, redirect accordingly
      const { data: isAdmin } = await supabase.rpc("is_admin") as { data: boolean | null };
      navigate(isAdmin ? "/admin" : "/");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <a href="/" className="text-2xl font-extrabold tracking-tight text-primary inline-block">
            DS Review Hub
          </a>
          <p className="text-muted-foreground text-sm">
            {allowPublicSignup ? "Đăng nhập hoặc tạo tài khoản mới" : "Đăng nhập quản trị"}
          </p>
        </div>

        <Card className="border-border/50">
          <Tabs defaultValue="login" onValueChange={() => { setError(null); setSuccess(null); }}>
            <CardHeader className="pb-4">
              <TabsList className={allowPublicSignup ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                {allowPublicSignup && <TabsTrigger value="signup">Đăng ký</TabsTrigger>}
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <AlertDescription className="text-[hsl(var(--success))]">{success}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="mt-0 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" name="email" type="email" placeholder="you@example.com" required className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" name="password" type="password" placeholder="••••••••" required className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? "Đang xử lý..." : "Đăng nhập"}
                  </Button>
                </form>
              </TabsContent>

              {allowPublicSignup && <TabsContent value="signup" className="mt-0 space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" name="password" type="password" placeholder="Tối thiểu 6 ký tự" required minLength={6} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full font-semibold" disabled={loading}>
                    {loading ? "Đang xử lý..." : "Đăng ký"}
                  </Button>
                </form>
              </TabsContent>}
            </CardContent>
          </Tabs>
        </Card>

        {allowPublicSignup && (
          <p className="text-center text-xs text-muted-foreground">
            Bằng việc đăng ký, bạn đồng ý với Điều khoản sử dụng của DS Review Hub.
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
