export function Footer({ siteName }: { siteName: string }) {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground">
        <div className="flex gap-4">
          <a href="/p/privacy" className="hover:underline">Privacy Policy</a>
          <a href="/p/terms" className="hover:underline">Terms &amp; Conditions</a>
        </div>
        <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
