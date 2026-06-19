import { FileQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-700">
          <FileQuestion className="h-8 w-8 text-surface-400" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">Page not found</h1>
        <p className="mt-1 text-sm text-surface-500">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="primary">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
