"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"

type PanelType = "explorer" | "codeEditor" | "builder"

interface PanelContextType {
  visiblePanels: Set<PanelType>
  maximizedPanel: PanelType | null
  togglePanelVisibility: (panel: PanelType) => void
  toggleMaximizePanel: (panel: PanelType) => void
  isPanelVisible: (panel: PanelType) => boolean
  isPanelMaximized: (panel: PanelType) => boolean
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

export const usePanelContext = () => {
  const context = useContext(PanelContext)
  if (context === undefined) {
    throw new Error("usePanelContext must be used within a PanelProvider")
  }
  return context
}

export const PanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visiblePanels, setVisiblePanels] = useState<Set<PanelType>>(new Set(["explorer", "codeEditor", "builder"]))
  const [maximizedPanel, setMaximizedPanel] = useState<PanelType | null>(null)

  const togglePanelVisibility = useCallback(
    (panel: PanelType) => {
      setVisiblePanels((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(panel)) {
          newSet.delete(panel)
        } else {
          newSet.add(panel)
        }
        return newSet
      })
      if (maximizedPanel === panel) {
        setMaximizedPanel(null)
      }
    },
    [maximizedPanel],
  )

  const toggleMaximizePanel = useCallback((panel: PanelType) => {
    setMaximizedPanel((prev) => (prev === panel ? null : panel))
    setVisiblePanels((prev) => {
      if (prev.has(panel)) {
        return new Set([panel])
      } else {
        return new Set(prev).add(panel)
      }
    })
  }, [])

  const isPanelVisible = useCallback((panel: PanelType) => visiblePanels.has(panel), [visiblePanels])

  const isPanelMaximized = useCallback((panel: PanelType) => maximizedPanel === panel, [maximizedPanel])

  const value = {
    visiblePanels,
    maximizedPanel,
    togglePanelVisibility,
    toggleMaximizePanel,
    isPanelVisible,
    isPanelMaximized,
  }

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}

