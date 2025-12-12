export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <section className="container mx-auto px-6 py-32 text-center">
        <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-8">
          Intelliflake
        </h1>
        <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto opacity-90">
          MCP Servers & AI App Development
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/services" className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 rounded-xl font-semibold transition-all">
            View Services
          </a>
          <a href="/demos" className="px-8 py-4 border-2 border-white/30 hover:border-white rounded-xl font-semibold transition-all">
            Live Demos
          </a>
        </div>
      </section>
    </main>
  )
}
