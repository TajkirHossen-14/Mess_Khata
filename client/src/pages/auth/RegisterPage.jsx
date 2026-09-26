export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white rounded-xl shadow-sm border border-blue300 p-8">
        <h1 className="font-heading text-2xl font-bold text-navy900 mb-6 text-center">Register</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-darktext mb-1">Full Name</label>
            <input type="text" className="w-full px-4 py-3 border border-blue300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue700" placeholder="Enter your full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-darktext mb-1">Email</label>
            <input type="email" className="w-full px-4 py-3 border border-blue300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue700" placeholder="Enter your email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-darktext mb-1">Password</label>
            <input type="password" className="w-full px-4 py-3 border border-blue300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue700" placeholder="Create a password" />
          </div>
          <div>
            <label className="block text-sm font-medium text-darktext mb-1">Confirm Password</label>
            <input type="password" className="w-full px-4 py-3 border border-blue300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue700" placeholder="Confirm your password" />
          </div>
          <button type="submit" className="w-full py-3 bg-blue700 text-white rounded-lg font-medium hover:bg-blue600 transition-colors">
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-secondarytext text-sm">
          Already have an account? <a href="/login" className="text-blue700 hover:underline">Login</a>
        </p>
      </div>
    </div>
  )
}