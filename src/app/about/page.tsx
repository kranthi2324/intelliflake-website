export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white py-24">
      <div className="container mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold text-center mb-20 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          About Intelliflake
        </h1>
        
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Founder Bio */}
          <section className="text-center">
            <div className="w-32 h-32 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-2xl mx-auto mb-8 flex items-center justify-center text-3xl font-bold">
              IK
            </div>
            <h2 className="text-4xl font-bold mb-6">Kranthi</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              iOS Developer turned Full-Stack AI Engineer. Creator of <span className="font-semibold text-cyan-400">RoomWise</span> – the smart home organization app with 3D visualization and AI-powered item tracking.
            </p>
          </section>

          {/* RoomWise Project */}
          <section className="bg-slate-800/30 rounded-3xl p-12 backdrop-blur">
            <h3 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              RoomWise
            </h3>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <ul className="space-y-4 text-xl mb-8">
                  <li>• SwiftUI + SwiftData home organization app</li>
                  <li>• 3D room modeling & photo barcode scanning</li>
                  <li>• AI-powered "where is my stuff?" search</li>
                  <li>• Pantry/recipe auto-categorization</li>
                </ul>
                <p className="text-lg opacity-80 italic">"Transforming chaos into organized bliss with intelligent spatial AI."</p>
              </div>
              <div className="text-center">
                <div className="w-64 h-64 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl mx-auto flex items-center justify-center text-6xl font-bold opacity-20 mb-4">
                  🏠
                </div>
                <p className="text-sm opacity-70">3D Room Visualization</p>
              </div>
            </div>
          </section>

          {/* MCP Expertise */}
          <section className="bg-slate-800/30 rounded-3xl p-12 backdrop-blur">
            <h3 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              MCP Servers
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '⚡', title: 'Model Context Protocol', desc: 'AI agent orchestration across distributed servers' },
                { icon: '🔗', title: 'Real-time Inference', desc: 'Low-latency model serving with auto-scaling' },
                { icon: '🛠️', title: 'Custom Deployments', desc: 'Enterprise-grade MCP infrastructure' }
              ].map((item, i) => (
                <div key={i} className="text-center p-6">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h4 className="text-2xl font-bold mb-3">{item.title}</h4>
                  <p className="opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 text-center py-12">
            {[
              { num: '50+', label: 'MCP Servers Deployed' },
              { num: '3', label: 'AI Apps Live' },
              { num: '2+', label: 'Years Building AI' }
            ].map((stat, i) => (
              <div key={i} className="p-8 bg-slate-800/50 rounded-2xl">
                <div className="text-4xl font-bold text-cyan-400 mb-2">{stat.num}</div>
                <div className="opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

