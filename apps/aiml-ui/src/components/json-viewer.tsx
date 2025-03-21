'use client';

import { cn } from '@/lib/utils';
import { JSONHeroSearch, type SearchResult } from '@jsonhero/fuzzy-json-search';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

type JsonViewerProps = {
  data: any;
  level?: number;
  path?: string;
  searchTerm?: string;
  searchMode?: 'fuzzy' | 'path';
  parentExpanded?: boolean;
};

/**
 * Custom deep equality function that only checks for:
 * 1. Keys added/removed at any level
 * 2. Direct value changes to keys
 *
 * This is more efficient than a full deep equality check for our use case
 */
const deepEqual = (obj1: any, obj2: any): boolean => {
  // Handle primitive types
  if (obj1 === obj2) return true;

  // If either is null or not an object, they're not equal
  if (obj1 === null || obj2 === null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;

    // Check each array element
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }

    return true;
  }

  // Handle objects (but not arrays)
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if keys are added/removed
  if (keys1.length !== keys2.length) return false;

  // Check if all keys in obj1 exist in obj2
  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;

    // Recursively check nested objects/arrays
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

// Helper function to check if two props objects are equal
const arePropsEqual = (prevProps: JsonViewerProps, nextProps: JsonViewerProps) => {
  // Only compare the data prop deeply
  return (
    deepEqual(prevProps.data, nextProps.data) &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.searchMode === nextProps.searchMode &&
    prevProps.level === nextProps.level &&
    prevProps.path === nextProps.path &&
    prevProps.parentExpanded === nextProps.parentExpanded
  );
};

// Create a global cache to store expanded states for different paths
// This ensures expanded state persists even when components unmount and remount
const expandedStateCache = new Map<string, Record<string, boolean>>();

