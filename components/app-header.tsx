import Image from "next/image";

type AppHeaderProps = {
  subtitle: string;
};

export function AppHeader({
  subtitle,
}: AppHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center">
          <Image
            src="/logos/fcsg.svg"
            alt="FC St. Gallen"
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <p className="text-green-300 text-xs sm:text-sm font-bold tracking-[0.18em] uppercase">
            Saison 2026 / 2027
          </p>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            FCSG Tippspiel
          </h1>

          <p className="text-green-200 mt-1">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}