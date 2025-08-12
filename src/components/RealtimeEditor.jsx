import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Debounce to limit writes
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export default function RealtimeEditor({ roomId }) {
  const [value, setValue] = useState("// Write JavaScript here");
  const [output, setOutput] = useState("");
  const suppressLocal = useRef(false);

  const writeContent = useCallback(
    debounce(async (content) => {
      await setDoc(
        doc(db, "rooms", roomId),
        { content, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }, 400),
    [roomId]
  );

  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);

    const init = async () => {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        await setDoc(roomRef, { content: "// New file", createdAt: serverTimestamp() });
      }
    };
    init();

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (data && !suppressLocal.current) {
        setValue(data.content || "");
      }
      suppressLocal.current = false;
    });

    return () => unsub();
  }, [roomId]);

  const handleChange = (val) => {
    setValue(val);
    suppressLocal.current = true;
    writeContent(val);
  };

  const runCode = async () => {
    try {
      const asyncWrapper = new Function(
        `"use strict"; return (async () => { ${value} })();`
      );
      const result = await asyncWrapper();
      setOutput(String(result ?? "undefined"));
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <Editor
        height="60vh"
        defaultLanguage="javascript"
        value={value}
        onChange={handleChange}
        options={{ minimap: { enabled: false }, fontSize: 14 }}
      />
      <div style={{ marginTop: "10px" }}>
        <button onClick={runCode}>Run Code</button>
      </div>
      <div
        style={{
          marginTop: "10px",
          background: "#111",
          color: "#0f0",
          padding: "10px",
          minHeight: "100px",
        }}
      >
        <strong>Console Output:</strong>
        <pre>{output}</pre>
      </div>
    </div>
  );
}
