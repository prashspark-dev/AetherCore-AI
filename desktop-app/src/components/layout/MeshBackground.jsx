import React from "react";
/**
 * 3-Color Overlapping Layered Mesh Background:
 * Renders three organic, overlapping translucent color fields (Electric Indigo,
 * Cyber Cyan, and Royal Violet) at varying intensities and depths over a deep
 * obsidian canvas, plus a subtle technical micro-grid.
 */
export default function MeshBackground({ dynamicAccentHex = "#06B6D4" }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#060913] pointer-events-none">
      {/* Layer 1: Electric Indigo (#4F46E5) — Dominant Top-Left & Upper-Center Field */}
      <div
        className="absolute -top-32 -left-24 h-[540px] w-[620px] rounded-full opacity-45 blur-[130px] transition-all duration-1000"
        style={{
          background: "radial-gradient(circle, #4F46E5 0%, rgba(79,70,229,0) 72%)",
        }}
      />
      {/* Layer 2: Cyber Cyan (#06B6D4 / Dynamic Thermal Hue) — Overlapping Center-Right Wave */}
      <div
        className="absolute top-16 right-[-80px] h-[520px] w-[580px] rounded-full opacity-35 blur-[125px] mix-blend-screen transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${dynamicAccentHex} 0%, rgba(6,182,212,0) 70%)`,
        }}
      />
      {/* Layer 3: Royal Violet / Magenta (#9333EA) — Overlapping Bottom-Center & Left Depth */}
      <div
        className="absolute -bottom-36 left-1/4 h-[500px] w-[640px] rounded-full opacity-35 blur-[135px] mix-blend-lighten transition-all duration-1000"
        style={{
          background: "radial-gradient(circle, #9333EA 0%, rgba(147,51,234,0) 72%)",
        }}
      />
      {/* Subtle Overlapping Accent Pocket (Top-Right Indigo/Violet Blend) */}
      <div
        className="absolute top-1/3 left-1/3 h-[340px] w-[340px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #38BDF8 0%, transparent 70%)",
        }}
      />
      {/* Precision Micro-Grid Overlay for High-Tech Engineering Aesthetic */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
    </div>
  );
}
