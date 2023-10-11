/* eslint-disable no-var, @typescript-eslint/ban-ts-comment */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  type SettingProp = {
    name: string;
    type: string;
    description: string;
    value: string | number | boolean;
  };
  type Data = {
    settings: SettingProp[];
    updatedSettings: UpdatedSetting[];
  };
  type UpdatedSetting = {
    name: string;
    value: string;
  };
  type GetData = (callback: (data: Data) => void) => void;

  var getData: GetData;
}

// @ts-ignore Define `getData` in case we are running this outwith the relay browser
if (typeof getData === "undefined") {
  var getData: GetData = (cb) => cb({ settings: [], updatedSettings: [] });
}

getData((data: Data) => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App {...data} />
    </React.StrictMode>,
  );
});
