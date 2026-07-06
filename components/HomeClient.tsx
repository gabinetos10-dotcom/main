"use client";

import { useState } from "react";
import Preloader from "./Preloader";
import Navbar from "./Navbar";
import Hero from "./Hero";
import About from "./About";
import Fleet from "./Fleet";
import BookingSection from "./BookingSection";
import Contact from "./Contact";
import Footer from "./Footer";
import type { Vehicle } from "./types";

export default function HomeClient({ vehicles }: { vehicles: Vehicle[] }) {
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);

  // "Rent this vehicle" on a card pre-selects the car and scrolls to booking.
  const handleBook = (car: Vehicle) => {
    setSelectedCar(car);
    document.getElementById("reservation")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Preloader />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Fleet vehicles={vehicles} onBook={handleBook} />
        <BookingSection
          vehicles={vehicles}
          selectedCar={selectedCar}
          onSelectCar={setSelectedCar}
        />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
