import { Sidebar } from "@/components/layout/Sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-16 md:ml-64 min-h-screen transition-all duration-300 ease-in-out p-6 md:p-10">
        {children}
      </main>
    </>
  );
}

