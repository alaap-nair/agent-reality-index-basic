'use client';

export default function RefreshButton() {
  return (
    <button 
      onClick={() => window.location.reload()}
      className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-shadow"
    >
      Refresh Data
    </button>
  );
}
