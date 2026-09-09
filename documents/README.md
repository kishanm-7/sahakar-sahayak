# /documents

Drop your source material in this folder, then run `npm run ingest`.

**Supported:** `.pdf`, `.txt`, `.md`, `.csv`, `.json`
(Subfolders work too — the ingest script walks the whole tree.)

## Naming files well

The ingest script guesses a `category` tag from the filename, and retrieval can
filter on it. Keywords it looks for:

| Category    | Filename keywords |
|-------------|-------------------|
| `pmfby`     | pmfby, fasal, crop, insurance, bima, kisan |
| `grievance` | grievance, complaint, redress, shikayat, ombudsman |
| `finance`   | financial, finance, literacy, credit, loan, saving, banking |
| `law`       | act, law, bylaw, rule, legal, amendment, section |
| `scheme`    | scheme, yojana, ministry, pacs, nabard, programme, policy |

So `pmfby-operational-guidelines-2024.pdf` tags itself correctly.
Anything unmatched falls back to `scheme`.

To override a guess, add an entry to `config/categories.json`:

```json
{ "some-oddly-named-file.pdf": "law" }
```

## Scanned PDFs will not work

The ingest script extracts a PDF's **text layer**. A PDF that is just photos of
pages has no text layer, so it will be skipped with a warning. Run it through an
OCR tool first if you need it.

## What to collect for the demo

- The Multi-State Co-operative Societies Act and any relevant state act
- Model by-laws for PACS
- Ministry of Cooperation scheme documents (from cooperation.gov.in)
- PMFBY operational guidelines (from pmfby.gov.in)
- RBI / NABARD financial literacy booklets
- Your state's cooperative grievance redressal procedure

The three `sample-*.txt` files here are placeholders so you can test the
pipeline before you have the real PDFs. **Delete them before the demo** — you do
not want the bot quoting placeholder text at a judge.
