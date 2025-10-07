
import BottomNavbar from '@/components/bottom-navbar';
import Header from '@/components/header';
import { Logo } from '@/components/icons';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 p-4">
        <Logo />
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNavbar />
    </div>
  );
}
