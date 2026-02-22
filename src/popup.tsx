import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const Popup = () => {
  return (
    <div style={{ padding: 16 }}>
      <h2>bookmarkit</h2>
      <p>Welcome to your Chrome extension popup!</p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<Popup />);
