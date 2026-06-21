import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center p-8">
          <Card className="max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 dark:bg-accent-900/30">
              <AlertTriangle className="h-6 w-6 text-accent-500" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-surface-900 dark:text-surface-100">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-surface-500">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <Button onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
