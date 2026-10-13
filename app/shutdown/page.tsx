import type { Metadata } from "next";
import ShutdownScene from "./scene";
export const metadata: Metadata = { title: { absolute: "Shine has permanently shut down" } };
export default function ShutdownPage() { return <ShutdownScene />; }
