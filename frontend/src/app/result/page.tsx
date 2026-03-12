import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Results - LokBhasha',
  description: 'Translation results',
}

export default function ResultPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button className="mb-8 text-blue-600 hover:text-blue-800 font-semibold">
          ← Back to Upload
        </button>

        <div className="space-y-8">
          {/* Original Marathi */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Original Marathi</h2>
            <div className="bg-gray-50 p-4 rounded font-serif text-lg text-gray-800 leading-relaxed">
              [Original Marathi text will appear here]
            </div>
          </div>

          {/* English Translation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">English Translation</h2>
            <div className="bg-gray-50 p-4 rounded text-lg text-gray-800 leading-relaxed">
              [English translation will appear here]
            </div>
          </div>

          {/* Plain Explanation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Plain English Explanation</h2>
            <div className="bg-blue-50 p-4 rounded text-lg text-gray-800 leading-relaxed border-l-4 border-blue-500">
              [Simplified explanation will appear here]
            </div>
          </div>

          {/* Key Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Actions</h2>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-green-600 font-bold">✓</span>
                <div>
                  <p className="font-semibold text-gray-900">[Action 1]</p>
                  <p className="text-gray-600 text-sm">[Details]</p>
                </div>
              </div>
            </div>
          </div>

          {/* Glossary Terms */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Government Terms Explained</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-gray-200 p-4 rounded">
                <p className="font-semibold text-gray-900">[Marathi Term]</p>
                <p className="text-gray-600 mt-1">[English Meaning]</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
