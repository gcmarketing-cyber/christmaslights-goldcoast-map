import Link from "next/link";

type LogoProps = {
  variant?: "long" | "circle";
  theme?: "light" | "dark"; // light = for light backgrounds, dark = for dark backgrounds
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  href?: string;
};

export function Logo({
  variant = "long",
  theme = "light",
  size = "md",
  withText = false,
  href = "/map",
}: LogoProps) {
  let src = "/logos/apg-gc-long-orange-b.svg";

  if (variant === "circle" && theme === "light") {
    src = "/logos/apg-gc-circle-orange.svg";
  } else if (variant === "circle" && theme === "dark") {
    src = "/logos/apg-gc-circle-orange-b.svg";
  } else if (variant === "long" && theme === "dark") {
    src = "/logos/apg-gc-long-orange-w.svg";
  } else if (variant === "long" && theme === "light") {
    src = "/logos/apg-gc-long-orange-b.svg";
  }

  const width =
    size === "sm" ? 120 : size === "lg" ? 220 : 170;

  const img = (
    <div className="flex items-center gap-2">
      <img
        src={src}
        alt="All Properties Group Gold Coast"
        style={{ width, height: "auto" }}
      />
      {withText && (
        <span className="text-sm font-semibold whitespace-nowrap">
          GC Lights Map
        </span>
      )}
    </div>
  );

  return (
    <Link href={href} aria-label="Go to map">
      {img}
    </Link>
  );
}

// Optional default export, in case you ever do `import Logo from "@/components/Logo"`
export default Logo;
