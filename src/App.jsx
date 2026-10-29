import { useEffect, useState } from 'react';
import LeadForm from './components/LeadForm.jsx';
import Admin from './components/Admin.jsx';
import Globe from './components/Globe.jsx';

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export default function App() {
  const path = usePath();
  const isAdmin = path.startsWith('/admin');

  return (
    <div className="app">
      <Globe dim={isAdmin} />
      <main className="shell">{isAdmin ? <Admin /> : <LeadForm />}</main>
      <footer className="foot">
        <span>VyomAcre</span>
        <span className="dot">·</span>
        <span>Lucknow</span>
        <span className="dot">·</span>
        <span title="build marker — if this is missing you are on an old deployment">v3</span>
      </footer>
    </div>
  );
}
