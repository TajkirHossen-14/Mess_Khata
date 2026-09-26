import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ice-blue-50">
        <nav className="bg-deep-navy-900 text-white p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold font-heading">MessKhata</h1>
            <div className="space-x-4">
              <a href="/dashboard" className="hover:text-soft-blue-400">Dashboard</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
