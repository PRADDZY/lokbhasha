export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">LokBhasha</h1>
          <p className="text-xl text-gray-600">Making government language understandable</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                Upload Government Circular (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                Paste Marathi Text
              </label>
              <textarea
                placeholder="Paste government circular text in Marathi..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200">
              Analyze Circular
            </button>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-semibold text-gray-900 mb-2">PDF Upload</h3>
            <p className="text-gray-600">Extract text from PDFs and scanned documents</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🌐</div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Translation</h3>
            <p className="text-gray-600">Intelligent Marathi to English translation</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">✨</div>
            <h3 className="font-semibold text-gray-900 mb-2">Simplification</h3>
            <p className="text-gray-600">Convert complex text to simple language</p>
          </div>
        </div>
      </div>
    </main>
  )
}
