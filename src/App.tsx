import { Link, Route, Routes } from "react-router";
import { ContractsPage } from "./pages/ContractsPage";
import { DecisionsPage } from "./pages/DecisionsPage";
import { ForestPage } from "./pages/ForestPage";

function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <p className="home-kicker">Darba prototips · divi procesi</p>
        <h1>Meža inventarizācijas un līgumu datu automatizācija — demo</h1>
        <p className="home-intro">
          No sarežģīta PDF līdz pārbaudāmam lēmumam. Aprēķini ir izsekojami, bet neskaidrības
          vienmēr paliek redzamas.
        </p>
      </section>

      <section className="home-tools" aria-label="Prototipi">
        <Link className="surface-card forest-card" to="/mezs">
          <span className="eyebrow">01 · Mežs</span>
          <h2>Aprēķināt cirsmas vērtību</h2>
          <p>Inventarizācijas tabula, kailcirtes atlase, apjoms, sortimenti un gala cena.</p>
          <span className="card-link">Atvērt rīku →</span>
        </Link>
        <Link className="surface-card contract-card" to="/ligumi">
          <span className="eyebrow">02 · Līgumi</span>
          <h2>Izvilkt līguma datus</h2>
          <p>Līguma lauki ar avota citātiem, pārbaudēm un gatavu e-pasta kopsavilkumu.</p>
          <span className="card-link">Atvērt rīku →</span>
        </Link>
      </section>

      <section className="home-steps" aria-labelledby="steps-title">
        <div>
          <span className="eyebrow">Process</span>
          <h2 id="steps-title">Kā tas strādā</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Ielādē PDF</strong>
              <p>Fails tiek nolasīts pārlūkā; meža dokuments paliek ierīcē.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Pārbaudi rezultātu</strong>
              <p>Redzi katru noteikumu, avota citātu un brīdinājumu.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Izmanto atskaiti</strong>
              <p>Kopē, lejupielādē vai pielāgo ievades un pārrēķini.</p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="home-footer">
        <Link to="/lemumi">Lēmumi par risinājumu</Link>
        <a
          href="https://github.com/kirill-sokolov/forest-inventory-valuation"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        <span>Kirils Sokolovs · 2026</span>
      </footer>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/mezs" element={<ForestPage />} />
      <Route path="/ligumi" element={<ContractsPage />} />
      <Route path="/lemumi" element={<DecisionsPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
