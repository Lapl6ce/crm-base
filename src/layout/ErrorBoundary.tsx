import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/EmptyState';

/* The backstop.
 *
 * Without one of these, a single bad render anywhere in the tree unmounts the
 * whole app and leaves a white page — the worst possible failure for a tool
 * people keep open all day, because it looks like their data is gone.
 *
 * Still a class component: `componentDidCatch` has no hook equivalent.
 *
 * `onReset` remounts the subtree rather than reloading the page, so a transient
 * render error costs the user their scroll position and nothing else. A fork
 * with error reporting wires it up in `componentDidCatch` — that is the only
 * line that needs to change.
 */

interface Props {
  children: ReactNode;
  /** Where the failure happened, for the reporting hook. */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The one place a fork adds Sentry/Rollbar. Kept as a console call so the
    // stack is never silently swallowed in development.
    console.error(`[${this.props.label ?? 'app'}] render failed`, error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Card>
        <ErrorState
          title="This screen hit a problem"
          description={
            error.message ||
            'Something went wrong drawing this page. Your data is safe — it is stored separately from what is on screen.'
          }
        />
        <div className="flex justify-center gap-2 pb-8">
          <Button variant="primary" onClick={this.reset}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/')}>
            Back to dashboard
          </Button>
        </div>
      </Card>
    );
  }
}
