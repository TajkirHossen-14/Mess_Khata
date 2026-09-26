import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto text-center py-20">
      <h1 className="font-heading text-4xl lg:text-5xl font-bold text-navy900 mb-6">
        Welcome to MessKhata
      </h1>
      <p className="text-secondarytext text-lg mb-8">
        Smart Mess Management Platform for student mess operations
      </p>
      <div className="flex gap-4 justify-center">
        <Button asChild size="lg">
          <Link to="/login">Login</Link>
        </Button>
        <Button variant="secondary" asChild size="lg">
          <Link to="/register">Register</Link>
        </Button>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-blue300 p-6">
          <h3 className="font-heading text-lg font-semibold text-navy900 mb-2">Meal Tracking</h3>
          <p className="text-secondarytext text-sm">Track daily meals and attendance</p>
        </div>
        <div className="bg-white rounded-xl border border-blue300 p-6">
          <h3 className="font-heading text-lg font-semibold text-navy900 mb-2">Expense Splitting</h3>
          <p className="text-secondarytext text-sm">Automatic bill calculation and splitting</p>
        </div>
        <div className="bg-white rounded-xl border border-blue300 p-6">
          <h3 className="font-heading text-lg font-semibold text-navy900 mb-2">Duty Roster</h3>
          <p className="text-secondarytext text-sm">Manage bazar, cleaning, and washroom duties</p>
        </div>
      </div>
    </div>
  )
}