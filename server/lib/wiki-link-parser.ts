/**
 * Wiki-Link Parser for Knowledge Graph
 * 
 * Parses [[Wiki Link]] syntax and creates bidirectional backlinks
 * Ported from ECHOMEN with enhancements
 */

export interface WikiLink {
  text: string;
  title: string;
  position: { start: number; end: number };
}

export interface ParseResult {
  links: WikiLink[];
  cleanedContent: string;
}

/**
 * Parse wiki-style links from content
 * Supports: [[Link Title]], [[Link Title|Display Text]]
 */
export function parseWikiLinks(content: string): ParseResult {
  const links: WikiLink[] = [];
  
  // Match [[Link Title]] or [[Link Title|Display Text]]
  const wikiLinkRegex = /\[\[([^\]]+)(?:\|([^\]]+))?\]\]/g;
  
  let match;
  let cleanedContent = content;
  
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const title = match[1].trim();
    const displayText = match[2]?.trim() || title;
    
    links.push({
      text: displayText,
      title,
      position: {
        start: match.index,
        end: match.index + fullMatch.length,
      },
    });
  }
  
  // Replace wiki links with markdown-style links for display
  cleanedContent = content.replace(wikiLinkRegex, (match, title, displayText) => {
    const text = displayText?.trim() || title.trim();
    return `[${text}](/knowledge/${encodeURIComponent(title)})`;
  });
  
  return { links, cleanedContent };
}

/**
 * Extract all unique link titles from content
 */
export function extractLinkTitles(content: string): string[] {
  const { links } = parseWikiLinks(content);
  const titles = new Set<string>();
  
  links.forEach(link => titles.add(link.title));
  
  return Array.from(titles);
}

/**
 * Validate wiki link syntax
 */
export function isValidWikiLink(text: string): boolean {
  const wikiLinkRegex = /^\[\[([^\]]+)(?:\|([^\]]+))?\]\]$/;
  return wikiLinkRegex.test(text.trim());
}

/**
 * Create wiki link from title
 */
export function createWikiLink(title: string, displayText?: string): string {
  const display = displayText || title;
  return `[[${title}${displayText !== title ? `|${displayText}` : ''}]]`;
}

/**
 * Find all references to a title in content
 */
export function findReferences(content: string, title: string): WikiLink[] {
  const { links } = parseWikiLinks(content);
  return links.filter(link => link.title.toLowerCase() === title.toLowerCase());
}
