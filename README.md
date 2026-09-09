# SahAI Sathi — Multilingual Cooperative Governance & Legal Assistance Chatbot

Smart India Hackathon · Problem Statement **26088** · Ministry of Cooperation / NCCT

A multilingual assistant that answers questions about cooperative law, Ministry of
Cooperation schemes, PACS services, PMFBY crop insurance and financial literacy —
and lets people file and track a grievance. It runs in any browser, on a phone or
a laptop.

Answers are grounded in documents you supply (RAG), so the bot quotes your PDFs
rather than inventing rules. When it cannot find an answer it says so and points
the user to their nearest PACS office.

---

## 1. Setup

```bash
npm install
```

Then create your environment file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your OpenAI key after `OPENAI_API_KEY=`.
That file is git-ignored, so the key never gets committed.

## 2. Add your documents

Drop PDFs and text files into `documents/`:

```
documents/
  mscs-act.pdf
  pmfby-operational-guidelines.pdf
  pacs-model-bylaws.pdf
  financial-literacy-booklet.pdf
```

Name them descriptively — the ingest script tags each file with a category
(`law` / `scheme` / `pmfby` / `finance` / `grievance`) guessed from the filename.
To override a guess, add it to `config/categories.json`. Full details in
[`documents/README.md`](documents/README.md).

Three `sample-*.txt` files are already there so you can test the pipeline before
your real PDFs are ready. **Delete them before the demo** — you do not want the
bot quoting placeholder text at a judge.

## 3. Build the knowledge base

```bash
npm run ingest
```

This reads every file in `documents/`, extracts the text, splits it into
overlapping ~650-token chunks, embeds each chunk via the OpenAI embeddings API,
and writes everything to `data/vectors.json`.

Re-run it any time you add or change a document. It rebuilds from scratch each
time, which takes a few seconds and costs a fraction of a cent.

You can test retrieval straight from the terminal, before touching the UI:

```bash
node scripts/ask.js "What is a PACS and what services does it provide?"
node scripts/ask.js "PMFBY ke liye kaise apply karein?"
```

## 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>.

- **/** — chat, with a language dropdown and a hold-to-talk mic button
- **/grievance** — file a grievance, get a reference number
- **/track** — look up a grievance by reference number

`npm run dev` binds to `0.0.0.0`, not just localhost, so your phone can reach it
over wifi. Find your laptop's IP with `ipconfig` (look for IPv4
Address on your wifi adapter) and open `http://192.168.x.x:3000` on your phone.

> If Windows Firewall prompts on first run, allow Node.js on **private
> networks** — otherwise nothing on your wifi can reach the server.

---

## Testing `/api/voice` from the command line

The voice endpoint takes **raw 16-bit PCM, mono, 16000 Hz** in the request body
and returns **raw PCM in the same format**. No WAV header either direction, no
multipart, no JSON. You can drive it from a laptop with `ffmpeg` and `curl`.

### Step 1 — make a test PCM file

If you have a voice recording (a phone voice memo works fine):

```bash
ffmpeg -i question.m4a -f s16le -acodec pcm_s16le -ar 16000 -ac 1 question.pcm
```

No recording handy? Generate one with Windows' built-in speech synthesiser in
PowerShell:

```powershell
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile("$PWD\question.wav")
$s.Speak("What is a PACS and what services does it provide")
$s.Dispose()
```

Then convert that WAV to raw PCM:

```bash
ffmpeg -i question.wav -f s16le -acodec pcm_s16le -ar 16000 -ac 1 question.pcm
```

The flags matter: `s16le` = 16-bit signed little-endian, `-ar 16000` = sample
rate, `-ac 1` = mono. Get any of them wrong and Whisper hears static.

### Step 2 — send it

```bash
curl -X POST http://localhost:3000/api/voice --data-binary @question.pcm -H "Content-Type: application/octet-stream" -D headers.txt --output reply.pcm
```

### Step 3 — listen to the reply

`reply.pcm` is raw samples, so no media player will open it directly. Wrap it
back into a WAV:

```bash
ffmpeg -f s16le -ar 16000 -ac 1 -i reply.pcm reply.wav
```

### Step 4 — see what it heard and said

`headers.txt` carries `X-Transcript` and `X-Answer`, base64-encoded because HTTP
headers cannot hold Devanagari or Tamil. Decode either one:

```bash
grep -i "^x-answer:" headers.txt | cut -d' ' -f2 | tr -d '\r' | base64 -d
```

They exist for debugging and for the browser mic button.

### Or just use the browser

The 🎤 button on the chat page records from your laptop mic, converts to the
exact same 16 kHz PCM format, and posts to the same endpoint. It is the fastest
way to test the whole voice pipeline end to end.

> Browser mics only work over HTTPS or on `localhost`. Testing from your phone
> at `http://192.168.x.x:3000`, the mic button will be blocked by the browser —
> that is a browser security rule, not a bug in the app. Text chat works fine
> there.

---

## API reference

### `POST /api/ask`
```json
{ "text": "What is a PACS?", "language": "auto", "history": [] }
```
→ `{ "answer": "...", "language": "en", "sources": ["file.pdf"], "usedContext": true }`

