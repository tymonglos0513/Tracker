import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppliedList from "./pages/AppliedList.jsx";
import SchedulesList from "./pages/SchedulesList.jsx";
import SchedulesPublic from "./pages/SchedulesPublic.jsx"; // 👈 import the new read-only page
import AppLayout from "./AppLayout.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <AppliedList /> },
      { path: "/schedules", element: <SchedulesList /> },
      { path: "/schedules/:assignee", element: <SchedulesPublic /> }, // 👈 added route
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
