// src/components/OurPolicy.jsx
import React from "react";
import { assets } from "../assets/assets";

const POLICIES = [
  {
    icon: assets.exchange_icon,
    title: "Easy Exchange Policy",
    subtitle: "We offer hassle free exchange policy",
  },
  {
    icon: assets.quality_icon,
    title: "3 Days Return Policy",
    subtitle: "We provide 3 days free return policy",
  },
  {
    icon: assets.support_img,
    title: "Best customer support",
    subtitle: "we provide 24/7 customer support",
  },
  {
    // 👇 add your icon file here (placeholder path is safe even if not there yet)
    icon: assets.same_day_dispatch || assets.support_img,
    title: "Same Day Dispatch",
    subtitle: "Order by 2 pm, ships today",
  },
];

export default function OurPolicy() {
  return (
    <section className="py-20 text-gray-700">
      {/* grid keeps spacing perfect at 4 features; typography matches your site */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-2 text-center text-xs sm:text-sm md:text-base">
        {POLICIES.map(({ icon, title, subtitle }) => (
          <div key={title}>
            <img
              className="w-12 m-auto mb-5"
              src={icon}
              alt={title}
              loading="lazy"
            />
            <p className="font-semibold">{title}</p>
            <p className="text-gray-400">{subtitle}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
