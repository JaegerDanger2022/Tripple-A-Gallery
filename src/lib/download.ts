// Client helper: turn a streamed file Response (from /api/download) into a
// browser "save file" action. The route returns the bytes with a
// Content-Disposition filename; we honour it, falling back to a sensible name.
export async function saveBlobResponse(res: Response, fallbackBase: string): Promise<void> {
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `${fallbackBase}-hi-res`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
