const links = [
  { label: "Home", href: "/dashboard" },
  { label: "Le mie attività", href: "/pratiche/mie" },
  { label: "Documenti", href: "/dashboard/documenti" },
  { label: "Profilo", href: "/account" },
] as const;

export function appNavigation(pathname: string, praticheAvailable: boolean) {
  return links
    .filter(({ href }) => praticheAvailable || href !== "/pratiche/mie")
    .map((link) => {
      const current = pathname === link.href || (
        (link.href === "/pratiche/mie" && pathname.startsWith("/pratiche/")) ||
        (link.href === "/pratiche/mie" && pathname === "/pratiche") ||
        (link.href === "/dashboard" && (pathname === "/" || pathname === "/guide" || pathname.startsWith("/guide/"))) ||
        (link.href === "/dashboard/documenti" && pathname === "/analyze")
      );
      return { ...link, current };
    });
}
