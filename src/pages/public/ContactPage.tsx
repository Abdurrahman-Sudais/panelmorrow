import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Clock, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/marketing/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockDelay } from "@/services/api/config";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid work email"),
  company: z.string().min(2, "Company is required"),
  portfolio: z.string().min(1, "Select a portfolio size"),
  message: z.string().min(10, "Tell us a little more (10+ characters)").max(2000),
});
type Values = z.infer<typeof schema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", company: "", portfolio: "", message: "" } });

  const onSubmit = async () => {
    await mockDelay(700); // Demo: no message is actually sent.
    setSent(true);
    toast.success("Thanks — demo form received (no email was sent).");
  };

  return (
    <>
      <PageHero eyebrow="Contact" title="Let’s look at your portfolio together." description="Book a walkthrough with your own data, ask about integrations, or talk about enterprise requirements." />
      <section className="container grid gap-10 py-16 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {[
            { i: Mail, t: "Email", d: "hello@panelmorrow.com" },
            { i: MapPin, t: "Offices", d: "Lagos · Abuja" },
            { i: Clock, t: "Response time", d: "Within one business day" },
          ].map((x) => (
            <div key={x.t} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-solar-50 text-solar-600"><x.i className="h-5 w-5" /></span>
              <div>
                <p className="font-semibold text-navy-900">{x.t}</p>
                <p className="text-sm text-muted-foreground">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm md:p-8 lg:col-span-3">
          {sent ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-teal-500" />
              <h2 className="mt-4 text-xl font-semibold text-navy-900">Message received</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">This is a demo form, so nothing was sent. In production, our team would reply within one business day.</p>
              <Button variant="outline" className="mt-6" onClick={() => { form.reset(); setSent(false); }}>Send another</Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Work email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="portfolio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["1–15 sites", "16–100 sites", "100–500 sites", "500+ sites"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem className="sm:col-span-2"><FormLabel>How can we help?</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="sm:col-span-2">
                  <Button type="submit" variant="solar" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Sending…" : "Send message"}</Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </section>
    </>
  );
}
