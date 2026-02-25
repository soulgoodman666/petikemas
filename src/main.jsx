import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import "./index.css";

window.addEventListener("error", (e) => {
  document.body.innerHTML += `<pre style="color:red">${e.message}</pre>`;
});

window.addEventListener("unhandledrejection", (e) => {
  document.body.innerHTML += `<pre style="color:red">${e.reason}</pre>`;
});

console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <DarkModeProvider>
          <AppRoutes />
        </DarkModeProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);