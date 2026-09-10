import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-14 sm:py-20 bg-brand-dark text-white">
        <Image
          src="/brand/logo-full-dark.png"
          alt="ArewaTecHub"
          width={380}
          height={150}
          className="mb-6 w-64 sm:w-[380px] h-auto"
          priority
        />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold max-w-2xl">
          Book a workspace. Learn a skill. Build your future.
        </h1>
        <p className="mt-4 max-w-xl text-white/80 text-sm sm:text-base">
          ArewaTecHub&apos;s all-in-one platform for coworking bookings and the Digital Academy.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-6 sm:px-0">
          <a href="/booking" className="rounded-full bg-brand-primary text-white px-6 py-3 font-semibold hover:bg-brand-primary-dark transition-colors">
            Book a Space
          </a>
          <a href="/academy/courses" className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
            Explore Courses
          </a>
        </div>
      </section>
    </main>
  );
}
