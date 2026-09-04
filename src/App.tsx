import { Link, Route, Routes } from "react-router";

function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 sm:px-8">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
        Darba prototips
      </p>
      <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-slate-950 sm:text-6xl">
        Meža inventarizācijas un līgumu datu automatizācija
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        Divi pārbaudāmi rīki PDF datu nolasīšanai, aprēķiniem un lēmumu sagatavošanai.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Link className="surface-card group" to="/mezs">
          <span className="eyebrow">Mežs</span>
          <h2>Aprēķināt cirsmas vērtību</h2>
          <p>No inventarizācijas PDF līdz pārskatāmai gala atskaitei.</p>
          <span className="card-link">Atvērt rīku →</span>
        </Link>
        <Link className="surface-card group" to="/ligumi">
          <span className="eyebrow">Līgumi</span>
          <h2>Izvilkt līguma datus</h2>
          <p>Galvenie lauki, pārbaudes un gatavs e-pasta kopsavilkums.</p>
          <span className="card-link">Atvērt rīku →</span>
        </Link>
      </div>
      <Link className="mt-8 inline-block text-sm font-medium text-slate-600 underline" to="/lemumi">
        Kā un kāpēc risinājums veidots
      </Link>
    </main>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 sm:px-8">
      <Link className="text-sm text-emerald-800" to="/">
        ← Sākums
      </Link>
      <h1 className="mt-8 text-4xl font-semibold">{title}</h1>
      <p className="mt-4 text-slate-600">Rīks tiek sagatavots.</p>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/mezs" element={<Placeholder title="Meža inventarizācija" />} />
      <Route path="/ligumi" element={<Placeholder title="Līgumu datu izvilkšana" />} />
      <Route path="/lemumi" element={<Placeholder title="Lēmumi" />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
