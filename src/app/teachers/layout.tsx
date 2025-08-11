export default function TeachersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50 text-slate-900">
      {children}
    </div>
  );
}