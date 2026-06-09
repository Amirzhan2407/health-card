import React from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function Search() {
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12,
        }}
      >
        <LanguageSwitcher />
      </div>

      <h2>Поиск</h2>
      <p>Поиск по документам / симптомам / рецептам.</p>
    </div>
  );
}