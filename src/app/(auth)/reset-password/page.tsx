import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordClient />
    </Suspense>
  );
}

function ResetPasswordSkeleton() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#001a33] to-[#002b5b] text-white px-6">
      <div className="bg-[#0b2545] border border-[#1b4e89] rounded-3xl p-10 w-full max-w-md shadow-2xl text-center">
        <div className="h-20 w-20 rounded-2xl bg-white/10 mx-auto mb-6 animate-pulse" />
        <div className="h-8 w-3/4 bg-white/10 rounded-lg mx-auto mb-4 animate-pulse" />
        <div className="h-4 w-5/6 bg-white/10 rounded-lg mx-auto mb-2 animate-pulse" />
        <div className="h-4 w-2/3 bg-white/10 rounded-lg mx-auto mb-6 animate-pulse" />
        <div className="h-12 w-full bg-white/10 rounded-xl mx-auto animate-pulse" />
      </div>
    </section>
  );
}
