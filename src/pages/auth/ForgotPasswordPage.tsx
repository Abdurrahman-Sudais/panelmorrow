import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { authService } from "@/services/api/auth";
import { AuthLayout } from "./AuthLayout";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  return (
    <AuthLayout title="Reset your password" subtitle={<Link to="/login" className="font-medium text-solar-600 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <div className="rounded-xl border bg-teal-50 p-5 text-sm text-teal-900">
          <MailCheck className="mb-2 h-6 w-6" />
          If an account exists for that address, a reset code would be sent by Amazon Cognito. (Demo: no email sent.)
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(async (v) => { await authService.requestPasswordReset(v.email); setSent(true); })} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Work email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>Send reset code</Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
