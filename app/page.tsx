export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl font-extrabold text-yellow-400 mb-4">
        EgpayDCX
      </h1>

      <p className="text-xl text-gray-300 mb-6">
        India’s Hybrid Crypto Exchange – Trade Smarter. Pay Faster.
      </p>

      <div className="space-x-4">
        <a
          href="/markets"
          className="px-6 py-3 bg-yellow-500 text-black rounded shadow hover:bg-yellow-400"
        >
          Markets
        </a>

        <a
          href="/login"
          className="px-6 py-3 border border-yellow-400 rounded hover:bg-yellow-400 hover:text-black"
        >
          Login
        </a>
      </div>
    </main>
  );
}