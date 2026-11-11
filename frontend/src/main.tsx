
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class Boundary extends React.Component<
  { children: React.ReactNode },
  { err: string }
> {
  state = { err: "" };

  static getDerivedStateFromError(e: any) {
    return {
      err: String((e && e.stack) || (e && e.message) || e),
    };
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            padding: 16,
            color: "#fff",
            background: "#060b1c",
            minHeight: "100vh",
            fontFamily: "sans-serif",
          }}
        >
          <h3>Xatolik</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {this.state.err}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>
);
