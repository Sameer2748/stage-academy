// ─── Types ───────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

// ─── URL Generators ──────────────────────────────────────────────────────────

/**
 * Get an embeddable preview URL for a Google Drive file.
 */
export function getDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Get a direct view URL for a Google Drive file.
 */
export function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// ─── File ID Extraction ──────────────────────────────────────────────────────

/**
 * Extract the Google Drive file ID from various URL formats.
 * Supports:
 *   - https://drive.google.com/file/d/{id}/view
 *   - https://drive.google.com/file/d/{id}/preview
 *   - https://drive.google.com/open?id={id}
 *   - https://docs.google.com/document/d/{id}/edit
 *   - https://docs.google.com/spreadsheets/d/{id}/edit
 *   - https://docs.google.com/presentation/d/{id}/edit
 *
 * Returns null if no file ID can be extracted.
 */
export function extractDriveFileId(driveUrl: string): string | null {
  if (!driveUrl) return null;

  // Pattern: /d/{fileId}/
  const dPattern = /\/d\/([a-zA-Z0-9_-]+)/;
  const dMatch = driveUrl.match(dPattern);
  if (dMatch) return dMatch[1];

  // Pattern: ?id={fileId}
  const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
  const idMatch = driveUrl.match(idPattern);
  if (idMatch) return idMatch[1];

  // If the string itself looks like a bare file ID
  const bareIdPattern = /^[a-zA-Z0-9_-]{20,}$/;
  if (bareIdPattern.test(driveUrl.trim())) {
    return driveUrl.trim();
  }

  return null;
}

// ─── Folder Contents ─────────────────────────────────────────────────────────

/**
 * List the contents of a Google Drive folder.
 * Requires a valid OAuth access token with Drive read scope.
 */
export async function listFolderContents(
  folderId: string,
  accessToken: string
): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields =
    "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink)";

  const params = new URLSearchParams({
    q: query,
    fields,
    pageSize: "1000",
    orderBy: "name",
  });

  const response = await fetch(
    `${DRIVE_API_BASE}/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Google Drive API error ${response.status}: ${errorBody}`
    );
  }

  const data = await response.json();
  return (data.files || []) as DriveFile[];
}
