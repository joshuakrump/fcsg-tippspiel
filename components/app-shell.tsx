import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-green-950
        text-white
        px-4 py-6
        sm:px-6 sm:py-8
        md:px-8
      "
    >
      {/* Linker Bär */}
      <img
        src="/images/stgallen-baer.png"
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          select-none
          absolute
          left-[-20px]
          top-[260px]
          hidden
          xl:block
          w-[620px]
          opacity-[0.2]
          scale-x-[-1]
        "
      />

      {/* Rechter Bär */}
      <img
        src="/images/stgallen-baer.png"
        alt=""
        aria-hidden="true"
        className="
          pointer-events-none
          select-none
          absolute
          right-[-20px]
          top-[260px]
          hidden
          xl:block
          w-[620px]
          opacity-[0.2]
        "
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {children}
      </div>
    </main>
  );
}