"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingActionButtonProps {
  href: string;
  label?: string;
}

export function FloatingActionButton({
  href,
  label = "자료 제출",
}: FloatingActionButtonProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-20 right-4 z-40 lg:hidden"
      aria-label={label}
    >
      <Button
        size="lg"
        className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow bg-gold-600 hover:bg-gold-700"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </Link>
  );
}
