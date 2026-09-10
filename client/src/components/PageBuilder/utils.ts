// Utility functions for the page builder

export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function cssStringToObject(cssString: string): Record<string, string> {
  const styles: Record<string, string> = {};
  
  if (!cssString) return styles;
  
  // Remove comments and clean up
  const cleanCss = cssString
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Simple CSS parser for property: value pairs
  const declarations = cleanCss.split(';').filter(d => d.trim());
  
  declarations.forEach(declaration => {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex > 0) {
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      
      if (property && value) {
        // Convert kebab-case to camelCase
        const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelProperty] = value;
      }
    }
  });
  
  return styles;
}

export function objectToCssString(styleObject: Record<string, string>): string {
  return Object.entries(styleObject)
    .map(([property, value]) => {
      // Convert camelCase to kebab-case
      const kebabProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabProperty}: ${value};`;
    })
    .join('\n');
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      (copy as any)[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function validateCss(css: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  let isValid = true;
  
  try {
    // Basic CSS validation - check for balanced braces and semicolons
    const openBraces = (css.match(/{/g) || []).length;
    const closeBraces = (css.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces in CSS');
      isValid = false;
    }
    
    // Check for basic CSS syntax
    const declarations = css.split(';').filter(d => d.trim() && !d.includes('{') && !d.includes('}'));
    
    declarations.forEach((declaration, index) => {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex <= 0) {
        errors.push(`Invalid CSS declaration at line ${index + 1}: "${declaration.trim()}"`);
        isValid = false;
      }
    });
    
  } catch (error) {
    errors.push('Invalid CSS syntax');
    isValid = false;
  }
  
  return { isValid, errors };
}

export function getBlockDisplayName(blockType: string): string {
  const displayNames: Record<string, string> = {
    heading: 'Heading',
    text: 'Text',
    button: 'Button',
    image: 'Image',
    video: 'Video',
    spacer: 'Spacer',
    divider: 'Divider',
    columns: 'Columns',
    quote: 'Quote',
    list: 'List',
  };
  
  return displayNames[blockType] || blockType.charAt(0).toUpperCase() + blockType.slice(1);
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*`[^`]*`/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');
}