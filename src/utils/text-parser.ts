import { LAB_MAPPINGS } from './pdf-parser';
import type { ParsedLabValue } from './pdf-parser';
import { bloodValues } from '../data';

/**
 * Parse free-form text (copy-paste from lab reports, emails, etc.) into blood values.
 *
 * Supports various formats:
 * - "LDL-Cholesterin: 149 mg/dl"
 * - "LDL 149"
 * - "Gamma-GT    10   U/l    <60"
 * - Tab-separated table rows
 * - Lines with numbers mixed with text
 */
export function parseText(text: string): {
  values: ParsedLabValue[];
  date: string | null;
  warnings: string[];
} {
  const values: ParsedLabValue[] = [];
  const matched = new Set<string>();
  const warnings: string[] = [];
  let date: string | null = null;

  // Normalize text
  const normalized = text
    .replace(/\u00B5/g, '\u03BC')
    .replace(/\t/g, '  ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalized.split('\n');

  // Try to extract date
  for (const line of lines) {
    // ISO format: 2025-04-03
    const isoMatch = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      date = isoMatch[0];
      break;
    }
    // German format: 03.04.2025
    const deMatch = line.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (deMatch) {
      date = `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
      break;
    }
  }

  // Process each line
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 3) continue;

    // Try each mapping
    for (const mapping of LAB_MAPPINGS) {
      if (matched.has(mapping.id)) continue;

      const nameMatch = mapping.pattern.exec(line);
      if (!nameMatch) continue;

      // Find a number after the matched name
      const afterName = line.slice(nameMatch.index + nameMatch[0].length);

      // Match numbers: handle comma as decimal (German), < or > prefixes
      const numMatch = afterName.match(/[<>]?\s*(\d+[.,]\d+|\d+)/);
      if (!numMatch) continue;

      const numStr = numMatch[1].replace(',', '.');
      const num = parseFloat(numStr);
      if (isNaN(num)) continue;

      // Try to find unit after the number
      const afterNum = afterName.slice((numMatch.index ?? 0) + numMatch[0].length).trim();
      const unitMatch = afterNum.match(/^([a-zA-Zµμ%°/²³]+(?:\/[a-zA-Zµμ%°²³]+)*)/);
      const detectedUnit = unitMatch ? unitMatch[1] : '';

      // Apply conversion if needed
      let finalValue = num;
      if (mapping.convert && detectedUnit) {
        finalValue = mapping.convert(num, detectedUnit);
      }

      // Round to reasonable precision
      finalValue = Math.round(finalValue * 100) / 100;

      const bv = bloodValues.find((b) => b.id === mapping.id);
      const converted = finalValue !== num;

      values.push({
        id: mapping.id,
        name: bv?.name ?? mapping.id,
        value: finalValue,
        unit: bv?.unit ?? mapping.dbUnit,
        originalValue: num,
        originalUnit: detectedUnit || mapping.dbUnit,
        converted,
        note: numMatch[0].startsWith('<') ? 'unter Nachweisgrenze' : undefined,
      });

      matched.add(mapping.id);
      break;
    }
  }

  // Also try direct ID/name matching for lines not caught by LAB_MAPPINGS
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    for (const bv of bloodValues) {
      if (matched.has(bv.id)) continue;

      const nameLower = bv.name.toLowerCase();
      const idLower = bv.id.toLowerCase();
      const lineLower = line.toLowerCase();

      // Check if line starts with the value name or ID
      if (!lineLower.startsWith(nameLower) && !lineLower.startsWith(idLower)) continue;

      // Find number after the name
      const startIdx = lineLower.startsWith(nameLower) ? nameLower.length : idLower.length;
      const rest = line.slice(startIdx);
      const numMatch = rest.match(/[<>]?\s*(\d+[.,]\d+|\d+)/);
      if (!numMatch) continue;

      const num = parseFloat(numMatch[1].replace(',', '.'));
      if (isNaN(num)) continue;

      values.push({
        id: bv.id,
        name: bv.name,
        value: num,
        unit: bv.unit,
        originalValue: num,
        originalUnit: bv.unit,
        converted: false,
      });

      matched.add(bv.id);
      break;
    }
  }

  if (values.length === 0) {
    warnings.push('Keine Blutwerte im Text erkannt. Tipp: Jeder Wert auf eine eigene Zeile, z.B. "LDL 149" oder "Gamma-GT: 10 U/l".');
  }

  return { values, date, warnings };
}
