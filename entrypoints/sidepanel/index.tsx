import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/src/app";
import "./index.css";

const rootElement = document.createElement("div");
rootElement.id = "root";

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

document.body.appendChild(rootElement);
