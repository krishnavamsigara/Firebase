# Realtime Code Editor (React + Firebase)

A realtime collaborative code editor built with React and Firebase that synchronizes JavaScript, HTML, and CSS code live between users.  
The console output and `console.log` messages are displayed inside a sandboxed iframe for security.

---

## Features

- Real-time collaborative editing using Firebase Realtime Database or Firestore
- Console output shown securely inside an iframe using `srcDoc`
- Support for running JavaScript, HTML, and CSS code
- Room-based sessions for multiple users
- Ability to embed images in the editor output (via HTML `<img>` tag or Firebase Storage uploads)

---

## How It Works

- Code changes sync live with Firebase in real-time between all users in the same room.
- On clicking "Run", the combined code is injected into a sandboxed iframe using `srcDoc`.
- `console.log` and errors inside the iframe are captured and displayed in the iframe console output area.
- Images can be added by inserting `<img>` tags with URLs or uploading images to Firebase Storage and embedding their URLs.

---

## Adding Images to This README

You can add images to your README file using Markdown syntax.

### Syntax

```md

https://ibb.co/B2p0DR9S
![Home Page](https://ibb.co/B2p0DR9S)
![Real Time Code Change](https://ibb.co/zTzfPxGx)


