/** This flag can never disable authentication in a production build. */
export const isLocalPreview =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCAL_PREVIEW === "1";

export const previewWorkspaces = [
  { key: "client", name: "Customer", port: 3104 },
  { key: "admin", name: "Admin", port: 3101 },
  { key: "employee", name: "Employee", port: 3102 },
  { key: "intern", name: "Intern", port: 3103 },
] as const;
