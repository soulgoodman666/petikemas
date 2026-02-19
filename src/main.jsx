import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import "./index.css";

// 🔥 DEBUG ERROR DI PRODUCTION (WAJIB DI ATAS)
window.addEventListener("error", (e) => {
  document.body.innerHTML += `<pre style="color:red">${e.message}</pre>`;
});

window.addEventListener("unhandledrejection", (e) => {
  document.body.innerHTML += `<pre style="color:red">${e.reason}</pre>`;
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true }}
    >
      <AuthProvider>
        <DarkModeProvider>
          <AppRoutes />
        </DarkModeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
