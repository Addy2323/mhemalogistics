import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import HowItWorks from "@/components/HowItWorks";
import WhyUs from "@/components/WhyUs";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>MHEMA EXPRESS | Trusted Kariakoo Logistics & Delivery</title>
        <meta 
          name="description" 
          content="MHEMA EXPRESS - Your trusted partner for Kariakoo shopping. We collect, verify quality, and deliver goods across Tanzania. No scams, just trusted service." 
        />
        <meta name="keywords" content="Kariakoo, logistics, delivery, Tanzania, Dar es Salaam, quality verification, trusted shopping" />
        <link rel="canonical" href="https://mhemaexpress.co.tz" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Hero />
          <Services />
          <HowItWorks />
          <WhyUs />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
