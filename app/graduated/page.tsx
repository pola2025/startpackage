"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GraduatedPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/graduated/communication");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-pulse text-gray-600">이동 중...</div>
      </div>
    </div>
  );
}
