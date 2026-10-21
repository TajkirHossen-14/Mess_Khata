export function isManagerView(req) {
  return (
    Boolean(req.user?.roles?.includes("manager")) && req.query.scope !== "me"
  );
}
