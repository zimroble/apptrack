import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        <p className="text-5xl font-semibold tracking-tight">404</p>
        <p className="mt-2 text-zinc-500">That page doesn&apos;t exist (or isn&apos;t yours).</p>
        <Link href="/board" className="btn-primary mt-6">Back to board</Link>
      </div>
    </div>
  );
}
