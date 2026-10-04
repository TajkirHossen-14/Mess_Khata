import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl py-12 text-center sm:py-20">
      <p className="text-sm font-semibold uppercase text-blue700">MessKhata</p>
      <h2 className="mt-3 font-heading text-3xl font-bold text-navy900 sm:text-4xl">Coming soon</h2>
      <p className="mx-auto mt-4 max-w-xl text-secondaryText">
        Your shared mess management workspace is being prepared.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/login" className="rounded-control bg-blue700 px-5 py-3 font-medium text-white hover:bg-blue600">Login</Link>
        <Link to="/register" className="rounded-control border border-blue700 bg-white px-5 py-3 font-medium text-blue700 hover:bg-ice100">Register</Link>
      </div>
    </section>
  )
}