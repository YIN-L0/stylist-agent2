import StylistAgent from './components/StylistAgent'
import ErrorBoundary from './components/ErrorBoundary'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      <main>
        <ErrorBoundary>
          <StylistAgent />
        </ErrorBoundary>
      </main>

      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="text-xl font-bold">Stylist Agent</span>
          </div>
          <p className="text-gray-400">
            {t('footerText')}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

