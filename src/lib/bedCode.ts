/**
 * Under the letter-first numbering convention (A1, B1, ...), a bed's number resets per
 * bedroom — A1 and B1 are different beds that would otherwise both display as "-1". Prefix
 * the bedroom's letter (derived from its "Bedroom X" name) when we have one, so bed codes
 * stay unique and readable regardless of which numbering convention a property uses.
 */
export function bedroomLetterFromName(bedroomName: string | null | undefined): string | null {
  if (!bedroomName) return null;
  const m = bedroomName.match(/^Bedroom\s+(.+)$/i);
  return m ? m[1] : bedroomName;
}

export function bedCode(bed: { propertyCode?: string | null; bedroomName?: string | null; bedNumber: number } | null | undefined): string {
  if (!bed) return '';
  const letter = bedroomLetterFromName(bed.bedroomName);
  return `${bed.propertyCode ?? '?'}-${letter ?? ''}${bed.bedNumber}`;
}
