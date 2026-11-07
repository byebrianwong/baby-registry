import { Nav } from "@/components/nav";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main id="main-content" className="flex-1">{children}</main>
    </div>
  );
}
