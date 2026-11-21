import { ContactForm } from "@/kit/LeadForms";
import { SITE } from "@/kit/site";

import { Clock, Mail, MapPin } from "lucide-react";

import { PageHero } from "@/components/marketing/shared";

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let’s look at your portfolio together." description="Book a walkthrough with your own data, ask about integrations, or talk about enterprise requirements." />
      <section className="container grid gap-10 py-16 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {[
            { i: Mail, t: "Email", d: SITE.email },
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
          <ContactForm bare />
        </div>
      </section>
    </>
  );
}