function JsonViewerComponent({
  data,
  level = 0,
  path = '',
  searchTerm = '',
  searchMode = 'fuzzy',
  parentExpanded = true,
}: JsonViewerProps) {
  // Generate a unique key for this component instance
  const cacheKey = path || 'root';

  // Initialize expanded state from cache or empty object
  const initialExpanded = expandedStateCache.get(cacheKey) || {};
  const [expanded, setExpanded] = useState<Record<string, boolean>>(initialExpanded);
  const [matchedPaths, setMatchedPaths] = useState<Set<string>>(new Set());

  // Memoize the heroSearch instance to prevent unnecessary recreation
  const heroSearch = useRef<JSONHeroSearch | null>(null);

  // Only recreate the heroSearch when data actually changes
  useEffect(() => {
    heroSearch.current = new JSONHeroSearch(data);
  }, [data]);

  // Update the cache whenever expanded state changes
  useEffect(() => {
    expandedStateCache.set(cacheKey, expanded);
  }, [expanded, cacheKey]);

  // Memoize this function to prevent recreation on every render
  const matchesFuzzySearch = useCallback(
    (value: any): boolean => {
      if (!searchTerm) return false;

      const searchLower = searchTerm.toLowerCase();

      if (value === null) return 'null'.includes(searchLower);

      if (typeof value === 'object') return false;

      return String(value).toLowerCase().includes(searchLower);
    },
    [searchTerm],
  );

  // Function to get all paths that match the search term
  const findMatchingPaths = useCallback(
    (obj: any): Set<string> => {
      if (!searchTerm) return new Set<string>();

      if (searchMode === 'fuzzy') {
        try {
          // Use the jsonhero fuzzy search library
          const results = heroSearch.current?.search(searchTerm) as SearchResult<string>[];
          const paths = new Set<string>();

          // Convert the results to our path format
          results?.forEach((result) => {
            // The library returns paths in a format like ["address", "city"]
            // We need to convert it to "address.city" or "array[0]" format
            let formattedPath = '';
            const pathParts = result.item.split('.');
            pathParts.forEach((part: string, index: number) => {
              const isArrayIndex = /^\d+$/.test(part);
              if (isArrayIndex) {
                formattedPath += `[${part}]`;
              } else {
                if (index > 0 && !formattedPath.endsWith(']')) formattedPath += '.';
                formattedPath += part;
              }
            });

            if (formattedPath) {
              paths.add(formattedPath);
            }
          });

          return paths;
        } catch (e) {
          console.error('Error in fuzzy search:', e);
          return new Set<string>();
        }
      } else if (searchMode === 'path' && searchTerm) {
        // Path search mode - keep the existing implementation
        try {
          // Parse the path and navigate to it
          const pathParts = parsePath(searchTerm);
          let current = obj;
          let validPath = true;

          for (const part of pathParts) {
            if (typeof part === 'string') {
              if (current && typeof current === 'object' && part in current) {
                current = current[part];
              } else {
                validPath = false;
                break;
              }
            } else if (typeof part === 'number') {
              if (Array.isArray(current) && part >= 0 && part < current.length) {
                current = current[part];
              } else {
                validPath = false;
                break;
              }
            }
          }

          if (validPath) {
            return new Set([searchTerm]);
          }
        } catch (e) {
          // Invalid path format, ignore
        }

        return new Set<string>();
      }

      return new Set<string>();
    },
    [searchTerm, searchMode],
  );

  // Memoize the parsePath function
  const parsePath = useCallback((pathString: string): (string | number)[] => {
    const parts: (string | number)[] = [];
    let current = '';
    let i = 0;

    while (i < pathString.length) {
      if (pathString[i] === '.') {
        if (current) {
          parts.push(current);
          current = '';
        }
        i++;
      } else if (pathString[i] === '[') {
        if (current) {
          parts.push(current);
          current = '';
        }

        let arrayIndex = '';
        i++;

        while (i < pathString.length && pathString[i] !== ']') {
          arrayIndex += pathString[i];
          i++;
        }

        if (i < pathString.length && pathString[i] === ']') {
          parts.push(Number.parseInt(arrayIndex, 10));
          i++;
        }
      } else {
        current += pathString[i];
        i++;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }, []);

  // Memoize the shouldExpand function
  const shouldExpand = useCallback(
    (currentPath: string): boolean => {
      if (!searchTerm) return false;

      // In path search mode, expand all parent paths
      if (searchMode === 'path') {
        return searchTerm.startsWith(currentPath) || currentPath.startsWith(searchTerm) || matchedPaths.has(searchTerm);
      }

      // In fuzzy search mode, expand if any child matches
      for (const matchedPath of Array.from(matchedPaths)) {
        if (matchedPath.startsWith(currentPath)) {
          return true;
        }
      }

      return false;
    },
    [searchTerm, searchMode, matchedPaths],
  );

  // Memoize the isExactPathMatch function
  const isExactPathMatch = useCallback(
    (currentPath: string): boolean => {
      if (searchMode !== 'path' || !searchTerm) return false;
      return currentPath === searchTerm;
    },
    [searchMode, searchTerm],
  );

  // Find all matching paths when search term or data changes
  useEffect(() => {
    if (!searchTerm) {
      setMatchedPaths(new Set());
      return;
    }

    const matches = findMatchingPaths(data);
    setMatchedPaths(matches);

    // Auto-expand paths that contain matches
    const newExpanded: Record<string, boolean> = {};

    // For both search modes, expand all parent paths of matches
    matches.forEach((matchPath) => {
      let currentPath = '';
      const parts = parsePath(matchPath);

      parts.forEach((part, index) => {
        if (index < parts.length - 1) {
          // Don't expand the last part
          if (typeof part === 'string') {
            currentPath = currentPath ? `${currentPath}.${part}` : part;
            newExpanded[currentPath] = true;
          } else if (typeof part === 'number') {
            currentPath = `${currentPath}[${part}]`;
            newExpanded[currentPath] = true;
          }
        }
      });
    });

    // Preserve existing expanded state while adding new matches
    setExpanded((prev) => {
      const merged = { ...prev, ...newExpanded };
      // Update the cache
      expandedStateCache.set(cacheKey, merged);
      return merged;
    });
  }, [searchTerm, data, findMatchingPaths, parsePath, cacheKey]);

  const toggleExpand = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        const newExpanded = {
          ...prev,
          [key]: !prev[key],
        };
        // Update the cache
        expandedStateCache.set(cacheKey, newExpanded);
        return newExpanded;
      });
    },
    [cacheKey],
  );

  const getValueColor = useCallback((value: any) => {
    if (value === null) return 'text-gray-500';
    switch (typeof value) {
      case 'number':
        return 'text-amber-600';
      case 'boolean':
        return 'text-purple-600';
      case 'string':
        return 'text-green-600';
      default:
        return '';
    }
  }, []);

  // Memoize the isMatch function
  const isMatch = useCallback(
    (value: any, currentPath: string): boolean => {
      if (!searchTerm) return false;

      if (searchMode === 'fuzzy') {
        return matchedPaths.has(currentPath);
      } else if (searchMode === 'path') {
        return isExactPathMatch(currentPath);
      }

      return false;
    },
    [searchTerm, searchMode, matchedPaths, isExactPathMatch],
  );

  // Memoize the renderValue function
  const renderValue = useCallback(
    (value: any, key: string) => {
      const currentPath = path ? (isNaN(Number(key)) ? `${path}.${key}` : `${path}[${key}]`) : key;
      const valueMatches = isMatch(value, currentPath);

      if (value === null) {
        return (
          <span className={cn('text-gray-500', valueMatches && 'bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded')}>
            null
          </span>
        );
      }

      if (Array.isArray(value) || typeof value === 'object') {
        const isArray = Array.isArray(value);
        const itemCount = isArray ? value.length : Object.keys(value).length;
        const itemLabel = isArray ? `Array(${itemCount})` : `Object{${itemCount}}`;
        const isExpanded = expanded[currentPath] ?? shouldExpand(currentPath);
        const pathMatches = isExactPathMatch(currentPath);

        return (
          <div>
            <div
              className={cn(
                'flex items-center cursor-pointer hover:bg-muted/50 rounded px-1',
                pathMatches && 'bg-yellow-100 dark:bg-yellow-900/30 rounded',
              )}
              onClick={() => toggleExpand(currentPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">{itemLabel}</span>
            </div>

            {isExpanded && (
              <div className="pl-4 border-l border-border mt-1">
                <JsonViewer
                  data={value}
                  level={level + 1}
                  path={currentPath}
                  searchTerm={searchTerm}
                  searchMode={searchMode}
                  parentExpanded={isExpanded}
                />
              </div>
            )}
          </div>
        );
      }

      return (
        <span className={cn(getValueColor(value), valueMatches && 'bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded')}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      );
    },
    [expanded, getValueColor, isExactPathMatch, isMatch, path, searchMode, searchTerm, shouldExpand],
  );

  if (Array.isArray(data)) {
    return (
      <div className={cn('space-y-1', level === 0 && 'mt-1')}>
        {data.map((item, index) => (
          <div key={`${path}-${index}`} className="flex">
            <span className="text-muted-foreground mr-2">{index}:</span>
            {renderValue(item, index.toString())}
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object' && data !== null) {
    return (
      <div className={cn('space-y-1', level === 0 && 'mt-1')}>
        {Object.entries(data).map(([key, value]) => (
          <div key={`${path}-${key}`} className="flex">
            <span
              className={cn(
                'text-blue-600 mr-2',
                isExactPathMatch(path ? `${path}.${key}` : key) && 'bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded',
              )}
            >
              {key}:
            </span>
            {renderValue(value, key)}
          </div>
        ))}
      </div>
    );
  }

  // This should not happen at the top level, but just in case
  return <span className={getValueColor(data)}>{String(data)}</span>;
}

// Export a memoized version of the component that only re-renders when necessary
export const JsonViewer = memo(JsonViewerComponent, arePropsEqual);
