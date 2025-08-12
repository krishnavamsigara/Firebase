import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { v4 as uuidv4 } from "uuid";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // your firebase config
import { useParams, useNavigate } from "react-router-dom";

const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export default function EditorPage() {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState(paramRoomId || "");
  const [value, setValue] = useState("// Loading...");
  const [output, setOutput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const iframeRef = useRef(null);
  const localUserId = useRef(uuidv4());
  const suppressLocalUpdate = useRef(false);
  const presenceDocRef = useRef(null);

  // Redirect to new room if no roomId
  useEffect(() => {
    if (!paramRoomId) {
      const newRoomId = uuidv4();
      setRoomId(newRoomId);
      navigate(`/room/${newRoomId}`, { replace: true });
    } else {
      setRoomId(paramRoomId);
    }
  }, [paramRoomId, navigate]);

  // Setup Firestore realtime sync and presence tracking
  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, "rooms", roomId);

    // Setup room document if doesn't exist
    const setupRoom = async () => {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        await setDoc(roomRef, {
          content: "// New collaborative file\n",
          createdAt: serverTimestamp(),
        });
      }
    };

    setupRoom();

    // Subscribe to room content changes
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      // Avoid overwrite when local user just wrote content
      if (suppressLocalUpdate.current) {
        suppressLocalUpdate.current = false;
        return;
      }
      setValue(data.content || "");
    });

    // Track presence users in subcollection
    const presenceRef = collection(roomRef, "presence");

    // Add self to presence
    const addPresence = async () => {
      const presDoc = await addDoc(presenceRef, {
        userId: localUserId.current,
        joinedAt: serverTimestamp(),
      });
      presenceDocRef.current = presDoc;
    };

    addPresence();

    // Listen for presence updates
    const unsubPresence = onSnapshot(presenceRef, (snapshot) => {
      const users = [];
      snapshot.forEach((doc) => users.push(doc.data().userId));
      setOnlineUsers(users);
    });

    // Remove presence on unload
    const cleanupPresence = () => {
      if (presenceDocRef.current) {
        deleteDoc(presenceDocRef.current);
      }
    };
    window.addEventListener("beforeunload", cleanupPresence);

    return () => {
      unsubRoom();
      unsubPresence();
      cleanupPresence();
      window.removeEventListener("beforeunload", cleanupPresence);
    };
  }, [roomId]);

  // Write to Firestore with debounce
  const writeContent = useCallback(
    debounce(async (content) => {
      try {
        const roomRef = doc(db, "rooms", roomId);
        await setDoc(roomRef, { content, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error("Error writing to Firestore:", err);
      }
    }, 300),
    [roomId]
  );

  // Handle editor change
  const handleChange = (val) => {
    setValue(val);
    suppressLocalUpdate.current = true;
    writeContent(val);
  };

  // Run code inside sandboxed iframe
  const runCode = () => {
    setOutput("// Running...\n");
    iframeRef.current.contentWindow.postMessage(
      { type: "runCode", code: value },
      "*"
    );
  };
  const url = "https://firebase-six-xi.vercel.app/"

  // Copy share link
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    alert("Link copied!");
  };

  // Listen to messages from iframe for logs/errors
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current.contentWindow) return;
      const { type, message } = event.data;
      if (type === "log") {
        setOutput((prev) => prev + message + "\n");
      } else if (type === "error") {
        setOutput((prev) => prev + "❌ " + message + "\n");
      } else if (type === "clear") {
        setOutput("");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html lang="en">
    <body>
      <script>
        console.log = (...args) => {
          const formatted = args
            .map(arg => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(" ");
          parent.postMessage({ type: "log", message: formatted }, "*");
        };
        console.error = (...args) => {
          const formatted = args
            .map(arg => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(" ");
          parent.postMessage({ type: "error", message: formatted }, "*");
        };
        window.addEventListener("message", async (event) => {
          if (event.data.type === "runCode") {
            parent.postMessage({ type: "clear" }, "*");
            try {
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              const fn = new AsyncFunction(event.data.code);
              await fn();
            } catch (err) {
              parent.postMessage({ type: "error", message: err.message }, "*");
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-lg">
            <span className="font-bold">Room ID:</span>{" "}
            <span className="font-mono">{roomId}</span>
          </p>
          <p className="flex items-center gap-2 mt-1">
            <span className="font-bold">Share Link:</span>
            <code className="font-mono text-blue-400 truncate max-w-xs">
              {url}/room/{roomId}
            </code>
            <button
              onClick={copyLink}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Copy
            </button>
          </p>
        </div>
        <div className="text-gray-300 text-lg">
          👥 Online Users: {onlineUsers.length}
        </div>
      </header>

      <main className="flex flex-col flex-grow min-h-0">
        <div className="flex-grow min-h-0">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={value}
            theme="vs-dark"
            onChange={handleChange}
            options={{
              minimap: { enabled: false },
              fontSize: 16,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div className="p-3 border-t border-gray-700 flex justify-end gap-2 bg-gray-800">
          <button
            onClick={runCode}
            className="bg-green-600 hover:bg-green-500 px-5 py-2 rounded text-lg font-semibold"
          >
            ▶ Run Code
          </button>
        </div>

        <pre className="bg-black p-4 h-48 overflow-auto font-mono text-sm whitespace-pre-wrap border-t border-gray-700">
          {output || "// Output will appear here"}
        </pre>
      </main>

      <iframe
        title="code-runner"
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        style={{ display: "none" }}
        sandbox="allow-scripts"
      />
    </div>
  );
}
