import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import About from "../components/About";
import TestimonialsSection from "../components/TestimonialsSection";
import FAQ from "../components/FAQ";
import Features from "../components/Features";

const Home = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Fixed Navbar */}
      <Navbar />

      {/* Hero — handles its own min-height and padding */}
      <Hero />

      {/* Landing Page Sections */}
      <Features />
      <HowItWorks />
      <About />
      <TestimonialsSection />
      <FAQ />
    </div>
  );
};

export default Home;
