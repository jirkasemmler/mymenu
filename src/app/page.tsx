import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MyMenu</h1>
        <p className="text-gray-500">Plánovač jídel pro rodinu</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/jidla"
          className="px-6 py-3 bg-white border border-gray-200 rounded-lg text-center hover:border-gray-400 transition-colors"
        >
          <div className="text-2xl mb-1">📝</div>
          <div className="font-medium">Katalog jídel</div>
          <div className="text-sm text-gray-500">Spravuj co umíte vařit</div>
        </Link>
        <Link
          href="/plan"
          className="px-6 py-3 bg-white border border-gray-200 rounded-lg text-center hover:border-gray-400 transition-colors"
        >
          <div className="text-2xl mb-1">📅</div>
          <div className="font-medium">Týdenní plán</div>
          <div className="text-sm text-gray-500">Vygeneruj jídelníček</div>
        </Link>
      </div>
    </div>
  );
}
