import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "./AuthLayout";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    company: z.string().min(2, "Company is required"),
    email: z.string().email("Enter a valid work email"),
    password: z
      .string()
      .min(10, "At least 10 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", company: "", email: "", password: "", confirm: "", terms: false as unknown as true },
  });

  const submit = async (v: Values) => {
    await register({ name: v.name, email: v.email, company: v.company, password: v.password });
    toast.success("Account created — welcome to PanelMorrow");
    navigate("/app");
  };

  return (
    <AuthLayout title="Create a demo account" subtitle={<>Already have an account? <Link to="/login" className="font-medium text-solar-600 hover:underline">Sign in</Link></>}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full name</FormLabel><FormControl><Input autoComplete="name" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="company" render={({ field }) => (
              <FormItem><FormLabel>Company</FormLabel><FormControl><Input autoComplete="organization" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Work email</FormLabel><FormControl><Input type="email" autoComplete="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="confirm" render={({ field }) => (
            <FormItem><FormLabel>Confirm password</FormLabel><FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="terms" render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl><Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-0.5" /></FormControl>
                <FormLabel className="font-normal leading-snug text-muted-foreground">I agree to the Terms of Service and Privacy Policy.</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="submit" variant="solar" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating account…" : "Create account"}</Button>
        </form>
      </Form>
    </AuthLayout>
  );
}
