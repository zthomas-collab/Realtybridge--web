import Image from "@/lib/next/image";
import Link from "@/lib/next/link";

/** Bridge-and-house mark cropped from the RealtyBridge logo (public/brand/realtybridge-logo.png). */
export function LogoMark({ height = 30 }: { height?: number }) {
  return <Image src="/brand/realtybridge-mark.png" alt="" width={257} height={119} priority style={{ height, width: "auto" }} />;
}

/** "Realty" in navy, "Bridge" in teal, as in the logo. */
export function Wordmark({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-navy">Realty</span>
      <span className="text-teal">Bridge</span>
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2" aria-label="RealtyBridge home">
      <LogoMark />
      <Wordmark className="hidden text-xl sm:inline" />
    </Link>
  );
}
