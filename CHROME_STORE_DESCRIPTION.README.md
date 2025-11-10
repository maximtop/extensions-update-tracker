# Chrome Web Store Descriptions

This directory contains the extension descriptions for the Chrome Web Store in multiple languages.

## Files

- **`CHROME_STORE_DESCRIPTION.md`** - Source file with markdown formatting (for documentation)
- **`dist/store-descriptions/*.txt`** - Generated plain text files (for Chrome Web Store submission)

## Important Note

⚠️ **Chrome Web Store does NOT support Markdown!**

The Chrome Web Store only accepts **plain text** with line breaks. Features like bold text, headings, and markdown lists are not supported.

## Workflow

### 1. Edit the Source File

Edit `CHROME_STORE_DESCRIPTION.md` with markdown formatting for better readability:

```markdown
## English (en)

**Never miss an extension update again!** Extensions Update Tracker...

#### 🎯 Why You Need This Extension

Browser extensions update automatically...
```

### 2. Convert to Plain Text

Run the conversion script to generate plain text versions:

```bash
pnpm convert-store-descriptions
```

This will:
- Read `CHROME_STORE_DESCRIPTION.md`
- Convert markdown to plain text
- Output to `dist/store-descriptions/*.txt`

### 3. Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select your extension
3. Go to "Store listing" tab
4. For each language:
   - Select the language
   - Copy content from `dist/store-descriptions/{lang_code}.txt`
   - Paste into the "Description" field
   - Save

## Conversion Details

### What Gets Converted

✅ **Preserved:**
- Plain text content
- Line breaks and paragraphs
- Emojis (🎯, ✨, 📬, etc.)

🔄 **Converted:**
- `#### Heading` → `Heading` (plain text)
- `**bold text**` → `bold text` (removes asterisks)
- `- list item` → `• list item` (bullet points)
- `1. item` → `• item` (bullet points)

❌ **Removed:**
- Code blocks (` ``` `)
- Horizontal rules (`---`)
- Inline code (`` `text` ``)

### Example Output

**Input (Markdown):**
```markdown
#### 🎯 Why You Need This Extension

Browser extensions update **automatically** in the background.

**📬 Smart Update Notifications**
- See old and new version numbers
- Quick action buttons
```

**Output (Plain Text):**
```
🎯 Why You Need This Extension

Browser extensions update automatically in the background.

📬 Smart Update Notifications
• See old and new version numbers
• Quick action buttons
```

## Supported Languages

- `en` - English
- `de` - German (Deutsch)
- `es` - Spanish (Español)
- `fr` - French (Français)
- `it` - Italian (Italiano)
- `ja` - Japanese (日本語)
- `ko` - Korean (한국어)
- `pt_BR` - Portuguese Brazilian (Português do Brasil)
- `ru` - Russian (Русский)
- `zh_CN` - Chinese Simplified (简体中文)

## Character Limits

Chrome Web Store has soft limits for description length:
- **Recommended:** Under 5,000 characters for better readability
- **Current status:** All descriptions are within recommended limits

The conversion script will warn you if any description exceeds 5,000 characters.

## Scripts

### Convert Descriptions

```bash
pnpm convert-store-descriptions
```

Converts all markdown descriptions to plain text format.

### Output Location

Generated files are placed in: `dist/store-descriptions/`

Example:
```
dist/store-descriptions/
├── en.txt
├── de.txt
├── es.txt
├── fr.txt
├── it.txt
├── ja.txt
├── ko.txt
├── pt_BR.txt
├── ru.txt
└── zh_CN.txt
```

## Adding New Languages

1. Add a new language section to `CHROME_STORE_DESCRIPTION.md`:
   ```markdown
   ## NewLanguage (xx)

   Your description here...
   ```

2. Run the conversion:
   ```bash
   pnpm convert-store-descriptions
   ```

3. The new language will automatically be converted to `dist/store-descriptions/xx.txt`

## Tips for Writing Store Descriptions

✅ **Do:**
- Use emojis for visual hierarchy (they work!)
- Keep paragraphs short and scannable
- Use bullet points (they become `•` in plain text)
- Focus on benefits and features
- Include keywords naturally

❌ **Don't:**
- Rely on markdown formatting (it won't show up)
- Make it too long (under 5,000 characters recommended)
- Forget to convert before submitting
- Use HTML or other markup (not supported)

## Maintaining Translations

When updating descriptions:

1. Update the English version in `CHROME_STORE_DESCRIPTION.md`
2. Update all other language versions
3. Run `pnpm convert-store-descriptions`
4. Review the generated plain text files
5. Submit to Chrome Web Store

## Automation

The conversion script can be integrated into your release workflow:

```json
{
  "scripts": {
    "prerelease": "pnpm validate-translations && pnpm convert-store-descriptions"
  }
}
```

This ensures plain text descriptions are always up-to-date before each release.

