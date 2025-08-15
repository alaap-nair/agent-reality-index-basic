import Link from 'next/link';

type PageProps = { params: Promise<{ game: string }> };

export default async function GamePage({ params }: PageProps) {
  const { game } = await params;
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Game: {game}</h1>
      <p className="text-sm text-gray-500">This triggers a simulated run and shows raw JSON.</p>
      <form action={`/api/run/${game}`} method="post">
        <button className="px-3 py-2 bg-blue-600 text-white rounded" type="submit">Run once</button>
      </form>
      <Link className="text-blue-600 underline" href="/arena">Back to Arena</Link>
    </div>
  );
}


