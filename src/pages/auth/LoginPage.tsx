import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "./AuthLayout";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? "/app";
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const submit = async (v: Values) => {
    await signIn(v.email, v.password);
    toast.success("Signed in");
    navigate(from, { replace: true });
  };

  const demo = async () => {
    await signIn("amaka.obi@brightline-om.example", "demo-password");
    navigate("/app", { replace: true });
  };

  return (
    <AuthLayout title="Welcome back" subtitle={<>New to PanelMorrow? <Link to="/register" className="font-medium text-solar-600 hover:underline">Create an account</Link></>}>
      <Button type="button" variant="outline" className="w-full border-solar-300 bg-solar-50 text-solar-800 hover:bg-solar-100" onClick={demo}>
        <PlayCircle />Continue with demo account
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or sign in with email<span className="h-px flex-1 bg-border" /></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Work email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link to="/forgot-password" className="text-xs font-medium text-solar-600 hover:underline">Forgot password?</Link>
              </div>
              <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing in…" : "Sign in"}</Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
