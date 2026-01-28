/**
 * AI Extraction API
 *
 * POST /api/admin/extract
 * Extract reward rules from PDF or URL using AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import { extractRewardsFromText, extractTextFromUrl } from '@/lib/ai/extractRewards';

export async function POST(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    let text: string;
    let source: string;

    if (contentType.includes('multipart/form-data')) {
      // PDF upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      // Check file type
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Maximum size: 10MB' }, { status: 400 });
      }

      // For now, we'll extract text client-side and send it
      // PDF parsing in Node.js requires additional setup
      // The client will extract text using pdf.js and send it in the text field
      const textContent = formData.get('text') as string | null;
      if (!textContent) {
        return NextResponse.json(
          { error: 'PDF text extraction required. Please ensure PDF text is included.' },
          { status: 400 }
        );
      }

      text = textContent;
      source = file.name;
    } else if (contentType.includes('application/json')) {
      // URL or direct text
      const body = await request.json();

      if (body.url) {
        // Fetch and extract text from URL
        try {
          text = await extractTextFromUrl(body.url);
          source = body.url;
        } catch (error) {
          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch URL' },
            { status: 400 }
          );
        }
      } else if (body.text) {
        // Direct text input
        text = body.text;
        source = 'Direct text input';
      } else {
        return NextResponse.json(
          { error: 'Either url or text is required' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid content type. Use multipart/form-data for PDF or application/json for URL/text' },
        { status: 400 }
      );
    }

    // Check if text is empty
    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Insufficient text content to analyze' },
        { status: 400 }
      );
    }

    // Extract rewards using AI
    const result = await extractRewardsFromText(text);

    return NextResponse.json({
      success: true,
      source,
      textLength: text.length,
      sourceText: text, // Include the raw T&C text for storage
      sourceUrl: source.startsWith('http') ? source : undefined,
      ...result,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Extraction failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
