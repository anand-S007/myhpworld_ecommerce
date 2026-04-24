import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4 text-center">
      <div>
        <div className="font-display font-extrabold text-8xl text-hp-blue">404</div>
        <h1 className="font-display text-3xl font-bold mt-2">Page not found</h1>
        <p className="text-slate-500 mt-2">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="btn-primary mt-6 inline-block px-6 py-3 rounded-full"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
