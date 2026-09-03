"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden btn">
      Print / Save as PDF
    </button>
  );
}
