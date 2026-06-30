export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f5c] via-sd4a-blue to-[#0e3a6e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-80px] right-[-80px] w-72 h-72 bg-card/5 rounded-full" />
      <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 bg-card/5 rounded-full" />
      <div className="absolute top-1/2 left-[-120px] w-48 h-48 bg-sd4a-cyan/10 rounded-full" />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
