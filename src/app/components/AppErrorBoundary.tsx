import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportRuntimeError } from "../observability/runtimeErrors";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportRuntimeError(error, {
      area: "React",
      operation: "render",
      fatal: true,
      metadata: { componentStack: info.componentStack },
    });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#176ff3",
          color: "#30274f",
          fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
        }}
      >
        <section
          style={{
            width: "min(480px, 100%)",
            padding: 28,
            borderRadius: 20,
            background: "#fff",
            boxShadow: "0 18px 50px rgba(24, 31, 74, 0.28)",
            textAlign: "center",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Game gặp lỗi hiển thị</h1>
          <p>Đã giữ lại dữ liệu lưu. Hãy tải lại trang để khởi tạo lại PixiJS.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 48,
              padding: "10px 18px",
              border: 0,
              borderRadius: 12,
              background: "#ff681c",
              color: "#fff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Tải lại game
          </button>
        </section>
      </main>
    );
  }
}
