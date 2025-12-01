"use client";

import Image from "next/image";

type MapLogoProps = {
  variant?: "light" | "dark";
  className?: string;
};

export default function MapLogo({
  variant = "light",
  className = "",
}: MapLogoProps) {
  // 👉 Change these to your real logo filenames
  const src =
    variant === "dark"
      ? "/logos/christas-lights-guide-logo-W.svg"
      : "/logos/christas-lights-guide-logo-B.svg";

  return (
    <Image
      src={src}
      alt="Gold Coast Christmas Lights Map"
      width={180}
      height={36}
      className={`h-9 w-auto ${className}`}
      priority
    />
  );
}
