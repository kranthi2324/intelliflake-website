export default function Services() {
  return (
    <div className="min-h-screen bg-slate-900 text-white py-24">
      <div className="container mx-auto px-6">
        <h1 className="text-5xl font-bold text-center mb-20 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Services
        </h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-800/50 rounded-2xl backdrop-blur">
            <h2 className="text-3xl font-bold mb-4">MCP Servers</h2>
            <ul className="space-y-2 text-lg">
              <li>• Custom Model Context Protocol deployments</li>
              <li>• AI agent orchestration</li>
              <li>• Scalable server infrastructure</li>
            </ul>
          </div>
          <div className="p-8 bg-slate-800/50 rounded-2xl backdrop-blur">
            <h2 className="text-3xl font-bold mb-4">AI Development</h2>
            <ul className="space-y-2 text-lg">
              <li>• iOS app AI integrations</li>
              <li>• Custom model training</li>
              <li>• Real-time inference APIs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

