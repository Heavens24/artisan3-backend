import { useState } from "react";

export default function Tools() {
  const [tools, setTools] = useState([]);
  const [name, setName] = useState("");

  const addTool = () => {
    if (!name) return;
    setTools([...tools, { name }]);
    setName("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>🧰 Tool Tracker</h2>

      <input
        placeholder="Tool name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={addTool}>Add Tool</button>

      {tools.map((t, i) => (
        <div key={i}>
          <p>{t.name}</p>
        </div>
      ))}
    </div>
  );
}