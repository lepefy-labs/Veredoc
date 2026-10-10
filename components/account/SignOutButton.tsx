"use client";

import { signOut } from "next-auth/react";
import Button from "@/components/ui/Button";

export default function SignOutButton() {
  return (
    <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/" })} className="w-full sm:w-auto">
      Esci dall&apos;account
    </Button>
  );
}
