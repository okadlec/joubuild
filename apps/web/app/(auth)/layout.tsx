export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">JouBuild</h1>
          <p className="mt-1 text-sm text-muted-foreground">Správa staveb pod kontrolou</p>
        </div>
        {children}
      </div>
    </div>
  );
}
