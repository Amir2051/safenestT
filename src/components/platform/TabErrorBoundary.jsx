import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Contains a crash to the tab that caused it, so one malformed record can't
 * blank the whole investigation workspace. Resets when the tab changes.
 */
export default class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(`[workspace] tab "${this.props.tab}" crashed:`, error, info?.componentStack);
  }
  componentDidUpdate(prev) {
    if (prev.tab !== this.props.tab && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-200">This section couldn't be displayed.</p>
          <p className="text-xs text-gray-400 mt-1">
            The case data is safe — only this view failed. Other tabs still work. If it keeps happening, a record in this case may be malformed.
          </p>
          <p className="text-[11px] text-gray-600 font-mono mt-2 break-all">{String(this.state.error?.message || this.state.error).slice(0, 200)}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-300 border border-cyan-500/30 rounded-md px-2.5 py-1 hover:bg-cyan-500/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />Try again
          </button>
        </div>
      </div>
    );
  }
}
