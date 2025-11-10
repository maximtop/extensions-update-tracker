#!/usr/bin/env node

/**
 * Chrome Web Store Description Converter
 *
 * Converts markdown descriptions to plain text format suitable for Chrome Web Store.
 * Chrome Web Store does NOT support markdown, only plain text with line breaks.
 *
 * Usage: node scripts/convert-store-descriptions.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_FILE = path.join(__dirname, '../CHROME_STORE_DESCRIPTION.md');
const OUTPUT_DIR = path.join(__dirname, '../dist/store-descriptions');

function convertMarkdownToPlainText(markdown) {
    let text = markdown;

    // Remove markdown headings (#### text -> text)
    text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');

    // Remove bold/italic (** or __)
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/_(.+?)_/g, '$1');

    // Convert markdown lists to bullet points
    text = text.replace(/^[-*]\s+/gm, '• ');

    // Convert numbered lists
    text = text.replace(/^\d+\.\s+/gm, '• ');

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`(.+?)`/g, '$1');

    // Remove horizontal rules
    text = text.replace(/^---+$/gm, '');

    // Clean up excessive blank lines (more than 2 consecutive)
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim
    text = text.trim();

    return text;
}

function extractLanguageSections(content) {
    const sections = {};
    const languageRegex = /## (.+?)\s+\(([a-z_]+)\)/gi;

    const matches = [...content.matchAll(languageRegex)];

    for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];
        const langName = match[1];
        const langCode = match[2];
        const startIndex = match.index + match[0].length;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;

        const sectionContent = content.substring(startIndex, endIndex);
        sections[langCode] = {
            name: langName,
            content: sectionContent.trim(),
        };
    }

    return sections;
}

function convertDescriptions() {
    console.log('\n📝 Converting Chrome Web Store Descriptions...\n');

    // Read source file
    if (!fs.existsSync(SOURCE_FILE)) {
        console.error(`❌ Source file not found: ${SOURCE_FILE}`);
        process.exit(1);
    }

    const content = fs.readFileSync(SOURCE_FILE, 'utf-8');

    // Extract language sections
    const sections = extractLanguageSections(content);

    if (Object.keys(sections).length === 0) {
        console.error('❌ No language sections found in source file');
        process.exit(1);
    }

    console.log(`✓ Found ${Object.keys(sections).length} language sections\n`);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Convert and save each language
    const results = [];

    for (const [langCode, section] of Object.entries(sections)) {
        const plainText = convertMarkdownToPlainText(section.content);
        const outputFile = path.join(OUTPUT_DIR, `${langCode}.txt`);

        fs.writeFileSync(outputFile, plainText, 'utf-8');

        const charCount = plainText.length;
        const lineCount = plainText.split('\n').length;

        results.push({
            code: langCode,
            name: section.name,
            file: path.relative(path.join(__dirname, '..'), outputFile),
            chars: charCount,
            lines: lineCount,
        });
    }

    // Print results
    console.log('═══════════════════════════════════════════════════');
    console.log('Converted Descriptions:');
    console.log('═══════════════════════════════════════════════════\n');

    for (const result of results) {
        const line = `✅ ${result.code.padEnd(8)} ${result.name.padEnd(25)} `
            + `${result.chars.toString().padStart(5)} chars`;
        console.log(line);
        console.log(`   → ${result.file}`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ All descriptions converted successfully!');
    console.log(`   Output directory: ${path.relative(path.join(__dirname, '..'), OUTPUT_DIR)}\n`);

    // Check for length warnings (Chrome Web Store has a ~5000 character soft limit)
    const warnings = results.filter((r) => r.chars > 5000);
    if (warnings.length > 0) {
        console.log('⚠️  Warning: Some descriptions exceed 5000 characters:');
        warnings.forEach((w) => {
            console.log(`   ${w.code}: ${w.chars} characters`);
        });
        console.log('   Consider shortening them for better readability.\n');
    }
}

// Run conversion
try {
    convertDescriptions();
} catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
}