`language` is `auto` or a code from `lib/languages.js`. `history` is the recent
`[{role, content}]` turns, so follow-up questions work.

### `POST /api/voice`

| Direction | Format |
|---|---|
| Request body | raw PCM, 16-bit signed, little-endian, mono, 16000 Hz |
| Response body | raw PCM, 16-bit signed, little-endian, mono, 16000 Hz |
| Response `Content-Type` | `application/octet-stream` |

No WAV header either direction, no multipart, no JSON. `X-Transcript` and
`X-Answer` come back base64-encoded.

Requests under 0.1s of audio get `400`, over ~30s get `413`. If Whisper hears
nothing at all you get a `204` with an empty body — treat that as "ask the user
to repeat". A round trip is roughly 3–6 seconds (Whisper + chat + TTS), so allow
a generous client timeout. `GET /api/voice` returns a short string, handy as an
"is the server up?" check.

### `POST /api/grievance`
```json
{ "name": "...", "phone": "...", "category": "pmfby", "description": "..." }
```
→ `{ "referenceId": "GRV-MTTNNFJZM6Q6", "status": "submitted" }`

`category` must be one of `scheme`, `pmfby`, `financial`, `legal`, `other`.

### `GET /api/grievance?ref=GRV-XXXXXXXX`
→ the record plus its status history. The phone number is deliberately left out
of this response, since anyone who guesses a reference ID could otherwise read a
citizen's contact details.

To move a grievance along for a demo (a real deployment would have a staff
dashboard):

```bash
node scripts/set-status.js
node scripts/set-status.js GRV-XXXXXXXX in_review "Assigned to district officer"
```

---

## Project structure

```
app/
  page.js                  chat UI
  grievance/page.js        grievance form
  track/page.js            grievance tracker
  api/ask/route.js         text Q&A
  api/voice/route.js       voice endpoint (PCM in, PCM out)
  api/grievance/route.js   file (POST) + track (GET)
components/
  VoiceButton.js           browser mic → /api/voice
lib/
  rag.js                   answerFromRAG() — the brain
  vectorStore.js           JSON vector store + retrieveRelevantChunks()
  chunk.js                 text cleanup and chunking
  audio.js                 pcmToWav, stripWavHeader, resamplePcm16
  languages.js             language list + script-based detection
  openai.js                shared client and model names
  grievances.js            grievance storage
scripts/
  ingest.js                npm run ingest
  ask.js                   CLI test for the RAG pipeline
  set-status.js            demo status updater
documents/                 your PDFs and text files go here
data/                      generated: vectors.json, grievances.json
config/categories.json     optional manual category tagging
```

## How the RAG part works

1. `npm run ingest` splits each document into overlapping chunks and turns each
   chunk into an embedding — a list of 1536 numbers describing its meaning.
2. When a question arrives, it gets embedded the same way.
3. Cosine similarity scores every stored chunk against the question, and the top
   5 are pulled out.
4. Those chunks go into the prompt as CONTEXT, with instructions to answer only
   from them, in the user's language, in plain words — and to admit ignorance
   and point to the nearest PACS office rather than guess.

Step 4 is what keeps it honest. A plain chatbot asked about a cooperative act
will confidently invent a section number, and a farmer acting on an invented
rule is worse off than one who got no answer at all.

## Multilingual handling

`lib/languages.js` detects the script the user wrote in (Devanagari, Bengali,
Tamil, …) and passes that as a hint to the model, which replies in the same
language. For voice, Whisper transcribes in the spoken language and the same
path runs from there.

The known limitation, worth saying out loud if a judge asks: Hindi and Marathi
share the Devanagari script, so script detection alone cannot separate them. The
model resolves it from the actual wording, and the dropdown lets a user force a
language either way.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `OPENAI_API_KEY is missing` | No `.env.local`, or you did not restart `npm run dev` after creating it |
| `The vector store is empty` | Run `npm run ingest` |
| A PDF is skipped as "almost no text" | It is scanned images with no text layer — OCR it first |
| Bot says it does not know everything | Your documents do not cover the question. Add more to `documents/` and re-ingest |
| Mic button blocked on phone | Browsers require HTTPS or localhost for microphone access |
| Phone cannot reach the server | Windows Firewall — allow Node.js on private networks |
| Voice reply sounds slow and deep | Sample-rate mismatch: the device must play at 16000 Hz |

## Honest limitations

- The vector store is a JSON file scanned linearly. Fine to a few thousand
  chunks; past roughly 50k you would swap `lib/vectorStore.js` for a real vector
  database. Nothing else would need to change.
- Grievances are stored in a JSON file with no authentication. Anyone who can
  reach the server can file one, and anyone with a reference ID can read that
  record. Good enough for a demo, not for production.
- `/api/voice` is unauthenticated and wide open. Fine on a demo LAN, not fine on
  the public internet — put a shared secret on it before deploying anywhere.
- Answer quality is entirely a function of the documents you ingest. The system
  prompt stops it inventing facts, but it cannot invent coverage.
