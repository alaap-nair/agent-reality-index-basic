import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Judgment Arena</h1>
        <p className="text-gray-600 mb-8">Test and compare LLM capabilities across different games.</p>
        <Link 
          href="/arena" 
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
        >
          View Scoreboard
        </Link>
      </div>
    </div>
  );
}