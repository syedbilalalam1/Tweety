export const getRandomItem = <T>(arr: T[]): T | undefined => {
  if (arr.length === 0) {
    return undefined;
  }
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
};

export const extractCodeSnippetData = (response: string): string[] => {
  const snippets: string[] = [];
  const lines = response.split('\n');
  let snippet = '';
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.includes('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        // Remove language identifier if present
        const cleanLine = line.replace(/```\w*/, '').trim();
        if (cleanLine) {
          snippet = cleanLine + '\n';
        } else {
          snippet = '';
        }
      } else {
        // End of code block
        inCodeBlock = false;
        if (snippet.trim()) {
          snippets.push(snippet.trim());
        }
      }
    } else if (inCodeBlock) {
      snippet += line + '\n';
    }
  }

  // Handle unclosed code blocks
  if (inCodeBlock && snippet.trim()) {
    snippets.push(snippet.trim());
  }

  return snippets.map(s => s.trim()).filter(s => s.length > 0);
};
