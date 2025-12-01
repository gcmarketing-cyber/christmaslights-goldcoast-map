"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState, ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import Image from "next/image";
import MapLogo from "@/components/MapLogo";
import { usePathname } from "next/navigation";

const ADMIN_EMAILS = [
  "goldcoast@allpropertiesgroup.com.au",
  "gc.marketing@allpropertiesgroup.com.au",
];

export default function RootLayout({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        setUserEmail(data.user?.email ?? null);
      })
      .catch(() => {});
  }, []);

  const isAdmin =
    userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase());

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/map";
  }

  const mainLinks = (
    <>
      <Link href="/map" className="px-2 py-1 hover:underline">
        Map
      </Link>
      <Link href="/leaderboard" className="px-2 py-1 hover:underline">
        Leaderboard
      </Link>
      {isAdmin && (
        <Link href="/admin" className="px-2 py-1 hover:underline">
          Admin
        </Link>
      )}
    </>
  );

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f7f7f7] flex flex-col">
        {/* Fixed header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
          <div className="mx-auto max-w-6xl h-16 px-6 flex items-center justify-between">
            {/* Logo (clickable) */}
            <Link href="/map" className="flex items-center">
              <MapLogo variant="light" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-3 text-sm">
              {mainLinks}

              <Link href="/add" className="btn-xmas">
                Add display
              </Link>

              {userEmail ? (
                <>
                  <span className="text-gray-500 text-xs">{userEmail}</span>
                  <button
                    onClick={handleLogout}
                    className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-100"
                >
                  Log in
                </Link>
              )}

              {/* Desktop APG logo */}
              <div className="hidden md:flex items-center ml-4">
                <Image
                  src="/logos/apg-gc-long-orange-b.svg"
                  alt="All Properties Group Gold Coast"
                  width={150}
                  height={32}
                />
              </div>
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden inline-flex items-center justify-center w-9 h-9 border border-gray-300 rounded bg-gray-200 hover:bg-gray-300 transition"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span className="sr-only">Toggle menu</span>
              <div className="space-y-1">
                <span className="block w-4 h-[2px] bg-black" />
                <span className="block w-4 h-[2px] bg-black" />
                <span className="block w-4 h-[2px] bg-black" />
              </div>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden border-t bg-gray-200">
              <nav className="flex flex-col items-center px-4 py-3 text-sm space-y-2">
                {/* Map */}
                <Link
                  href="/map"
                  className="w-full max-w-xs text-center px-3 py-2 rounded-lg hover:bg-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Map
                </Link>
                <div className="h-px w-full max-w-xs bg-gray-300" />

                {/* Leaderboard */}
                <Link
                  href="/leaderboard"
                  className="w-full max-w-xs text-center px-3 py-2 rounded-lg hover:bg-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Leaderboard
                </Link>

                {/* Admin (if applicable) */}
                {isAdmin && (
                  <>
                    <div className="h-px w-full max-w-xs bg-gray-300" />
                    <Link
                      href="/admin"
                      className="w-full max-w-xs text-center px-3 py-2 rounded-lg hover:bg-white"
                      onClick={() => setMobileOpen(false)}
                    >
                      Admin
                    </Link>
                  </>
                )}

                <div className="h-px w-full max-w-xs bg-gray-300" />

                {/* Add display – prominent pill button */}
                <Link
                  href="/add"
                  className="w-full max-w-xs text-center text-[11px] font-semibold uppercase tracking-wide rounded-full py-2 shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, #7e0a17, #c4142d)",
                    color: "#ffffff",
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  Add display
                </Link>

                <div className="h-px w-full max-w-xs bg-gray-300" />

                {/* Login / Logout */}
                {userEmail ? (
                  <>
                    <span className="text-xs text-gray-500 text-center">
                      {userEmail}
                    </span>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="mt-1 px-3 py-1 text-xs border rounded-full hover:bg-white"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="mt-1 px-3 py-1 text-xs border rounded-full hover:bg-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log in
                  </Link>
                )}

                {/* Divider before APG logo */}
                <div className="h-px w-full max-w-xs bg-gray-300" />

                {/* APG logo in mobile menu, centered */}
                <div className="mt-2">
                  <Image
                    src="/logos/apg-gc-long-orange-b.svg"
                    alt="All Properties Group Gold Coast"
                    width={150}
                    height={32}
                    className="mx-auto"
                  />
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Main content – note conditional bottom padding (no extra pb on map page) */}
        <main
  className={`${
    isMapPage ? "pt-16 pb-0" : "pt-20 md:pt-24 pb-16"
  } flex-1`}
>
  {children}
</main>


        {/* Footer with APG GC branding – hidden on /map so it doesn't affect the map layout */}
        {!isMapPage && (
          <footer className="border-t bg-white/95 backdrop-blur-sm text-xs text-gray-600">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-center sm:text-left">
                Christmas Lights Gold Coast ·{" "}
                <span className="text-gray-800">
                  A free community project by{" "}
                  <span className="font-semibold">
                    All Properties Group Gold Coast
                  </span>
                </span>
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <a
                    href="https://www.facebook.com/GoldCoast.APG/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/goldcoast.apg/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    Instagram
                  </a>
                </div>
                <Image
                  src="/logos/apg-gc-long-orange-b.svg"
                  alt="All Properties Group Gold Coast"
                  width={150}
                  height={40}
                />
              </div>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}
