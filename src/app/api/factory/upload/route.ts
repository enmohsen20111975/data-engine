import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'upload');

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    let uploadedCount = 0;
    const uploadedFiles: string[] = [];

    for (const file of files) {
      if (!file.name) continue;

      // Check file extension
      const ext = path.extname(file.name).toLowerCase();
      if (!['.mhtml', '.html', '.htm', '.json'].includes(ext)) {
        continue;
      }

      // Convert File to Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create unique filename
      const fileName = file.name;
      const filePath = path.join(UPLOAD_DIR, fileName);

      // Write file
      await writeFile(filePath, buffer);
      uploadedCount++;
      uploadedFiles.push(fileName);
    }

    return NextResponse.json({
      success: true,
      uploaded: uploadedCount,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
