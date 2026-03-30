/**
 * Link Parser Utility
 * 
 * Scans content for [[Wiki-Links]] and extracts connections.
 * Used for building the bidirectional knowledge graph.
 */

export interface Connection {
    sourceId: string;
    targetTitle: string;
    context: string; // The text surrounding the link
}

/**
 * Extracts all [[links]] from a string of text.
 */
export const extractLinks = (sourceId: string, content: string): Connection[] => {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const connections: Connection[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
        const targetTitle = match[1];
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(start, end).replace(/\n/g, ' ');

        connections.push({
            sourceId,
            targetTitle,
            context: `...${context}...`
        });
    }

    return connections;
};

/**
 * Builds a map of backlinks where the key is the target note title
 * and the value is an array of sources that link to it.
 */
export const buildBacklinkMap = (items: { id: string, content: string }[]): Record<string, Connection[]> => {
    const backlinkMap: Record<string, Connection[]> = {};

    items.forEach(item => {
        const links = extractLinks(item.id, item.content);
        links.forEach(link => {
            if (!backlinkMap[link.targetTitle]) {
                backlinkMap[link.targetTitle] = [];
            }
            backlinkMap[link.targetTitle].push(link);
        });
    });

    return backlinkMap;
};
