import type { Metadata } from "next";
import EducationClient from "./education-client";

export const metadata: Metadata = { title: "온라인마케팅 교육자료실 | 폴라애드", robots: { index: false, follow: false, noarchive: true, nocache: true } };
export default function EducationPage(){return <EducationClient/>}
