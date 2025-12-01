"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginConfirmPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [message, setMessage] = useState("Finishing login…");

  useEffect(() => {
    async function finish() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Error: Could not verify login.");
        return;
      }

      // If user just logged in, upsert name into profiles
      const name = localStorage.getItem("pending_user_name");

      if (name) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: name,
        });
        localStorage.removeItem("pending_user_name");
      }

      setMessage("You're logged in! Redirecting…");

      setTimeout(() => {
        router.push("/map");
      }, 1000);
    }

    finish();
  }, []);

  return (
    <main className="max-w-md mx-auto p-6 text-center text-sm">
      {message}
    </main>
  );
}
