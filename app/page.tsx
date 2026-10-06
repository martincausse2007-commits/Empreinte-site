import { Configurator } from "@/components/Configurator";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Benefits } from "@/components/site/Benefits";
import { Faq } from "@/components/site/Faq";
import { Contact } from "@/components/site/Contact";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-stone-100">
        <Hero />
        <Configurator />
        <HowItWorks />
        <Benefits />
        <Faq />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
