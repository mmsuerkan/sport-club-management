import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Spor Klübü Yönetim Sistemi
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Spor klübünüzü kolayca yönetin
        </p>
        <Link
          href="/login"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
        >
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}
