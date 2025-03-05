"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { JSONHeroSearch, SearchResult } from "@jsonhero/fuzzy-json-search";

type JsonViewerProps = {
  data: any;
  level?: number;
  path?: string;
  searchTerm?: string;
  searchMode?: "fuzzy" | "path";
  parentExpanded?: boolean;
};

export function JsonViewer({
  data,
  level = 0,
  path = "",
  searchTerm = "",
  searchMode = "fuzzy",
  parentExpanded = true,
}: JsonViewerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [matchedPaths, setMatchedPaths] = useState<Set<string>>(new Set());
  const heroSearch = useRef<JSONHeroSearch | null>(new JSONHeroSearch(data));

  useEffect(() => {
    heroSearch.current = new JSONHeroSearch(data);
  }, [data]);

  // Function to check if a value matches the search term (fuzzy search)
  const matchesFuzzySearch = (value: any): boolean => {
    if (!searchTerm) return false;

    const searchLower = searchTerm.toLowerCase();

    if (value === null) return "null".includes(searchLower);

    if (typeof value === "object") return false;

    return String(value).toLowerCase().includes(searchLower);
  };

  // Function to get all paths that match the search term
  const findMatchingPaths = useCallback(
    (obj: any): Set<string> => {
      if (!searchTerm) return new Set<string>();

      if (searchMode === "fuzzy") {
        try {
          // Use the jsonhero fuzzy search library
          const results = heroSearch.current?.search(
            searchTerm
          ) as SearchResult<string>[];
          const paths = new Set<string>();

          // Convert the results to our path format
          results?.forEach((result) => {
            // The library returns paths in a format like ["address", "city"]
            // We need to convert it to "address.city" or "array[0]" format
            let formattedPath = "";
            const pathParts = result.item.split(".");
            pathParts.forEach((part: string, index: number) => {
              const isArrayIndex = /^\d+$/.test(part);
              if (isArrayIndex) {
                formattedPath += `[${part}]`;
              } else {
                if (index > 0 && !formattedPath.endsWith("]"))
                  formattedPath += ".";
                formattedPath += part;
              }
            });

            if (formattedPath) {
              paths.add(formattedPath);
            }
          });

          return paths;
        } catch (e) {
          console.error("Error in fuzzy search:", e);
          return new Set<string>();
        }
      } else if (searchMode === "path" && searchTerm) {
        // Path search mode - keep the existing implementation
        try {
          // Parse the path and navigate to it
          const pathParts = parsePath(searchTerm);
          let current = obj;
          let validPath = true;

          for (const part of pathParts) {
            if (typeof part === "string") {
              if (current && typeof current === "object" && part in current) {
                current = current[part];
              } else {
                validPath = false;
                break;
              }
            } else if (typeof part === "number") {
              if (
                Array.isArray(current) &&
                part >= 0 &&
                part < current.length
              ) {
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
    [searchTerm, searchMode]
  );

  // Parse a dot notation path into parts (handles array indices too)
  const parsePath = useCallback((pathString: string): (string | number)[] => {
    const parts: (string | number)[] = [];
    let current = "";
    let i = 0;

    while (i < pathString.length) {
      if (pathString[i] === ".") {
        if (current) {
          parts.push(current);
          current = "";
        }
        i++;
      } else if (pathString[i] === "[") {
        if (current) {
          parts.push(current);
          current = "";
        }

        let arrayIndex = "";
        i++;

        while (i < pathString.length && pathString[i] !== "]") {
          arrayIndex += pathString[i];
          i++;
        }

        if (i < pathString.length && pathString[i] === "]") {
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

  // Check if a path should be expanded based on search results
  const shouldExpand = (currentPath: string): boolean => {
    if (!searchTerm) return false;

    // In path search mode, expand all parent paths
    if (searchMode === "path") {
      return (
        searchTerm.startsWith(currentPath) ||
        currentPath.startsWith(searchTerm) ||
        matchedPaths.has(searchTerm)
      );
    }

    // In fuzzy search mode, expand if any child matches
    for (const matchedPath of Array.from(matchedPaths)) {
      if (matchedPath.startsWith(currentPath)) {
        return true;
      }
    }

    return false;
  };

  // Check if the current path matches the search path exactly
  const isExactPathMatch = (currentPath: string): boolean => {
    if (searchMode !== "path" || !searchTerm) return false;
    return currentPath === searchTerm;
  };

  // Find all matching paths when search term changes
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
      let currentPath = "";
      const parts = parsePath(matchPath);

      parts.forEach((part, index) => {
        if (index < parts.length - 1) {
          // Don't expand the last part
          if (typeof part === "string") {
            currentPath = currentPath ? `${currentPath}.${part}` : part;
            newExpanded[currentPath] = true;
          } else if (typeof part === "number") {
            currentPath = `${currentPath}[${part}]`;
            newExpanded[currentPath] = true;
          }
        }
      });
    });

    setExpanded((prev) => ({ ...prev, ...newExpanded }));
  }, [searchTerm, data, findMatchingPaths, parsePath]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getValueColor = (value: any) => {
    if (value === null) return "text-gray-500";
    switch (typeof value) {
      case "number":
        return "text-amber-600";
      case "boolean":
        return "text-purple-600";
      case "string":
        return "text-green-600";
      default:
        return "";
    }
  };

  // Check if this value matches the search
  const isMatch = (value: any, currentPath: string): boolean => {
    if (!searchTerm) return false;

    if (searchMode === "fuzzy") {
      return matchedPaths.has(currentPath);
    } else if (searchMode === "path") {
      return isExactPathMatch(currentPath);
    }

    return false;
  };

  const renderValue = (value: any, key: string) => {
    const currentPath = path
      ? isNaN(Number(key))
        ? `${path}.${key}`
        : `${path}[${key}]`
      : key;
    const valueMatches = isMatch(value, currentPath);

    if (value === null) {
      return (
        <span
          className={cn(
            "text-gray-500",
            valueMatches && "bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded"
          )}
        >
          null
        </span>
      );
    }

    if (Array.isArray(value) || typeof value === "object") {
      const isArray = Array.isArray(value);
      const itemCount = isArray ? value.length : Object.keys(value).length;
      const itemLabel = isArray
        ? `Array(${itemCount})`
        : `Object{${itemCount}}`;
      const isExpanded = expanded[currentPath] ?? shouldExpand(currentPath);
      const pathMatches = isExactPathMatch(currentPath);

      return (
        <div>
          <div
            className={cn(
              "flex items-center cursor-pointer hover:bg-muted/50 rounded px-1",
              pathMatches && "bg-yellow-100 dark:bg-yellow-900/30 rounded"
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
      <span
        className={cn(
          getValueColor(value),
          valueMatches && "bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded"
        )}
      >
        {typeof value === "string" ? `"${value}"` : String(value)}
      </span>
    );
  };

  if (Array.isArray(data)) {
    return (
      <div className={cn("space-y-1", level === 0 && "mt-1")}>
        {data.map((item, index) => (
          <div key={`${path}-${index}`} className="flex">
            <span className="text-muted-foreground mr-2">{index}:</span>
            {renderValue(item, index.toString())}
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    return (
      <div className={cn("space-y-1", level === 0 && "mt-1")}>
        {Object.entries(data).map(([key, value]) => (
          <div key={`${path}-${key}`} className="flex">
            <span
              className={cn(
                "text-blue-600 mr-2",
                isExactPathMatch(path ? `${path}.${key}` : key) &&
                  "bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded"
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
