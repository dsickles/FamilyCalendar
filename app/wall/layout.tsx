import type { Metadata } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./wall.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Family Wall (prototype)",
  description: "Clickable prototype of the tabbed family wall",
};

export default function WallLayout({ children }: LayoutProps<"/wall">) {
  return <div className={`${archivo.variable} ${instrument.variable} h-full`}>{children}</div>;
}
