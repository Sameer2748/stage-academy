"use client";

import { createContext, useContext } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobile: boolean;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  isMobile: false,
});

export const useSidebar = () => useContext(SidebarContext);
