import Link from "next/link";
import { BRAND } from "@calque/ui";
import { Card, CardContent } from "@/components/ui/card";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-papier-100 px-6 py-12">
      <Link href="/" className="mb-8 text-[15px] font-semibold tracking-tight">
        {BRAND.name}
      </Link>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">{children}</CardContent>
      </Card>
    </div>
  );
}
