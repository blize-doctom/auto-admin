/**
 * Google Drive Backup Service
 * Performs creation, directory lookup, and HTML conversion of Google Docs.
 */

/**
 * Searches for a folder named "BK Auto Admin Docs" in Google Drive.
 * Creates it if it doesn't exist, and returns the Folder ID, or null on failure.
 */
export async function getOrCreateBKFolder(accessToken: string): Promise<string | null> {
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name%3D%27BK%20Auto%20Admin%20Docs%27%20and%20mimeType%3D%27application%2Fvnd.google-apps.folder%27%20and%20trashed%3Dfalse&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!searchRes.ok) {
      throw new Error(`Folder search failed: ${searchRes.statusText}`);
    }
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const folderMetadata = {
      name: "BK Auto Admin Docs",
      mimeType: "application/vnd.google-apps.folder"
    };
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(folderMetadata)
    });
    
    if (!createRes.ok) {
      throw new Error(`Folder creation failed: ${createRes.statusText}`);
    }
    
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error("Oops! Error locating or creating BK folder:", error);
    return null; // Fallback to root directory
  }
}

/**
 * Performs a multipart related upload of an HTML file converting it to a Google Doc.
 */
export async function uploadHtmlAsGoogleDoc(
  accessToken: string,
  fileName: string,
  htmlContent: string,
  folderId: string | null
): Promise<{ id: string; name: string } | null> {
  try {
    const metadata: any = {
      name: fileName,
      mimeType: "application/vnd.google-apps.document"
    };
    
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = "bk_auto_admin_drive_multipart";
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      htmlContent +
      close_delim;

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name
    };
  } catch (error) {
    console.error("Oops! Error uploading HTML to Drive:", error);
    throw error;
  }
}
